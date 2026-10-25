import { supabase } from './supabase';

// Nama tabel dan bucket bisa diganti lewat env kalau berbeda dengan database teman.
const TABLE = process.env.NEXT_PUBLIC_SUPABASE_MATERIALS_TABLE || 'materials';
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'material-photos';

// true = Supabase belum dikonfigurasi. Data disimpan di browser ini saja (localStorage) agar semua alur
// (upload, My Materials, edit) tetap bisa dicoba tanpa database. Data demo TIDAK dibagikan ke pengguna lain.
export const isDemoStore = !supabase;

/* ------------------------------ penyimpanan demo ------------------------------ */
const DEMO_KEY = 'circlo:demo-materials-v1';

function demoSeed() {
  // Contoh dari skenario SRS 4.6 agar skenario "update material" bisa langsung dicoba
  return [
    {
      id: 'demo-1', nama: 'Kain Katun Hitam', jenis_material: 'Tekstil', kategori: 'Bahan Baku', kondisi: 'Baik',
      kondisi_seller: 'Bersih dan kering', dimensi: 'Tidak diketahui', skor_ai: 82, deskripsi: 'Sisa kain katun hitam',
      jumlah: 250, harga: 3000, lokasi: 'Surabaya', foto_url: '/images/kain-katun-hitam.jpg', status: 'aktif',
      created_at: new Date().toISOString(),
    },
  ];
}

function demoRead() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* abaikan, pakai data awal */
  }
  const seed = demoSeed();
  demoWrite(seed);
  return seed;
}

function demoWrite(rows) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(rows));
  } catch {
    throw new Error('Penyimpanan browser penuh. Hapus data situs ini lalu coba lagi.');
  }
}

/* ----------------------------------- Supabase ---------------------------------- */
async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

async function uploadPhoto(dataUrl, sellerId) {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${sellerId || 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw new Error(`Upload foto gagal: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

const isDataUrl = (v) => typeof v === 'string' && v.startsWith('data:');

// Satu-satunya tempat pemetaan field aplikasi -> kolom tabel. Kalau nama kolom di database berbeda, ubah di sini.
function toRow(m, photoUrl, sellerId) {
  const row = {
    nama: m.nama,
    jenis_material: m.jenis_material,
    kategori: m.kategori,
    kondisi: m.kondisi,
    kondisi_seller: m.kondisi_seller,
    dimensi: m.dimensi,
    skor_ai: m.skor_ai,
    satuan: m.satuan,
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

/* --------------------------------- API publik ---------------------------------- */

// Simpan material baru yang sudah dikonfirmasi (REQ-42). Mengembalikan { ok, id, persisted }.
// persisted=false artinya mode demo (hanya tersimpan di browser ini).
// Mode Supabase: material dikirim ke server (/api/materials), lalu server menyimpannya ke
// tabel `material` (tabel yang dibaca CIRCLO AI) memakai service role.
export async function saveMaterial(material) {
  if (!supabase) {
    const rows = demoRead();
    const id = `demo-${Date.now()}`;
    rows.unshift({ id, ...toRow(material, material.foto, null), created_at: new Date().toISOString() });
    demoWrite(rows);
    return { ok: true, id, persisted: false };
  }

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

  return { ok: true, id: result.id_material, persisted: true };
}

// Daftar material milik Seller yang sedang login (halaman My Materials).
export async function listMyMaterials() {
  if (!supabase) return { rows: demoRead(), persisted: false };
  const sellerId = await currentUserId();
  if (!sellerId) return { rows: [], persisted: true };
  const { data, error } = await supabase.from(TABLE).select('*').eq('seller_id', sellerId).order('created_at', { ascending: false });
  if (error) throw new Error(`Gagal memuat material: ${error.message}`);
  return { rows: data || [], persisted: true };
}

export async function getMaterial(id) {
  if (!supabase) {
    const row = demoRead().find((r) => String(r.id) === String(id));
    if (!row) throw new Error('Material tidak ditemukan.');
    return row;
  }
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
  if (error || !data) throw new Error('Material tidak ditemukan.');
  // Seller hanya boleh mengedit materialnya sendiri (perlindungan sesungguhnya tetap aturan RLS di database)
  const uid = await currentUserId();
  if (uid && data.seller_id && data.seller_id !== uid) throw new Error('Material tidak ditemukan.');
  return data;
}

// Ubah informasi material (REQ-43). `patch` memakai nama kolom yang sama dengan toRow().
// Kalau patch.foto berisi data URL, foto diganti; kalau tidak, foto lama dibiarkan.
export async function updateMaterial(id, patch) {
  const { foto, ...fields } = patch;
  if (!supabase) {
    const rows = demoRead();
    const i = rows.findIndex((r) => String(r.id) === String(id));
    if (i < 0) throw new Error('Material tidak ditemukan.');
    rows[i] = { ...rows[i], ...fields, ...(isDataUrl(foto) ? { foto_url: foto } : {}) };
    demoWrite(rows);
    return { persisted: false };
  }
  const sellerId = await currentUserId();
  const update = { ...fields };
  if (isDataUrl(foto)) update.foto_url = await uploadPhoto(foto, sellerId);
  const { data, error } = await supabase.from(TABLE).update(update).eq('id', id).select('id');
  if (error) throw new Error(`Perubahan gagal disimpan: ${error.message}`);
  if (!data?.length) throw new Error('Material tidak ditemukan atau bukan milik Anda.');
  return { persisted: true };
}
