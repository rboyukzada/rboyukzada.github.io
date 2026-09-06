// =========================================================================
//  ЗАПОЛНИ ЭТИ 4 ЗНАЧЕНИЯ — инструкция в ADMIN-README.md
// =========================================================================
window.SITE_CONFIG = {
  // Supabase → Project Settings → API
  SUPABASE_URL: "https://qajvgcwrhkrnohhbsbad.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhanZnY3dyaGtybm9oaGJzYmFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNTIzODAsImV4cCI6MjA5ODgyODM4MH0.94KsNMRAN_-C7mBeJzu9hhBynJAE9oFytqK-ihWdBj4",

  // Cloudinary → Settings → Upload → Upload presets (unsigned preset)
  CLOUDINARY_CLOUD_NAME: "YOUR-CLOUDINARY-CLOUD-NAME",
  CLOUDINARY_UPLOAD_PRESET: "YOUR-UNSIGNED-UPLOAD-PRESET",
};

// Единый Supabase-клиент, которым пользуются и сайт, и админка.
// Ничего ниже менять не нужно.
window.supabaseClient = (window.supabase && window.SITE_CONFIG.SUPABASE_URL.indexOf("YOUR-PROJECT-ID") === -1)
  ? window.supabase.createClient(window.SITE_CONFIG.SUPABASE_URL, window.SITE_CONFIG.SUPABASE_ANON_KEY)
  : null;
