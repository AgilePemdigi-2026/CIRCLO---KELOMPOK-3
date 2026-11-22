// app/katalog/page.jsx
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MaterialCard } from '@/components/MaterialCard';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // always fresh (adjust if you want caching)

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase belum dikonfigurasi di server.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchMaterials(searchParams) {
  const admin = adminClient();

  const q = String(searchParams.get('q') || '').trim();
  const kategori = String(searchParams.get('kategori') || '').trim();
  const kota = String(searchParams.get('kota') || '').trim();
  const hargaMaxRaw = Number(searchParams.get('harga_max'));
  const hargaMax = Number.isFinite(hargaMaxRaw) && hargaMaxRaw > 0 ? hargaMaxRaw : null;

  let query = admin
    .from('material')
    .select('*')
    .order('id_material', { ascending: false })
    .limit(200);

  if (q) query = query.or(`nama_material.ilike.%${q}%,deskripsi_material.ilike.%${q}%`);
  if (kategori) query = query.ilike('kategori', kategori);
  if (kota) query = query.ilike('kota', `%${kota}%`);
  if (hargaMax !== null) query = query.lte('harga', hargaMax);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal memuat material: ${error.message}`);

  return (data || []).map(m => ({
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
}

export default async function CatalogPage() {
  // In a Server Component we can read the URL directly
  const { searchParams } = new URL('http://placeholder'); // placeholder, we will use request params later
  const materials = await fetchMaterials(searchParams);

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold text-[#3f6aa0b]">Katalog Material</h1>
          <Link href="/buyer" className="text-sm font-medium text-gray-600 hover:underline">
            Kembali ke Buyer
          </Link>
        </section>
        {materials.length === 0 ? (
          <p className="mt-8 text-center text-gray-500">Material yang sesuai belum ditemukan</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {materials.map(m => (
              <MaterialCard key={m.id_material} material={m} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
