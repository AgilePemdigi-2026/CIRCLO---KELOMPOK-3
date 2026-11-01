import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

// Statistik singkat dari tabel `material`. Dibaca di server, jadi kunci tidak sampai ke browser.
async function getStatistik() {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;

    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin
      .from('material')
      .select('kategori,kota,stok,status_material')
      .limit(2000);
    if (error || !data) return null;

    const tersedia = data.filter((m) => m.status_material !== false && Number(m.stok) > 0);
    return {
      material: tersedia.length,
      kategori: new Set(tersedia.map((m) => m.kategori).filter(Boolean)).size,
      kota: new Set(tersedia.map((m) => m.kota).filter(Boolean)).size,
    };
  } catch {
    return null;
  }
}

const AKSES_CEPAT = [
  {
    href: '/marketplace',
    judul: 'Material Catalog',
    deskripsi: 'Jelajahi semua material daur ulang yang tersedia.',
  },
  {
    href: '/cari-material',
    judul: 'Cari Material',
    deskripsi: 'Ceritakan kebutuhanmu, asisten AI akan merekomendasikan material.',
  },
  {
    href: '/orders',
    judul: 'Pesanan',
    deskripsi: 'Pantau status dan riwayat pesananmu.',
  },
];

export default async function BuyerPage() {
  const stat = await getStatistik();
  const tampil = (n) => (n === undefined || n === null ? '-' : n);

  const statistik = [
    { label: 'Material tersedia', nilai: tampil(stat?.material) },
    { label: 'Kategori', nilai: tampil(stat?.kategori) },
    { label: 'Kota asal material', nilai: tampil(stat?.kota) },
  ];

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[900px] px-6 py-14 min-h-[60vh]">
        <h1 className="font-display text-[30px] font-semibold text-circlo-ink">Welcome, Buyer</h1>
        <p className="mt-3 text-[16px] leading-[1.6] text-circlo-muted">
          Temukan material daur ulang yang cocok untuk kebutuhan usahamu. Jelajahi katalog material atau
          cari lewat asisten AI CIRCLO untuk mendapatkan rekomendasi yang sesuai.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-gray-800">Statistik singkat</h2>
          <dl className="mt-3 grid gap-4 sm:grid-cols-3">
            {statistik.map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <dt className="text-xs font-semibold text-gray-500">{s.label}</dt>
                <dd className="mt-2 text-3xl font-bold text-[#3f6a0b]">{s.nilai}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-gray-800">Akses cepat</h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-3">
            {AKSES_CEPAT.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="block h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <p className="text-sm font-bold text-gray-800">{a.judul}</p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">{a.deskripsi}</p>
                  <p className="mt-4 text-xs font-semibold text-[#3f6a0b]">Buka halaman</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}