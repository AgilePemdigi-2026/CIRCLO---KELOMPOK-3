"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, Loader2, Minus, Plus, ShoppingBag, ShoppingCart, X } from "lucide-react";
import MaterialImage from "@/components/MaterialImage";
import { getAccessToken, useRole } from "@/lib/auth";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export default function MaterialCatalog() {
  const router = useRouter();
  const { role } = useRole();
  const isBuyer = role === "buyer";

  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState("");
  const [kota, setKota] = useState("");
  const [rows, setRows] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Popup untuk memilih jumlah sebelum Keranjang atau Checkout.
  const [pilihan, setPilihan] = useState(null);
  const [jumlah, setJumlah] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const submittingRef = useRef(false);

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

        const res = await fetch(`/api/katalog?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Katalog gagal dimuat.");
        if (batal) return;

        setRows(Array.isArray(json.rows) ? json.rows : []);
        if (!kategori && !q.trim() && !kota.trim() && Array.isArray(json.kategori)) {
          setKategoriList(json.kategori);
        }
      } catch (err) {
        if (!batal) {
          setError(err instanceof Error ? err.message : "Katalog gagal dimuat.");
        }
      } finally {
        if (!batal) setLoading(false);
      }
    }, 300);

    return () => {
      batal = true;
      clearTimeout(timer);
    };
  }, [q, kategori, kota]);

  useEffect(() => {
    if (!pilihan) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !submittingRef.current) {
        setPilihan(null);
        setActionError("");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [Boolean(pilihan)]);

  function bukaPopup(jenis, material) {
    if (material.tersedia === false || Number(material.stok) < 1) return;
    setPilihan({ jenis, material });
    setJumlah(1);
    setActionError("");
    setNotice("");
  }

  function tutupPopup() {
    if (submittingRef.current) return;
    setPilihan(null);
    setActionError("");
  }

  const stokPilihan = Math.floor(Number(pilihan?.material?.stok) || 0);
  const jumlahValid =
    Number.isSafeInteger(Number(jumlah)) &&
    Number(jumlah) >= 1 &&
    Number(jumlah) <= stokPilihan;

  async function lanjutkanAksi(event) {
    event.preventDefault();
    if (!pilihan || submittingRef.current) return;
    if (!jumlahValid) {
      setActionError(`Masukkan jumlah 1 sampai ${stokPilihan}.`);
      return;
    }

    const m = pilihan.material;
    const qty = Number(jumlah);
    setActionError("");

    if (pilihan.jenis === "checkout") {
      const params = new URLSearchParams({
        id: String(m.id_material),
        nama: String(m.nama_material || "Material"),
        harga: String(m.harga),
        stok: String(m.stok),
        satuan: String(m.satuan || "unit"),
        jumlah: String(qty),
      });
      setPilihan(null);
      router.push(`/checkout?${params.toString()}`);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Silakan login sebagai Buyer terlebih dahulu.");

      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_material: Number(m.id_material),
          kuantitas: qty,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.error || "Gagal menambahkan material ke keranjang.");
      }

      setPilihan(null);
      setNotice(`${m.nama_material} (${qty} ${m.satuan || "unit"}) berhasil ditambahkan ke keranjang.`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menambah ke keranjang."
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#3f6a0b] focus:ring-1 focus:ring-[#3f6a0b]";

  return (
    <section>
      <h1 className="text-2xl font-bold text-gray-800">Material Catalog</h1>
      <p className="mt-1 text-sm text-gray-500">
        Temukan material daur ulang yang tersedia. Cari dengan kata kunci, lalu filter berdasarkan kategori dan lokasi.
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
            <option key={k} value={k}>{k}</option>
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

      {notice && (
        <div role="status" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={18} /> {notice}
          </span>
          <div className="flex items-center gap-3">
            <Link href="/cart" className="font-bold underline hover:text-green-950">Lihat Keranjang</Link>
            <button type="button" onClick={() => setNotice("")} aria-label="Tutup notifikasi">
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}
      {!error && loading && (
        <p className="mt-6 text-sm text-gray-500">Memuat material...</p>
      )}
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
            {rows.map((m) => {
              const tersedia = m.tersedia !== false && Number(m.stok) >= 1;
              return (
                <li
                  key={m.id_material}
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* Hanya gambar dan info material yang menjadi link detail */}
                  <Link href={`/katalog/${m.id_material}`} className="block hover:opacity-95">
                    <div className="relative">
                      <MaterialImage
                        materialId={m.id_material}
                        materialName={m.nama_material}
                        category={m.kategori}
                        imageUrl={m.foto_url || undefined}
                        imageAlt={m.nama_material}
                        className="h-40 w-full"
                      />
                      <span className="absolute right-3 top-3 rounded-full bg-[#d9f99d] px-3 py-1 text-xs font-bold text-[#3f6212]">
                        {m.kategori}
                      </span>
                      {!tersedia && (
                        <span className="absolute left-3 top-3 rounded-full bg-gray-800 px-3 py-1 text-xs font-semibold text-white">
                          Tidak tersedia
                        </span>
                      )}
                    </div>
                    <div className="px-4 pb-3 pt-4">
                      <h2 className="text-sm font-bold text-gray-800">{m.nama_material}</h2>
                      <p className="mt-1 text-xs text-gray-500">
                        {m.kota}{m.provinsi ? `, ${m.provinsi}` : ""}
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

                  {/* Tiga aksi terpisah: Detail, Keranjang, dan Checkout */}
                  <div className="mt-auto space-y-2 px-4 pb-4 pt-2">
                    <Link
                      href={`/katalog/${m.id_material}`}
                      aria-label={`Lihat detail ${m.nama_material}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-700 transition hover:border-[#3f6a0b] hover:bg-green-50 hover:text-[#3f6a0b]"
                    >
                      <Eye size={16} /> Lihat Detail
                    </Link>

                    {isBuyer && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => bukaPopup("cart", m)}
                          disabled={!tersedia}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#3f6a0b] px-2 py-2.5 text-xs font-semibold text-[#3f6a0b] transition hover:bg-green-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                        >
                          <ShoppingCart size={16} /> Keranjang
                        </button>
                        <button
                          type="button"
                          onClick={() => bukaPopup("checkout", m)}
                          disabled={!tersedia}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#3f6a0b] px-2 py-2.5 text-xs font-semibold text-white transition hover:bg-[#345609] disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          <ShoppingBag size={16} /> Checkout
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* POPUP PILIH JUMLAH */}
      {pilihan && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-8"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) tutupPopup();
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-popup-title"
            onSubmit={lanjutkanAksi}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="catalog-popup-title" className="text-xl font-bold text-gray-900">
                  {pilihan.jenis === "cart" ? "Tambah ke Keranjang" : "Checkout Material"}
                </h2>
                <p className="mt-2 text-sm text-gray-500">{pilihan.material.nama_material}</p>
              </div>
              <button
                type="button"
                onClick={tutupPopup}
                disabled={submitting}
                aria-label="Tutup popup"
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-[#f5f8f2] p-4">
              <p className="text-sm text-gray-600">
                Harga: <strong className="text-[#3f6a0b]">{rupiah.format(Number(pilihan.material.harga))}</strong>/{pilihan.material.satuan || "unit"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Stok tersedia: {angka.format(Number(pilihan.material.stok))} {pilihan.material.satuan || "unit"}
              </p>

              <label htmlFor="jumlah-katalog" className="mt-5 block text-sm font-semibold text-gray-800">
                Jumlah yang ingin dibeli
              </label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white">
                  <button
                    type="button"
                    onClick={() => setJumlah((v) => Math.max(1, Number(v) - 1 || 1))}
                    disabled={submitting || Number(jumlah) <= 1}
                    aria-label="Kurangi jumlah"
                    className="p-3 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Minus size={17} />
                  </button>
                  <input
                    id="jumlah-katalog"
                    type="number"
                    min={1}
                    max={stokPilihan}
                    step={1}
                    value={jumlah}
                    onChange={(e) => setJumlah(e.target.value)}
                    disabled={submitting}
                    className="w-20 border-x border-gray-300 py-2 text-center text-sm font-semibold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setJumlah((v) => Math.min(stokPilihan, Number(v) + 1 || 1))}
                    disabled={submitting || Number(jumlah) >= stokPilihan}
                    aria-label="Tambah jumlah"
                    className="p-3 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Plus size={17} />
                  </button>
                </div>
                <span className="text-sm text-gray-500">{pilihan.material.satuan || "unit"}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 text-sm">
                <span className="font-semibold text-gray-700">Subtotal</span>
                <strong className="text-lg text-[#3f6a0b]">
                  {rupiah.format(jumlahValid ? Number(pilihan.material.harga) * Number(jumlah) : 0)}
                </strong>
              </div>
            </div>

            {actionError && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {actionError}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={tutupPopup}
                disabled={submitting}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || !jumlahValid}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#3f6a0b] px-4 py-3 text-sm font-semibold text-white hover:bg-[#345609] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <><Loader2 size={17} className="animate-spin" /> Memproses...</>
                ) : pilihan.jenis === "cart" ? (
                  "Tambah ke Keranjang"
                ) : (
                  "Lanjut Checkout"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
