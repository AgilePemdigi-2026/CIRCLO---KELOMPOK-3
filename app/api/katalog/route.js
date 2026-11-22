import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Buang karakter yang bisa merusak filter PostgREST
const clean = (v) => String(v || '').replace(/[,()%*]/g, ' ').trim();

// GET /api/katalog?q=&kategori=&kota=
// Membaca tabel `material`. Hanya field publik yang dikirim ke browser.
// Kolom opsional (kondisi_seller, foto_url) bernilai null kalau belum ada di database.
export async function GET(req) {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase belum dikonfigurasi di server.' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const q = clean(searchParams.get('q'));
  const kategori = clean(searchParams.get('kategori'));
  const kota = clean(searchParams.get('kota'));
  // Number(null) === 0, jadi param yang tidak dikirim harus dicek dulu supaya tidak jadi filter harga <= 0
  const hargaMaxParam = searchParams.get('harga_max');
  const hargaMaxRaw = hargaMaxParam ? Number(hargaMaxParam) : NaN;
  const hargaMax = Number.isFinite(hargaMaxRaw) && hargaMaxRaw > 0 ? hargaMaxRaw : null;

  let query = admin.from('material').select('*').order('id_material', { ascending: false }).limit(200);

  if (q) query = query.or(`nama_material.ilike.%${q}%,deskripsi_material.ilike.%${q}%`);
  if (kategori) query = query.ilike('kategori', kategori);
  if (kota) query = query.ilike('kota', `%${kota}%`);
  if (hargaMax !== null) query = query.lte('harga', hargaMax);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: `Gagal memuat katalog: ${error.message}` }, { status: 500 });
  }

  const rows = (data || []).map((m) => ({
    id_material: m.id_material,
    nama_material: m.nama_material,
    kategori: m.kategori,
    stok: m.stok,
    satuan: m.satuan,
    harga: m.harga,
    lokasi: m.lokasi,
    kota: m.kota,
    provinsi: m.provinsi,
    deskripsi_material: m.deskripsi_material,
    kondisi_seller: m.kondisi_seller ?? null,
    foto_url: m.foto_url ?? null,
    tersedia: m.status_material !== false && Number(m.stok) > 0,
  }));
  const kategoriList = [...new Set(rows.map((m) => m.kategori).filter(Boolean))].sort();

  return NextResponse.json({ rows, kategori: kategoriList });
}