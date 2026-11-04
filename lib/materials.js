
import { supabase } from './supabase';

// Nama tabel utama CIRCLO adalah "material".
// Penyimpanan database dilakukan melalui API server.
const TABLE =
  process.env.NEXT_PUBLIC_SUPABASE_MATERIALS_TABLE ||
  'material';

// Mode demo aktif jika Supabase tidak dikonfigurasi.
export const isDemoStore = !supabase;

const DEMO_KEY = 'circlo:demo-materials-v1';

/* =========================================
   PENYIMPANAN DEMO
========================================= */

function demoSeed() {
  return [
    {
      id: 'demo-1',
      nama: 'Kain Katun Hitam',
      jenis_material: 'Tekstil',
      kategori: 'Bahan Baku',
      kondisi: 'Baik',
      kondisi_seller: 'Bersih dan kering',
      dimensi: 'Tidak diketahui',
      skor_ai: 82,
      deskripsi: 'Sisa kain katun hitam',
      jumlah: 250,
      satuan: 'kg',
      harga: 3000,
      lokasi: 'Surabaya',
      foto_url: '/images/kain-katun-hitam.jpg',
      status: 'aktif',
      created_at: new Date().toISOString(),
    },
  ];
}

function demoRead() {
  if (typeof window === 'undefined') {
    return demoSeed();
  }

  try {
    const raw = localStorage.getItem(DEMO_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Jika data rusak, gunakan data awal.
  }

  const rows = demoSeed();
  demoWrite(rows);

  return rows;
}

function demoWrite(rows) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      DEMO_KEY,
      JSON.stringify(rows)
    );
  } catch {
    throw new Error(
      'Penyimpanan browser penuh. Hapus data demo yang tidak diperlukan.'
    );
  }
}

const isDataUrl = (value) =>
  typeof value === 'string' &&
  value.startsWith('data:');

/* =========================================
   PEMETAAN DATA MATERIAL
========================================= */

// Mengubah data database menjadi format
// yang digunakan halaman My Materials.
function fromDatabase(row) {
  return {
    ...row,

    id: row.id_material,
    nama: row.nama_material || '',
    jenis_material: row.kategori || '',
    kategori: row.kategori || '',
    kondisi: row.kondisi_seller || '',
    kondisi_seller: row.kondisi_seller || '',
    deskripsi: row.deskripsi_material || '',
    jumlah: Number(row.stok ?? 0),
    stok: Number(row.stok ?? 0),
    harga: Number(row.harga ?? 0),
    satuan: row.satuan || 'unit',
    lokasi: row.lokasi || row.kota || '',
    foto_url: row.foto_url || '',
    status:
      row.status_material === false
        ? 'nonaktif'
        : 'aktif',

    // Nilai tambahan jika tersedia.
    dimensi: row.dimensi || '',
    skor_ai: row.skor_ai ?? null,
    created_at: row.created_at || null,
  };
}

// Format penyimpanan untuk mode demo.
function toDemoRow(material, id) {
  return {
    id,
    nama: material.nama || '',
    jenis_material:
      material.jenis_material ||
      material.kategori ||
      '',
    kategori: material.kategori || '',
    kondisi:
      material.kondisi ||
      material.kondisi_seller ||
      '',
    kondisi_seller:
      material.kondisi_seller ||
      material.kondisi ||
      '',
    dimensi: material.dimensi || '',
    skor_ai: material.skor_ai ?? null,
    deskripsi: material.deskripsi || '',
    jumlah: Number(material.jumlah || 0),
    satuan: material.satuan || 'kg',
    harga: Number(material.harga || 0),
    lokasi: material.lokasi || '',
    foto_url: material.foto || '',
    status: 'aktif',
    created_at: new Date().toISOString(),
  };
}

/* =========================================
   AUTENTIKASI
========================================= */

async function getToken() {
  if (!supabase) {
    throw new Error(
      'Supabase belum dikonfigurasi.'
    );
  }

  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    throw new Error(
      `Gagal membaca sesi: ${error.message}`
    );
  }

  const token = data?.session?.access_token;

  if (!token) {
    throw new Error(
      'Sesi login tidak ditemukan. Silakan login ulang.'
    );
  }

  return token;
}

/* =========================================
   HELPER API
========================================= */

async function apiRequest(url, options = {}) {
  const token = await getToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  const result =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.detail ||
      result.error ||
      `Permintaan gagal (${response.status}).`
    );
  }

  return result;
}

/* =========================================
   1. UPLOAD MATERIAL
========================================= */

// REQ-42: Menyimpan material baru.
// Mode Supabase menggunakan POST /api/materials.
export async function saveMaterial(material) {
  if (!supabase) {
    const rows = demoRead();
    const id = `demo-${Date.now()}`;

    rows.unshift(toDemoRow(material, id));
    demoWrite(rows);

    return {
      ok: true,
      id,
      persisted: false,
    };
  }

  const result = await apiRequest(
    '/api/materials',
    {
      method: 'POST',
      body: JSON.stringify(material),
    }
  );

  return {
    ok: true,
    id: result.id_material,
    persisted: true,
  };
}

/* =========================================
   2. MENAMPILKAN MY MATERIALS
========================================= */

// Mengambil material milik Seller yang login.
// API melakukan pemeriksaan role dan id_seller.
export async function listMyMaterials() {
  if (!supabase) {
    return {
      rows: demoRead(),
      persisted: false,
    };
  }

  const result = await apiRequest(
    '/api/materials',
    {
      method: 'GET',
    }
  );

  if (!Array.isArray(result.rows)) {
    throw new Error(
      'Format respons daftar material tidak valid.'
    );
  }

  const rows = result.rows.map(fromDatabase);

  return {
    rows,
    persisted: true,
  };
}

/* =========================================
   3. MENGAMBIL DETAIL MATERIAL
========================================= */

export async function getMaterial(id) {
  if (id === undefined || id === null || id === '') {
    throw new Error('ID material tidak valid.');
  }

  if (!supabase) {
    const row = demoRead().find(
      (item) => String(item.id) === String(id)
    );

    if (!row) {
      throw new Error('Material tidak ditemukan.');
    }

    return row;
  }

  // Gunakan endpoint yang sudah memeriksa
  // identitas Seller dan kepemilikan material.
  const { rows } = await listMyMaterials();

  const row = rows.find(
    (item) => String(item.id) === String(id)
  );

  if (!row) {
    throw new Error(
      'Material tidak ditemukan atau bukan milik Anda.'
    );
  }

  return row;
}

/* =========================================
   4. UPDATE MATERIAL
========================================= */

// Mode demo mendukung edit lokal.
// Edit pada database asli membutuhkan API PATCH
// dengan validasi Seller dan kepemilikan material.
export async function updateMaterial(id, patch) {
  if (!id) {
    throw new Error('ID material tidak valid.');
  }

  if (!supabase) {
    const rows = demoRead();

    const index = rows.findIndex(
      (row) => String(row.id) === String(id)
    );

    if (index < 0) {
      throw new Error('Material tidak ditemukan.');
    }

    const { foto, ...fields } = patch;

    rows[index] = {
      ...rows[index],
      ...fields,
      ...(isDataUrl(foto)
        ? { foto_url: foto }
        : {}),
    };

    demoWrite(rows);

    return {
      ok: true,
      persisted: false,
    };
  }

  const result = await apiRequest(
    '/api/materials',
    {
      method: 'PATCH',
      body: JSON.stringify({ id, ...patch }),
    }
  );

  return {
    ok: true,
    id: result.id_material,
    foto_url: result.foto_url,
    persisted: true,
  };
}
