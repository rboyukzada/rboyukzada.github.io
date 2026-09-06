/**
 * admin.js — logic for admin.html
 * ------------------------------------------------------------------
 * - Supabase email/password auth
 * - Generic editor for the `site_content` key/value table
 * - Full CRUD for `portfolio_projects`, with image uploads going
 *   straight to Cloudinary (unsigned upload preset)
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  const cfg = window.SITE_CONFIG || {};
  const client = window.supabaseClient;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // ---------------------------------------------------------------
  // 0. Config check
  // ---------------------------------------------------------------
  const notConfigured =
    !client ||
    !cfg.SUPABASE_URL ||
    cfg.SUPABASE_URL.indexOf("YOUR-PROJECT-ID") !== -1;

  if (notConfigured) {
    $("#config-warning").style.display = "flex";
  }

  const cloudinaryReady =
    cfg.CLOUDINARY_CLOUD_NAME &&
    cfg.CLOUDINARY_CLOUD_NAME.indexOf("YOUR-CLOUDINARY") === -1 &&
    cfg.CLOUDINARY_UPLOAD_PRESET &&
    cfg.CLOUDINARY_UPLOAD_PRESET.indexOf("YOUR-UNSIGNED") === -1;

  // ---------------------------------------------------------------
  // 1. Auth
  // ---------------------------------------------------------------
  async function checkSession() {
    if (!client) return;
    const { data } = await client.auth.getSession();
    if (data && data.session) {
      showDashboard(data.session.user);
    } else {
      showLogin();
    }
  }

  function showLogin() {
    $("#login-screen").style.display = "flex";
    $("#dashboard").style.display = "none";
  }

  function showDashboard(user) {
    $("#login-screen").style.display = "none";
    $("#dashboard").style.display = "block";
    $("#current-user-email").textContent = user ? user.email : "";
    loadAllContent();
    loadProjects();
  }

  if (client) {
    $("#login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#login-email").value.trim();
      const password = $("#login-password").value;
      const errEl = $("#login-error");
      errEl.textContent = "";

      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        errEl.textContent = "Не удалось войти: " + error.message;
        return;
      }
      showDashboard(data.user);
    });

    $("#logout-btn").addEventListener("click", async () => {
      await client.auth.signOut();
      showLogin();
    });

    client.auth.onAuthStateChange((_event, session) => {
      if (session) showDashboard(session.user);
      else showLogin();
    });

    checkSession();
  }

  // ---------------------------------------------------------------
  // 2. Tabs
  // ---------------------------------------------------------------
  $$(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".nav-btn").forEach((b) => b.classList.remove("active"));
      $$(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      $("#tab-" + btn.dataset.tab).classList.add("active");
    });
  });

  // ---------------------------------------------------------------
  // 3. Generic site_content editor
  // ---------------------------------------------------------------
  let contentCache = {};

  async function loadAllContent() {
    const { data, error } = await client.from("site_content").select("key, value");
    if (error) {
      console.error(error);
      return;
    }
    contentCache = {};
    data.forEach((row) => (contentCache[row.key] = row.value));
    fillFormsFromCache();
  }

  function fillFormsFromCache() {
    $$("[data-key]").forEach((input) => {
      const key = input.dataset.key;
      if (!(key in contentCache)) return;
      const val = contentCache[key];
      if (input.dataset.type === "list") {
        input.value = Array.isArray(val) ? val.join(", ") : val || "";
      } else {
        input.value = val == null ? "" : val;
      }
    });
    $$("[data-preview-for]").forEach((img) => {
      const key = img.dataset.previewFor;
      if (contentCache[key]) img.src = contentCache[key];
    });
  }

  async function saveFormKeys(form) {
    const inputs = $$("[data-key]", form);
    const statusEl = $(".save-status", form);
    statusEl.textContent = "Сохранение...";

    const rows = inputs.map((input) => {
      let value;
      if (input.dataset.type === "list") {
        value = input.value.split(",").map((s) => s.trim()).filter(Boolean);
      } else {
        value = input.value;
      }
      return { key: input.dataset.key, value };
    });

    const { error } = await client.from("site_content").upsert(rows, { onConflict: "key" });
    if (error) {
      statusEl.textContent = "Ошибка: " + error.message;
      statusEl.style.color = "var(--admin-danger)";
      return;
    }
    rows.forEach((r) => (contentCache[r.key] = r.value));
    statusEl.style.color = "var(--admin-success)";
    statusEl.textContent = "Сохранено ✓";
    setTimeout(() => (statusEl.textContent = ""), 2500);
  }

  ["form-hero", "form-profile", "form-contact", "form-misc"].forEach((id) => {
    const form = $("#" + id);
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      saveFormKeys(form);
    });
  });

  // Live-update image previews when a text URL field changes manually
  $$("[data-preview-for]").forEach((img) => {
    const key = img.dataset.previewFor;
    const input = $(`[data-key="${key}"]`);
    if (input) {
      input.addEventListener("input", () => (img.src = input.value));
    }
  });

  // ---------------------------------------------------------------
  // 4. Cloudinary upload (used both for site_content images and
  //    for the project modal images)
  // ---------------------------------------------------------------
  async function uploadToCloudinary(file) {
    if (!cloudinaryReady) {
      alert(
        "Cloudinary ещё не настроен. Заполни CLOUDINARY_CLOUD_NAME и CLOUDINARY_UPLOAD_PRESET в js/supabase-config.js"
      );
      return null;
    }
    const url = `https://api.cloudinary.com/v1_1/${cfg.CLOUDINARY_CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", cfg.CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(url, { method: "POST", body: formData });
    if (!res.ok) {
      const t = await res.text();
      throw new Error("Cloudinary upload failed: " + t);
    }
    const json = await res.json();
    return json.secure_url;
  }

  function wireUploadButtons(root) {
    $$(".cloudinary-upload", root).forEach((fileInput) => {
      fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if (!file) return;

        const label = fileInput.closest(".upload-btn");
        const originalHtml = label ? label.innerHTML : "";
        if (label) label.innerHTML = '<i class="ph ph-spinner"></i> Загрузка...';

        try {
          const secureUrl = await uploadToCloudinary(file);
          if (!secureUrl) return;

          if (fileInput.dataset.targetKey) {
            const targetInput = $(`[data-key="${fileInput.dataset.targetKey}"]`);
            if (targetInput) targetInput.value = secureUrl;
            const preview = $(`[data-preview-for="${fileInput.dataset.targetKey}"]`);
            if (preview) preview.src = secureUrl;
          } else if (fileInput.dataset.targetInput) {
            const targetInput = document.getElementById(fileInput.dataset.targetInput);
            if (targetInput) targetInput.value = secureUrl;
            const preview = document.getElementById(fileInput.dataset.targetInput + "-preview");
            if (preview) preview.src = secureUrl;
          }
        } catch (err) {
          console.error(err);
          alert("Не удалось загрузить изображение: " + err.message);
        } finally {
          if (label) label.innerHTML = originalHtml;
          fileInput.value = "";
        }
      });
    });
  }

  wireUploadButtons(document);

  // ---------------------------------------------------------------
  // 5. Portfolio projects — list + CRUD modal
  // ---------------------------------------------------------------
  let projectsCache = [];

  async function loadProjects() {
    const { data, error } = await client
      .from("portfolio_projects")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    projectsCache = data;
    renderProjectsList();
  }

  function renderProjectsList() {
    const container = $("#projects-list");
    container.innerHTML = "";
    projectsCache.forEach((p) => {
      const row = document.createElement("div");
      row.className = "project-row";
      row.innerHTML = `
        <img src="${p.image_url || "images/logo.png"}" alt="">
        <div class="project-row-info">
          <div class="project-row-title">${escapeHtml(p.title)}</div>
          <div class="project-row-meta">
            <span class="project-row-badge">${escapeHtml(p.category)}</span>
            ${p.featured ? '<span class="project-row-badge featured">На главной</span>' : ""}
            ${(p.tags || []).join(", ")}
          </div>
        </div>
        <button class="btn btn-ghost btn-sm edit-project-btn"><i class="ph ph-pencil-simple"></i> Изменить</button>
      `;
      row.querySelector(".edit-project-btn").addEventListener("click", () => openProjectModal(p));
      container.appendChild(row);
    });
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  const modal = $("#project-modal");
  const projectForm = $("#project-form");

  function openProjectModal(project) {
    $("#project-form-error").textContent = "";
    if (project) {
      $("#project-modal-title").textContent = "Редактировать проект";
      $("#project-id").value = project.id;
      $("#project-title").value = project.title || "";
      $("#project-description").value = project.description || "";
      $("#project-category").value = project.category || "frontend";
      $("#project-sort-order").value = project.sort_order || 0;
      $("#project-tags").value = (project.tags || []).join(", ");
      $("#project-url").value = project.project_url || "";
      $("#project-image-1").value = project.image_url || "";
      $("#project-image-2").value = project.image_url_2 || "";
      $("#project-image-1-preview").src = project.image_url || "";
      $("#project-image-2-preview").src = project.image_url_2 || project.image_url || "";
      $("#project-featured").checked = !!project.featured;
      $("#project-delete-btn").style.display = "inline-flex";
    } else {
      $("#project-modal-title").textContent = "Новый проект";
      projectForm.reset();
      $("#project-id").value = "";
      $("#project-image-1-preview").src = "";
      $("#project-image-2-preview").src = "";
      $("#project-delete-btn").style.display = "none";
    }
    modal.style.display = "flex";
  }

  function closeProjectModal() {
    modal.style.display = "none";
  }

  $("#new-project-btn").addEventListener("click", () => openProjectModal(null));
  $("#project-modal-close").addEventListener("click", closeProjectModal);
  $("#project-cancel-btn").addEventListener("click", closeProjectModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeProjectModal();
  });

  // live preview for manual URL typing in the modal
  ["project-image-1", "project-image-2"].forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener("input", () => {
      document.getElementById(id + "-preview").src = input.value;
    });
  });

  wireUploadButtons(modal);

  projectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("#project-form-error");
    errEl.textContent = "";

    const id = $("#project-id").value;
    const payload = {
      title: $("#project-title").value.trim(),
      description: $("#project-description").value.trim(),
      category: $("#project-category").value,
      sort_order: parseInt($("#project-sort-order").value, 10) || 0,
      tags: $("#project-tags").value.split(",").map((s) => s.trim()).filter(Boolean),
      project_url: $("#project-url").value.trim(),
      image_url: $("#project-image-1").value.trim(),
      image_url_2: $("#project-image-2").value.trim(),
      featured: $("#project-featured").checked,
    };

    let result;
    if (id) {
      result = await client.from("portfolio_projects").update(payload).eq("id", id);
    } else {
      result = await client.from("portfolio_projects").insert(payload);
    }

    if (result.error) {
      errEl.textContent = "Ошибка: " + result.error.message;
      return;
    }
    closeProjectModal();
    loadProjects();
  });

  $("#project-delete-btn").addEventListener("click", async () => {
    const id = $("#project-id").value;
    if (!id) return;
    if (!confirm("Удалить этот проект без возможности восстановления?")) return;

    const { error } = await client.from("portfolio_projects").delete().eq("id", id);
    if (error) {
      $("#project-form-error").textContent = "Ошибка: " + error.message;
      return;
    }
    closeProjectModal();
    loadProjects();
  });
})();
