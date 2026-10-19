import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// null kalau env belum diisi, supaya aplikasi tetap bisa jalan dalam mode demo
export const supabase = url && key ? createClient(url, key) : null;
export const isSupabaseConfigured = Boolean(supabase);
