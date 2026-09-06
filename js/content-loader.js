/**
 * content-loader.js
 * ------------------------------------------------------------------
 * Loaded on every public page (index/portfolio/resume/contact/blog).
 * Pulls editable content from Supabase (site_content + portfolio_projects)
 * and applies it on top of the existing static HTML.
 *
 * IMPORTANT: this is progressive enhancement, not a hard dependency.
 * - If js/supabase-config.js hasn't been filled in yet, window.supabaseClient
 *   is null and this whole file quietly does nothing — the static HTML
 *   that shipped with the template is shown, exactly like before.
 * - If a fetch fails (offline, RLS misconfigured, etc.) we also leave the
 *   static fallback content alone instead of showing an empty page.
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  async function loadSiteContent() {
    const client = window.supabaseClient;
    if (!client) return null;

    const { data, error } = await client.from("site_content").select("key, value");
    if (error || !data) {
      console.warn("content-loader: could not load site_content", error);
      return null;
    }

    const map = {};
    data.forEach((row) => {
      map[row.key] = row.value;
    });
    return map;
  }

  function applySiteContent(map) {
    if (!map) return;

    document.querySelectorAll("[data-content-key]").forEach((el) => {
      const key = el.getAttribute("data-content-key");
      if (!(key in map)) return;
      const value = map[key];
      if (value == null) return;

      const attr = el.getAttribute("data-content-attr");
      if (attr === "src" || attr === "href") {
        el.setAttribute(attr, value);
      } else if (attr === "tel") {
        el.textContent = value;
        el.setAttribute("href", "tel:" + String(value).replace(/[^\d+]/g, ""));
      } else if (attr === "mailto") {
        el.textContent = value;
        el.setAttribute("href", "mailto:" + value);
      } else {
        el.textContent = value;
      }
    });

    // Hero rotating roles (typed text widget in js/type-word.js)
    if (Array.isArray(map.hero_roles) && map.hero_roles.length) {
      window.heroTypeArray = map.hero_roles;
    }
  }

  function renderProjectCard(project) {
    const tags = Array.isArray(project.tags) ? project.tags : [];
    const url = project.project_url || "javascript:void(0)";
    const isExternal = /^https?:\/\//i.test(url);
    const targetAttr = isExternal ? ' target="_blank" rel="noopener"' : "";
    const img1 = project.image_url || "images/logo.png";
    const img2 = project.image_url_2 || img1;

    const tagsHtml = tags
      .map(
        (t) =>
          `<a href="javascript:void(0)" class="n5-color fs-nine px-2 px-md-4 py-1 py-md-2 brn3 rounded-pill fw-medium">${escapeHtml(t)}</a>`
      )
      .join("\n");

    return `
      <div class="col-xl-6" data-aos="fade-up" data-aos-duration="800">
        <div class="project-card">
          <a href="${escapeAttr(url)}" class="thumb d-block"${targetAttr}>
            <div class="post-thumb">
              <div class="post-thumb-inner">
                <img src="${escapeAttr(img1)}" alt="${escapeAttr(project.title)}" class="w-100 p-2">
              </div>
            </div>
            <div class="post-thumb">
              <div class="post-thumb-inner">
                <img src="${escapeAttr(img2)}" alt="${escapeAttr(project.title)}" class="w-100 p-2">
              </div>
            </div>
          </a>
          <div class="d-flex justify-content-between gap-2 align-items-center pt-4 pt-md-8 px-3 px-md-6">
            <div>
              <div class="d-flex flex-wrap gap-2 align-items-center">
                ${tagsHtml}
              </div>
              <a href="${escapeAttr(url)}" class="project-title fs-five fw-semibold n5-color mt-3 mt-md-5 d-block"${targetAttr}>
                ${escapeHtml(project.title)}
              </a>
            </div>
            <a href="${escapeAttr(url)}" class="project-link d-flex align-items-center justify-content-center flex-shrink-0"${targetAttr}>
              <i class="ph-bold ph-arrow-up-right n5-color"></i>
            </a>
          </div>
        </div>
      </div>`;
  }

  async function loadProjects() {
    const client = window.supabaseClient;
    if (!client) return null;

    const { data, error } = await client
      .from("portfolio_projects")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error || !data) {
      console.warn("content-loader: could not load portfolio_projects", error);
      return null;
    }
    return data;
  }

  function renderProjectRows(projects) {
    if (!projects || !projects.length) return;

    // Home page — featured projects only
    const featuredRow = document.querySelector('[data-projects-row="featured"]');
    if (featuredRow) {
      const featured = projects.filter((p) => p.featured);
      const list = featured.length ? featured : projects.slice(0, 4);
      featuredRow.innerHTML = list.map(renderProjectCard).join("\n");
    }

    // Portfolio page — one row per tab/category
    document.querySelectorAll("[data-projects-row]").forEach((row) => {
      const category = row.getAttribute("data-projects-row");
      if (category === "featured") return; // handled above

      const list =
        category === "all" ? projects : projects.filter((p) => p.category === category);

      // Keep the static fallback if this category has nothing in the DB yet
      if (!list.length) return;

      row.innerHTML = list.map(renderProjectCard).join("\n");
    });

    if (window.AOS && typeof window.AOS.refreshHard === "function") {
      window.AOS.refreshHard();
    } else if (window.AOS && typeof window.AOS.refresh === "function") {
      window.AOS.refresh();
    }
  }

  async function init() {
    if (!window.supabaseClient) return; // not configured yet — keep static site as-is

    const [content, projects] = await Promise.all([loadSiteContent(), loadProjects()]);
    applySiteContent(content);
    renderProjectRows(projects);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
