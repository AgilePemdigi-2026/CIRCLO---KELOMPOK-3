'use client';

import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Pakai createBrowserClient (berbasis cookie) supaya sesi yang dibuat halaman
// login/register terbaca juga oleh Navbar/useRole dan modul lain.
// null kalau env belum diisi, supaya aplikasi tetap bisa jalan dalam mode demo.
export const supabase = url && key ? createBrowserClient(url, key) : null;
export const isSupabaseConfigured = Boolean(supabase);
