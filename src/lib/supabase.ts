import { createClient } from "@supabase/supabase-js";

// SERVICE ROLE key — full access, server-side only. Never send this to the
// frontend or Tauri app. The frontend uses the public anon key instead.
const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment — check your .env file."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export const SCREENSHOTS_BUCKET = "trade-screenshots";
