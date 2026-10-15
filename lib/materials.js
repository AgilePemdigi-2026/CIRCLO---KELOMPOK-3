import { supabase } from './supabase';

// Nama tabel dan bucket bisa diganti lewat env kalau berbeda dengan database teman.
const TABLE = process.env.NEXT_PUBLIC_SUPABASE_MATERIALS_TABLE || 'materials';
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'material-photos';

// Satu-satunya tempat pemetaan field aplikasi -> kolom tabel.
// Kalau nama kolom di database berbeda, cukup ubah objek ini.
function toRow(m, photoUrl, sellerId) {
  const row = {
    nama: m.nama,
    jenis_material: m.jenis_material,
    kategori: m.kategori,
    kondisi: m.kondisi,
    dimensi: m.dimensi,
    skor_ai: m.skor,
    deskripsi: m.deskripsi,
    jumlah: m.jumlah,
    harga: m.harga,
    lokasi: m.lokasi,
    foto_url: photoUrl,
    status: 'aktif',
  };
  if (sellerId) row.seller_id = sellerId;
  return row;
}

async function uploadPhoto(dataUrl, sellerId) {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${sellerId || 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw new Error(`Upload foto gagal: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Simpan material yang sudah dikonfirmasi ke katalog (REQ-42).
// Mengembalikan { ok, persisted }. persisted=false artinya Supabase belum dikonfigurasi (mode demo).
export async function saveMaterial(material) {
  if (!supabase) return { ok: true, persisted: false };

  const { data: auth } = await supabase.auth.getUser();
  const sellerId = auth?.user?.id || null;

  const photoUrl = material.foto ? await uploadPhoto(material.foto, sellerId) : null;
  const { error } = await supabase.from(TABLE).insert(toRow(material, photoUrl, sellerId));
  if (error) throw new Error(`Simpan material gagal: ${error.message}`);

  return { ok: true, persisted: true };
}
