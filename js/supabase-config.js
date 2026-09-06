// =========================================================================
//  ЗАПОЛНИ ЭТИ 4 ЗНАЧЕНИЯ — инструкция в ADMIN-README.md
// =========================================================================
window.SITE_CONFIG = {
  // Supabase → Project Settings → API
  SUPABASE_URL: "https://ewcifgqrhlxeuabygkyl.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3Y2lmZ3FyaGx4ZXVhYnlna3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNjA0OTQsImV4cCI6MjEwMTkzNjQ5NH0.YxY2SEMMHjX85NcSxecxYN_0VGxirjDPaKgnwgit6Fg",

  // Cloudinary → Settings → Upload → Upload presets (unsigned preset)
  CLOUDINARY_CLOUD_NAME: "raegbpgo",
  CLOUDINARY_UPLOAD_PRESET: "portfolio",
};

// Единый Supabase-клиент, которым пользуются и сайт, и админка.
// Ничего ниже менять не нужно.
window.supabaseClient = (window.supabase && window.SITE_CONFIG.SUPABASE_URL.indexOf("YOUR-PROJECT-ID") === -1)
  ? window.supabase.createClient(window.SITE_CONFIG.SUPABASE_URL, window.SITE_CONFIG.SUPABASE_ANON_KEY)
  : null;
