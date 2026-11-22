// lib/saveMaterial.js
// Menyimpan material baru milik Seller ke Supabase:
//   foto  -> Supabase Storage (bucket "material-photos")
//   data  -> fungsi SQL create_material (lihat SQL migrasi)
// Memakai fetch langsung ke REST Supabase dengan token login seller, jadi tidak perlu paket tambahan.
import { getAccessToken } from '@/lib/auth';

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const BUCKET = 'material-photos';

// Kota -> provinsi (dipakai AI untuk mencocokkan material dengan wilayah pembeli)
const KOTA_PROVINSI = {
  surabaya: 'Jawa Timur', sidoarjo: 'Jawa Timur', gresik: 'Jawa Timur', malang: 'Jawa Timur',
  mojokerto: 'Jawa Timur', pasuruan: 'Jawa Timur', probolinggo: 'Jawa Timur', kediri: 'Jawa Timur',
  blitar: 'Jawa Timur', madiun: 'Jawa Timur', jember: 'Jawa Timur', banyuwangi: 'Jawa Timur',
  lamongan: 'Jawa Timur', tuban: 'Jawa Timur', bojonegoro: 'Jawa Timur', jombang: 'Jawa Timur',
  lumajang: 'Jawa Timur', tulungagung: 'Jawa Timur', nganjuk: 'Jawa Timur', ngawi: 'Jawa Timur',
  ponorogo: 'Jawa Timur', situbondo: 'Jawa Timur', bondowoso: 'Jawa Timur', bangkalan: 'Jawa Timur',
  sampang: 'Jawa Timur', pamekasan: 'Jawa Timur', sumenep: 'Jawa Timur',
  jakarta: 'DKI Jakarta', bandung: 'Jawa Barat', bogor: 'Jawa Barat', depok: 'Jawa Barat',
  bekasi: 'Jawa Barat', tangerang: 'Banten', semarang: 'Jawa Tengah', solo: 'Jawa Tengah',
  yogyakarta: 'DI Yogyakarta', denpasar: 'Bali', medan: 'Sumatera Utara', makassar: 'Sulawesi Selatan',
};

// "Gudang Rungkut, Surabaya" -> { kota: 'Surabaya', provinsi: 'Jawa Timur' }
export function parseLokasi(lokasi = '') {
  const text = String(lokasi);
  const lower = text.toLowerCase();
  let best = null;
  for (const key of Object.keys(KOTA_PROVINSI)) {
    const m = lower.match(new RegExp(`\\b${key}\\b`));
    if (m && (!best || m.index < best.index)) best = { key, index: m.index };
  }
  if (best) return { kota: best.key.charAt(0).toUpperCase() + best.key.slice(1), provinsi: KOTA_PROVINSI[best.key] };
  return { kota: text.split(',')[0].trim().slice(0, 50), provinsi: null };
}

function userIdFromToken(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64)).sub || null;
  } catch {
    return null;
  }
}

async function uploadFoto(token, dataUrl) {
  const uid = userIdFromToken(token);
  if (!uid) throw new Error('Sesi login tidak valid. Silakan login ulang.');
  const blob = await (await fetch(dataUrl)).blob();
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[blob.type] || 'jpg';
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${uid}/${id}.${ext}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': blob.type || 'image/jpeg',
      'x-upsert': 'false',
    },
    body: blob,
  });
  if (!res.ok) {
    throw new Error('Foto gagal diunggah. Pastikan bucket "material-photos" sudah dibuat dan izin upload aktif.');
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

function pesanError(err) {
  const code = err?.code;
  const msg = err?.message || '';
  if (code === '23505') return 'Anda sudah memiliki material dengan nama yang sama. Ubah nama material lalu coba lagi.';
  if (code === 'PGRST202' || /could not find the function/i.test(msg)) {
    return 'Fungsi create_material belum ada di Supabase. Jalankan SQL migrasinya terlebih dahulu.';
  }
  if (code === 'P0001') return msg; // pesan validasi dari fungsi SQL
  if (code === '42501' || /permission denied|row-level security/i.test(msg)) {
    return 'Akun ini tidak memiliki izin menyimpan material.';
  }
  return msg || 'Material gagal disimpan. Coba lagi.';
}

/**
 * Simpan material baru. Mengembalikan id_material.
 * @param {{form: object, photo: {dataUrl: string}, ai?: object|null}} args
 */
export async function createMaterial({ form, photo, ai }) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).');
  }
  const token = await getAccessToken();
  if (!token) throw new Error('Silakan login terlebih dahulu.');

  const fotoUrl = String(photo?.dataUrl || '').startsWith('data:')
    ? await uploadFoto(token, photo.dataUrl)
    : photo?.dataUrl || null;

  const { kota, provinsi } = parseLokasi(form.location);
  const { _demo, ...aiBersih } = ai || {};
  const tags = (Array.isArray(aiBersih.tags) ? aiBersih.tags : [])
    .map((t) => String(t).toLowerCase().replace(/^#/, '').trim())
    .filter(Boolean)
    .slice(0, 8);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_material`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_nama: form.name.trim(),
      p_deskripsi: form.description.trim(),
      p_kondisi: form.condition.trim(),
      p_kategori: aiBersih.category || 'Lainnya',
      p_stok: Number(form.quantity),
      p_satuan: form.satuan || 'kg',
      p_harga: Number(form.price),
      p_lokasi: form.location.trim(),
      p_kota: kota,
      p_provinsi: provinsi,
      p_foto_url: fotoUrl,
      p_tags: tags,
      p_ai_hasil: Object.keys(aiBersih).length ? aiBersih : null,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(pesanError(data));
  return data; // id_material
}