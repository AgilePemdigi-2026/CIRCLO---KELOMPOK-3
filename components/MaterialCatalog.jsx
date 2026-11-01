"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MaterialImage from "@/components/MaterialImage";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

const KATEGORI_GAMBAR = [
  "kaca", "karet", "kayu", "kertas", "kulit", "logam",
  "organik", "plastik", "spanduk", "tekstil",
];

// Ilustrasi per kategori, sama seperti yang dipakai halaman detail
function gambarKategori(kategori) {
  const slug = String(kategori || "").toLowerCase();
  return `/images/materials/${KATEGORI_GAMBAR.includes(slug) ? slug : "lainnya"}.svg`;
}

export default function MaterialCatalog() {
  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState("");
  const [kota, setKota] = useState("");

  const [rows, setRows] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let batal = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (kategori) params.set("kategori", kategori);
        if (kota.trim()) params.set("kota", kota.trim());

        const res = await fetch(`/api/katalog?${params.toString()}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Katalog gagal dimuat.");
        if (batal) return;

        setRows(json.rows || []);
        // Daftar kategori hanya diperbarui saat belum ada filter, supaya pilihan tidak menyempit
           if (!kategori && !q.trim() && !kota.trim() && json.kategori) setKategoriList(json.kategori);
      } catch (err) {
        if (!batal) setError(err.message || "Katalog gagal dimuat.");
      } finally {
        if (!batal) setLoading(false);
      }
    }, 300);

    return () => {
      batal = true;
      clearTimeout(timer);
    };
  }, [q, kategori, kota]);

  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#3f6a0b] focus:ring-1 focus:ring-[#3f6a0b]";

  return (
    <section>
      <h1 className="text-2xl font-bold text-gray-800">Material Catalog</h1>
      <p className="mt-1 text-sm text-gray-500">
        Temukan material daur ulang yang tersedia. Cari dengan kata kunci, lalu filter berdasarkan
        kategori dan lokasi.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari material, misalnya kain katun"
          aria-label="Kata Kunci"
          className={inputClass}
        />
        <select
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          aria-label="Kategori"
          className={inputClass}
        >
          <option value="">Semua kategori</option>
          {kategoriList.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={kota}
          onChange={(e) => setKota(e.target.value)}
          placeholder="Lokasi, misalnya Surabaya"
          aria-label="Lokasi"
          className={inputClass}
        />
      </div>

      {error && (
        <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {!error && loading && <p className="mt-6 text-sm text-gray-500">Memuat material...</p>}

      {!error && !loading && rows.length === 0 && (
        <div className="mt-6 rounded-md border border-gray-200 bg-white px-4 py-6 text-center">
          <p className="font-semibold text-gray-800">Material yang sesuai belum ditemukan</p>
          <p className="mt-1 text-sm text-gray-500">
            Coba ubah kata kunci atau filter, atau cari material alternatif.
          </p>
        </div>
      )}

      {!error && !loading && rows.length > 0 && (
        <>
          <p className="mt-6 text-xs text-gray-500">Menampilkan {rows.length} material</p>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((m) => (
              <li key={m.id_material}>
                <Link
                  href={`/katalog/${m.id_material}`}
                  className="block h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative">
                    <MaterialImage
                      materialId={m.id_material}
                      materialName={m.nama_material}
                      category={m.kategori}
                      imageUrl={m.foto_url || gambarKategori(m.kategori)}
                      imageAlt={m.nama_material}
                      className="h-40 w-full"
                    />
                    <span className="absolute right-3 top-3 rounded-full bg-[#d9f99d] px-3 py-1 text-xs font-bold text-[#3f6212]">
                      {m.kategori}
                    </span>
                    {!m.tersedia && (
                      <span className="absolute left-3 top-3 rounded-full bg-gray-800 px-3 py-1 text-xs font-semibold text-white">
                        Tidak tersedia
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <h2 className="text-sm font-bold text-gray-800">{m.nama_material}</h2>
                    <p className="mt-1 text-xs text-gray-500">
                      {m.kota}
                      {m.provinsi ? `, ${m.provinsi}` : ""}
                    </p>
                    <p className="mt-3 text-lg font-bold text-[#3f6a0b]">
                      {rupiah.format(Number(m.harga))}
                      <span className="text-sm font-normal text-gray-500">/{m.satuan}</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Stok {angka.format(Number(m.stok))} {m.satuan}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}