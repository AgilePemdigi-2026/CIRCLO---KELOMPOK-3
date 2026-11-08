// Penjaga akses (REQ-83): hanya user dengan role "government" yang boleh memuat data monitoring.
// Membaca sesi login dari cookie (sama seperti browser client @supabase/ssr), lalu memakai roleFromUser.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { roleFromUser } from '@/lib/roles';
 
export async function cekPemerintah() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const store = cookies();
    const supabase = createServerClient(url, key, {
      cookies: { getAll: () => store.getAll(), setAll: () => {} },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, status: 401, pesan: 'Silakan login sebagai Pemerintah/Admin untuk melihat halaman ini.' };
    }
    if (roleFromUser(user) !== 'government') {
      return { ok: false, status: 403, pesan: 'Halaman ini khusus Pemerintah/Admin.' };
    }
    return { ok: true };
  } catch (e) {
    console.error('[government] gagal memeriksa sesi:', e?.message);
    return { ok: false, status: 401, pesan: 'Sesi login tidak dapat diperiksa. Coba login ulang.' };
  }
}
 