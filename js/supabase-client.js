/* ==========================================================
   Supabase connection
   These are your PUBLIC project URL + PUBLISHABLE (anon) key.
   This key is safe to expose in frontend code — real security
   comes from the Row Level Security policies in supabase-schema.sql.
   ========================================================== */

const SUPABASE_URL = "https://zbzdylgxowvvsgawwvlp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7kiH3uujxTuAgycDGudwMA_bcpyocE0";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* ==========================================================
   Cloudinary connection (image storage — 25GB free)
   Photos are uploaded here. Only the resulting image URL is
   saved in the Supabase "gallery" table.
   ========================================================== */

const CLOUDINARY_CLOUD_NAME = "ib3py0si";
const CLOUDINARY_UPLOAD_PRESET = "bdmizanur_gallery";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
