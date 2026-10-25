import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-side only
if (!url || !key) throw new Error("Supabase env vars missing");

export const db = createClient(url, key, { auth: { persistSession: false } });
