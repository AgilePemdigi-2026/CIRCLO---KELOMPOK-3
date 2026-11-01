import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

// Ubah fungsi ini kalau rute halaman Material Detail di aplikasimu berbeda.
const hrefDetail = (m) => `/marketplace/${m.id}`;

// Material populer + jumlah material, dibaca di server dari tabel `material`.
// Kunci Supabase tidak sampai ke browser.
async function getData() {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { total: null, populer: [] };

    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.from('material').select('*').limit(2000);
    if (error || !data) return { total: null, populer: [] };

    const tersedia = data.filter((m) => m.status_material !== false && Number(m.stok) > 0);
    // Belum ada metrik "populer" di database, jadi sementara diambil dari stok terbanyak.
    const populer = [...tersedia].sort((a, b) => Number(b.stok) - Number(a.stok)).slice(0, 4);
    return { total: tersedia.length, populer };
  } catch {
    return { total: null, populer: [] };
  }
}

const nama = (m) => m.nama_material || m.nama || m.judul || 'Material';
const foto = (m) => m.foto_url || m.gambar || m.image_url || m.foto || null;
// Badge skor hanya tampil kalau tabel material punya kolom skor.
const skor = (m) => m.match_score ?? m.skor ?? m.eco_score ?? null;

/* ---------- Ikon (SVG kecil, tanpa library tambahan) ---------- */
function Ikon({ children, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
const IkonSparkle = (p) => (
  <Ikon {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
  </Ikon>
);
const IkonDaur = (p) => (
  <Ikon {...p}>
    <path d="M7 19l-3-5 3-5" />
    <path d="M4 14h8" />
    <path d="M17 5l3 5-3 5" />
    <path d="M20 10h-8" />
    <path d="M10 5h7M14 19H7" />
  </Ikon>
);
const IkonDaun = (p) => (
  <Ikon {...p}>
    <path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" />
    <path d="M5 19c3-5 6-8 10-10" />
  </Ikon>
);
const IkonJangka = (p) => (
  <Ikon {...p}>
    <path d="M12 4v3" />
    <circle cx="12" cy="8.5" r="1.5" />
    <path d="M11 10l-5 10M13 10l5 10M8 15h8" />
  </Ikon>
);
const IkonKompas = (p) => (
  <Ikon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
  </Ikon>
);
const IkonBentuk = (p) => (
  <Ikon {...p}>
    <path d="M7 3l4 7H3l4-7z" />
    <circle cx="17" cy="7" r="3.5" />
    <rect x="4" y="14" width="7" height="7" rx="1" />
    <path d="M15 14h6v7h-6z" />
  </Ikon>
);
const IkonRobot = (p) => (
  <Ikon {...p}>
    <rect x="5" y="8" width="14" height="11" rx="3" />
    <path d="M12 4v4M9.5 13h.01M14.5 13h.01M9 16.5h6" />
  </Ikon>
);
const IkonPanah = (p) => (
  <Ikon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Ikon>
);

const ASISTEN = [
  {
    judul: 'Pencocok Material',
    deskripsi:
      'Temukan material sekunder terbaik untuk proyek Anda berikutnya berdasarkan lokasi dan kebutuhan Anda.',
    href: '/cari-material',
    ikon: IkonDaur,
    warna: 'bg-[#8bc34a] text-[#2c4a06]',
  },
  {
    judul: 'Estimator Dampak',
    deskripsi: 'Hitung penghematan karbon dan dampak komunitas dari pilihan desain sirkular Anda.',
    ikon: IkonDaun,
    warna: 'bg-[#b5bf6b] text-[#3b4210]',
  },
  {
    judul: 'Pola Desain',
    deskripsi:
      'Jelajahi cetak biru yang dihasilkan AI yang dioptimalkan untuk pembongkaran dan penggunaan kembali.',
    ikon: IkonJangka,
    warna: 'bg-[#d9e2ea] text-[#2d3b47]',
  },
];

function KartuMaterial({ m, besar }) {
  const src = foto(m);
  const nilaiSkor = skor(m);
  return (
    <Link
      href={hrefDetail(m)}
      className={`group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-[#dfe8d3] to-[#c9d9b4] shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3f6a0b] ${
        besar ? 'min-h-[320px] sm:col-span-2 sm:row-span-2 sm:min-h-[420px]' : 'min-h-[200px]'
      }`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <IkonDaun className="absolute left-1/2 top-1/3 h-14 w-14 -translate-x-1/2 text-white/60" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {nilaiSkor !== null && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-circlo-ink shadow-sm">
          <IkonDaun className="h-3.5 w-3.5 text-[#3f6a0b]" />
          {nilaiSkor}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
        <div className="min-w-0">
          {m.kategori && (
            <span className="inline-block rounded-full bg-[#5a5f1e] px-3 py-1 text-xs font-medium">
              {m.kategori}
            </span>
          )}
          <p className={`mt-2 truncate font-display font-semibold ${besar ? 'text-2xl' : 'text-base'}`}>
            {nama(m)}
          </p>
          {m.kota && <p className="mt-1 text-xs text-white/80">{m.kota}</p>}
        </div>
        {besar && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/25 transition group-hover:bg-white/40">
            <IkonPanah className="h-5 w-5" />
          </span>
        )}
      </div>
    </Link>
  );
}

export default async function BuyerPage() {
  const { total, populer } = await getData();
  const [utama, ...lain] = populer;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ========== Hero + pencarian AI ========== */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#e6f3fc] to-[#eef5f9] px-6 py-16 text-center shadow-sm">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#b9dca0]/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-12 h-64 w-64 rounded-full bg-[#e8dcc4]/70 blur-3xl" />

          <div className="relative">
            <h1 className="font-display text-4xl font-bold text-[#3f6a0b] sm:text-5xl">Halo, Buyer.</h1>
            <p className="mx-auto mt-3 max-w-xl font-display text-xl font-semibold text-circlo-ink sm:text-2xl">
              Apa yang ingin Anda buat atau temukan hari ini?
            </p>

            <form action="/cari-material" method="get" className="mx-auto mt-8 max-w-2xl">
              <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white/70 p-2 pl-5 shadow-sm backdrop-blur">
                <IkonSparkle className="h-5 w-5 shrink-0 text-[#3f6a0b]" />
                <input
                  type="text"
                  name="q"
                  placeholder="misal: Ek reklamasi untuk rak, Daur ulang plastik lokal..."
                  aria-label="Ceritakan kebutuhan material Anda"
                  className="min-w-0 flex-1 bg-transparent text-sm text-circlo-ink placeholder:text-gray-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-full bg-[#3f6a0b] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#335609] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f6a0b]"
                >
                  Cari
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ========== Asisten Sirkular AI ========== */}
        <section className="mt-14">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-circlo-ink">
            <IkonRobot className="h-6 w-6 text-[#8a5a14]" />
            Asisten Sirkular AI
          </h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {ASISTEN.map((a) => {
              const Ikonnya = a.ikon;
              const isi = (
                <>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full ${a.warna}`}>
                    <Ikonnya className="h-5 w-5" />
                  </span>
                  <p className="mt-5 text-base font-semibold text-circlo-ink">{a.judul}</p>
                  <p className="mt-2 text-sm leading-relaxed text-circlo-muted">{a.deskripsi}</p>
                  {!a.href && <p className="mt-4 text-xs font-semibold text-gray-500">Segera hadir</p>}
                </>
              );
              return (
                <li key={a.judul}>
                  {a.href ? (
                    <Link
                      href={a.href}
                      className="block h-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3f6a0b]"
                    >
                      {isi}
                    </Link>
                  ) : (
                    <div className="h-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">{isi}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* ========== Material Populer ========== */}
        <section className="mt-14">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-circlo-ink">
              <IkonBentuk className="h-6 w-6 text-[#3f6a0b]" />
              Material Populer
            </h2>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#3f6a0b] hover:underline"
            >
              Lihat Semua
              <IkonPanah className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {utama && <KartuMaterial m={utama} besar />}
            {lain.map((m) => (
              <KartuMaterial key={m.id} m={m} />
            ))}
            <Link
              href="/marketplace"
              className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl bg-[#8bc34a] p-6 text-center shadow-sm transition hover:bg-[#7db840] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3f6a0b]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/30 text-[#2c4a06]">
                <IkonKompas className="h-6 w-6" />
              </span>
              <p className="mt-4 font-display text-xl font-semibold text-[#2c4a06]">Jelajahi Direktori</p>
              <p className="mt-2 text-sm text-[#2c4a06]">
                {total !== null
                  ? `Telusuri ${total} material yang tersedia.`
                  : 'Telusuri material yang tersedia.'}
              </p>
            </Link>
          </div>

          {populer.length === 0 && (
            <p className="mt-3 text-sm text-circlo-muted">Belum ada material yang bisa ditampilkan.</p>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
