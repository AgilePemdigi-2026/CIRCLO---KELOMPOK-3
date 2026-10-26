"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAccessToken } from "@/lib/auth";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export default function OrderModal({ material, onClose, onSuccess }) {
  const stock = Number(material?.stok || 0);
  const price = Number(material?.harga || 0);
  const satuan = material?.satuan || "unit";
  const [qty, setQty] = useState(1);
  const [metode, setMetode] = useState("Ambil di tempat");
  const [alamat, setAlamat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const total = useMemo(() => Math.max(0, Number(qty) || 0) * price, [qty, price]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !loading) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [loading, onClose]);

  if (!material) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError(null);

    const jumlah = Number(qty);
    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      setError("Jumlah harus lebih dari 0.");
      return;
    }
    if (jumlah > stock) {
      setError(`Stok tersedia hanya ${angka.format(stock)} ${satuan}.`);
      return;
    }
    if (metode === "Dikirim" && !alamat.trim()) {
      setError("Alamat pengiriman wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Silakan login terlebih dahulu untuk membuat pesanan.");
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_material: material.id_material,
          kuantitas: jumlah,
          metode_kirim: metode,
          alamat: alamat.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Gagal membuat pesanan.");
      }

      setResult(data);
      onSuccess?.(data);
    } catch (err) {
      setError(err?.message || "Gagal membuat pesanan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose?.();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#4d7c0f]">
              Konfirmasi pesanan
            </p>
            <h2 id="order-title" className="mt-1 text-lg font-bold text-gray-900">
              {material.nama_material}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {material.kota}
              {material.provinsi ? `, ${material.provinsi}` : ""} · stok{" "}
              {angka.format(stock)} {satuan}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Tutup"
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {result ? (
          <div className="p-5">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <p className="font-semibold">Pesanan berhasil dibuat.</p>
              <p className="mt-1">
                Nomor pesanan #{result.id_pesanan}. Total estimasi{" "}
                {rupiah.format(Number(result.total_estimasi || total))}, belum termasuk ongkir.
              </p>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Tutup
              </button>
              <Link
                href="/orders"
                className="rounded-lg bg-[#3f6a0b] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-[#345609]"
              >
                Lihat pesanan
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Jumlah ({satuan})</span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  max={stock}
                  value={qty}
                  onChange={(event) => setQty(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#3f6a0b] focus:ring-2 focus:ring-[#3f6a0b]/20"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Metode pengiriman</span>
                <select
                  value={metode}
                  onChange={(event) => setMetode(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-[#3f6a0b] focus:ring-2 focus:ring-[#3f6a0b]/20"
                >
                  <option>Ambil di tempat</option>
                  <option>Dikirim</option>
                </select>
              </label>
            </div>

            {metode === "Dikirim" && (
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Alamat pengiriman</span>
                <textarea
                  value={alamat}
                  onChange={(event) => setAlamat(event.target.value)}
                  rows={3}
                  placeholder="Nama penerima, alamat lengkap, kode pos"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#3f6a0b] focus:ring-2 focus:ring-[#3f6a0b]/20"
                />
              </label>
            )}

            <div className="rounded-xl bg-gray-50 p-4 text-sm">
              <div className="flex items-center justify-between text-gray-600">
                <span>
                  {rupiah.format(price)} / {satuan}
                </span>
                <span>× {angka.format(Number(qty) || 0)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 font-bold text-gray-900">
                <span>Total estimasi</span>
                <span>{rupiah.format(total)}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Belum termasuk ongkir.</p>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || stock <= 0}
                className="rounded-lg bg-[#3f6a0b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#345609] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Membuat pesanan..." : "Konfirmasi pesanan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
