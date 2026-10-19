import { supabase } from './supabase';

// Kirim material yang sudah dikonfirmasi ke server, lalu server menyimpannya ke
// tabel `material` (tabel yang dibaca CIRCLO AI) memakai service role.
// Mengembalikan { ok, persisted }. persisted=false artinya Supabase belum dikonfigurasi (mode demo).
export async function saveMaterial(material) {
  if (!supabase) return { ok: true, persisted: false };

  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Sesi login tidak ditemukan. Silakan masuk ulang.');

  const res = await fetch('/api/materials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(material),
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.error || `Simpan material gagal (${res.status}).`);

  return { ok: true, persisted: true, id: result.id_material };
}
