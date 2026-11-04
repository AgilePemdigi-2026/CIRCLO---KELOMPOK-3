import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import MaterialImage from "@/components/MaterialImage";
import MaterialOrderPanel from "@/components/MaterialOrderPanel";

export const dynamic = "force-dynamic";

const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const rupiah = (n) => `Rp${angka.format(Number(n))}`;

const KATEGORI_GAMBAR = [
  "kaca", "karet", "kayu", "kertas", "kulit", "logam",
  "organik", "plastik", "spanduk", "tekstil",
];

function gambarKategori(kategori) {
  const slug = String(kategori || "").toLowerCase();
  return `/images/materials/${KATEGORI_GAMBAR.includes(slug) ? slug : "lainnya"}.svg`;
}

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase belum dikonfigurasi di server.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const tersedia = (m) => m.status_material !== false && Number(m.stok) > 0;

async function getMaterial(admin, id) {
  const { data, error } = await admin
    .from("material")
    .select("*")
    .eq("id_material", id)
    .maybeSingle();
  if (error) throw new Error(`Gagal memuat material: ${error.message}`);
  return data;
}

// Rekomendasi material lain yang masih tersedia (kategori sama dulu, lalu apa saja)
async function getRekomendasi(admin, m) {
  const ambil = async (kategori) => {
    let q = admin
      .from("material")
      .select("id_material,nama_material,kategori,harga,satuan,stok,status_material,kota")
      .neq("id_material", m.id_material)
      .order("id_material", { ascending: false })
      .limit(12);
    if (kategori) q = q.eq("kategori", kategori);
    const { data } = await q;
    return (data || []).filter(tersedia).slice(0, 3);
  };
  const sekategori = await ambil(m.kategori);
  return sekategori.length > 0 ? sekategori : ambil(null);
}

function Baris({ label, children }) {
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-gray-100 py-2 text-sm">
      <dt className="font-semibold text-gray-800">{label}</dt>
      <dd className="col-span-2 text-gray-600">{children}</dd>
    </div>
  );
}

export default async function MaterialDetailPage({ params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const admin = adminClient();
  const m = await getMaterial(admin, id);
  if (!m) notFound();

// Mengambil informasi toko berdasarkan ID seller material
let seller = null;

if (m.id_seller != null) {
  const { data: sellerData, error: sellerError } = await admin
    .from("penjual")
    .select("id_seller, nama_seller, email_seller, status_seller")
    .eq("id_seller", m.id_seller)
    .maybeSingle();

  if (sellerError) {
    console.error("Gagal mengambil detail toko:", sellerError.message);
  } else {
    seller = sellerData;
  }
}
  const ada = tersedia(m);
  const rekomendasi = ada ? [] : await getRekomendasi(admin, m);

  const lokasi = m.lokasi || [m.kota, m.provinsi].filter(Boolean).join(", ");

  // Informasi yang belum terisi (user story 5.4: "Some information is unavailable")
  const hilang = [];
  if (!String(m.deskripsi_material || "").trim()) hilang.push("Description");
  if (m.stok === null || m.stok === undefined) hilang.push("Quantity");
  if (!String(m.kondisi_seller || "").trim()) hilang.push("Condition");
  if (m.harga === null || m.harga === undefined) hilang.push("Price");
  if (!lokasi) hilang.push("Location");

  const kosong = <span className="text-gray-400">Tidak tersedia</span>;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/marketplace"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-[#3f6a0b]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Material Catalog
        </Link>

        <h1 className="mb-4 text-2xl font-bold text-gray-800">Material Details</h1>

        <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:grid-cols-2">
          <div className="relative min-h-[260px]">
            <MaterialImage
              materialId={m.id_material}
              materialName={m.nama_material}
              category={m.kategori}
              imageUrl={m.foto_url || gambarKategori(m.kategori)}
              imageAlt={m.nama_material}
              className="h-full min-h-[260px] w-full"
            />
            <span className="absolute right-3 top-3 rounded-full bg-[#d9f99d] px-3 py-1 text-xs font-bold text-[#3f6212]">
              {m.kategori}
            </span>
          </div>

          <div className="flex flex-col p-6 sm:p-8">
            <h2 className="mb-4 text-xl font-bold text-gray-800">{m.nama_material}</h2>

            {!ada && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold text-red-700">Material is no longer available</p>
                <p className="mt-1 text-xs text-red-600">We recommend other available materials</p>
              </div>
            )}

            {hilang.length > 0 && (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">Some information is unavailable</p>
                <p className="mt-1 text-xs text-amber-700">Belum diisi: {hilang.join(", ")}</p>
              </div>
            )}

            <dl>
              <Baris label="Description">
                {String(m.deskripsi_material || "").trim() || kosong}
              </Baris>
              <Baris label="Quantity">
                {m.stok === null || m.stok === undefined
                  ? kosong
                  : `${angka.format(Number(m.stok))} ${m.satuan || ""}`}
              </Baris>
              <Baris label="Condition">
                {String(m.kondisi_seller || "").trim() || kosong}
              </Baris>
              <Baris label="Price">
                {m.harga === null || m.harga === undefined
                  ? kosong
                  : `${rupiah(m.harga)}/${m.satuan || ""}`}
              </Baris>
              <Baris label="Location">{lokasi || kosong}</Baris>
            </dl>

            {ada && <MaterialOrderPanel material={m} />}

            <p className="mt-6 text-xs text-gray-400">
              Info material berasal dari katalog CIRCLO. Verifikasi harga dan stok sebelum transaksi.
            </p>
          </div>
        </div>
        {/* DETAIL TOKO */}
        {seller && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">
                {/* Ikon Toko */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-green-100 text-[#3f6a0b]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 10h18" />
                    <path d="M5 10V21h14V10" />
                    <path d="M4 3h16l2 7H2l2-7Z" />
                    <path d="M9 21v-7h6v7" />
                  </svg>
                </div>

                {/* Informasi Toko */}
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Dijual oleh
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-gray-800">
                    {seller.nama_seller}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {lokasi || "Lokasi belum tersedia"}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {seller.status_seller
                      ? "Toko aktif"
                      : "Status toko tidak aktif"}
                  </p>
                </div>
              </div>

              {/* Tombol Kunjungi Toko */}
              <Link
                href={`/toko/${seller.id_seller}?from=${m.id_material}`}
                className="inline-flex items-center justify-center rounded-lg border border-[#3f6a0b] px-5 py-3 text-sm font-semibold text-[#3f6a0b] transition hover:bg-green-50"
              >
                Kunjungi Toko
              </Link>

            </div>
          </section>
        )}
        {rekomendasi.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-gray-800">Material lain yang tersedia</h2>
            <ul className="mt-3 grid gap-4 sm:grid-cols-3">
              {rekomendasi.map((r) => (
                <li key={r.id_material}>
                  <Link
                    href={`/katalog/${r.id_material}`}
                    className="block h-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <p className="text-xs font-semibold text-[#3f6212]">{r.kategori}</p>
                    <p className="mt-1 text-sm font-bold text-gray-800">{r.nama_material}</p>
                    <p className="mt-2 text-sm font-bold text-[#3f6a0b]">
                      {rupiah(r.harga)}/{r.satuan}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Stok {angka.format(Number(r.stok))} {r.satuan}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}