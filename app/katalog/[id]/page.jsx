import Link from "next/link";
import { notFound } from "next/navigation";

const AI_URL = process.env.CIRCLO_AI_URL || "http://127.0.0.1:8000";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

async function getMaterial(id) {
  try {
    const res = await fetch(`${AI_URL}/material/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function MaterialDetailPage({ params }) {
  const m = await getMaterial(params.id);
  if (!m) notFound();

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/cari-material"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#3f6a0b] mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Kembali ke Cari Material
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <div className="relative bg-[#e5f0f8] flex items-center justify-center min-h-[260px]">
          <svg className="w-20 h-20 text-[#4d7c0f]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          <span className="absolute top-3 right-3 bg-[#d9f99d] text-[#3f6212] text-xs font-bold px-3 py-1 rounded-full">
            {m.kategori}
          </span>
        </div>

        <div className="p-6 sm:p-8 flex flex-col">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{m.nama_material}</h1>
          <p className="text-sm text-gray-500 mb-4">
            {m.kota}{m.provinsi ? `, ${m.provinsi}` : ""}
          </p>

          <div className="text-2xl font-bold text-[#3f6a0b] mb-4">
            {rupiah.format(Number(m.harga))}
            <span className="text-base font-normal text-gray-500">/{m.satuan}</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-md border border-gray-200">
              Stok {angka.format(Number(m.stok))} {m.satuan}
            </span>
            {m.id_seller && (
              <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-md border border-gray-200">
                Penjual #{m.id_seller}
              </span>
            )}
          </div>

          {m.deskripsi_material && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-800 mb-1">Deskripsi</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{m.deskripsi_material}</p>
            </div>
          )}

          <div className="mt-auto">
            <p className="text-xs text-gray-400">
              Info material berasal dari katalog CIRCLO. Verifikasi harga dan stok sebelum transaksi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
