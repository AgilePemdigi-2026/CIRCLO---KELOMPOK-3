
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  ShoppingCart,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Minus,
  Plus,
  X,
  Package,
} from "lucide-react";
import { getAccessToken } from "@/lib/auth";

const rupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export default function MaterialOrderPanel({ material }) {
  const [openCart, setOpenCart] = useState(false);
  const [jumlah, setJumlah] = useState(1);
  const [loadingCart, setLoadingCart] = useState(false);
  const [pesan, setPesan] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const stok = Number(material?.stok || 0);
  const harga = Number(material?.harga);
  const satuan = material?.satuan || "unit";

  const bisaCheckout =
    material?.id_material != null &&
    Number.isFinite(stok) &&
    stok > 0 &&
    Number.isFinite(harga) &&
    harga >= 0;

  const jumlahAngka = Number(jumlah);

  const jumlahValid =
    Number.isSafeInteger(jumlahAngka) &&
    jumlahAngka >= 1 &&
    jumlahAngka <= stok &&
    jumlah !== "";

  const subtotal = jumlahValid
    ? jumlahAngka * harga
    : 0;

  const checkoutUrl = {
    pathname: "/checkout",
    query: {
      id: material?.id_material,
      nama: material?.nama_material || "Material",
      harga,
      stok,
      satuan,
    },
  };

  // Menutup popup menggunakan Escape
  useEffect(() => {
    if (!openCart || loadingCart) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenCart(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openCart, loadingCart]);

  const bukaKeranjang = () => {
    if (!bisaCheckout) return;

    setJumlah(1);
    setError("");
    setPesan("");
    setModalError("");
    setOpenCart(true);
  };

  const tutupKeranjang = () => {
    if (loadingCart) return;

    setOpenCart(false);
    setModalError("");
  };

  const tambahJumlah = () => {
    setJumlah((prev) => {
      const current = Number(prev) || 0;
      return Math.min(stok, current + 1);
    });

    setModalError("");
  };

  const kurangJumlah = () => {
    setJumlah((prev) => {
      const current = Number(prev) || 1;
      return Math.max(1, current - 1);
    });

    setModalError("");
  };

  const handleJumlahChange = (event) => {
    const value = event.target.value;

    // Hanya menerima angka
    if (!/^\d*$/.test(value)) return;

    if (value === "") {
      setJumlah("");
    } else {
      setJumlah(Number(value));
    }

    setModalError("");
  };

  // Menambahkan material ke Supabase
  const handleAddToCart = async () => {
    if (loadingCart) return;

    if (!jumlahValid) {
      setModalError(
        `Jumlah harus antara 1 sampai ${stok} ${satuan}.`
      );
      return;
    }

    setLoadingCart(true);
    setModalError("");
    setPesan("");
    setError("");

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error(
          "Silakan login menggunakan akun Buyer terlebih dahulu."
        );
      }

      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_material: material.id_material,
          jumlah: jumlahAngka,
        }),
      });

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Gagal menambahkan material ke keranjang."
        );
      }

      setOpenCart(false);
      setJumlah(1);

      setPesan(
        `${jumlahAngka} ${satuan} ${material.nama_material} berhasil ditambahkan ke keranjang!`
      );
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menambahkan keranjang."
      );
    } finally {
      setLoadingCart(false);
    }
  };

  return (
    <div className="mt-6 space-y-3">
      {/* TIGA TOMBOL DETAIL MATERIAL */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* CHAT */}
        <button
          type="button"
          disabled
          title="Fitur chat toko akan segera tersedia"
          className="flex items-center justify-center gap-2 rounded-lg border border-[#3f6a0b] bg-white px-2 py-3 text-xs font-semibold text-[#3f6a0b] opacity-60 sm:text-sm"
        >
          <MessageCircle size={18} />
          Chat
        </button>

        {/* KERANJANG */}
        <button
          type="button"
          onClick={bukaKeranjang}
          disabled={!bisaCheckout || loadingCart}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#3f6a0b] bg-white px-2 py-3 text-xs font-semibold text-[#3f6a0b] transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
        >
          <ShoppingCart size={18} />
          Keranjang
        </button>

        {/* CHECKOUT */}
        {bisaCheckout ? (
          <Link
            href={checkoutUrl}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#3f6a0b] px-2 py-3 text-xs font-semibold text-white transition hover:bg-[#345609] sm:text-sm"
          >
            <ShoppingBag size={18} />
            Checkout
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-300 px-2 py-3 text-xs font-semibold text-gray-600 sm:text-sm"
          >
            <ShoppingBag size={18} />
            Stok Habis
          </button>
        )}
      </div>

      {/* NOTIFIKASI SUKSES */}
      {pesan && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{pesan}</span>
        </div>
      )}

      {/* NOTIFIKASI ERROR */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* POPUP PILIH JUMLAH KERANJANG */}
      {openCart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              tutupKeranjang();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-modal-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
          >
            {/* HEADER POPUP */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-green-100 p-3 text-[#3f6a0b]">
                  <ShoppingCart size={24} />
                </div>

                <div>
                  <h2
                    id="cart-modal-title"
                    className="text-lg font-bold text-gray-900"
                  >
                    Tambah ke Keranjang
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Tentukan jumlah material yang ingin dibeli.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={tutupKeranjang}
                disabled={loadingCart}
                aria-label="Tutup popup"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* INFO MATERIAL */}
            <div className="mt-6 rounded-xl border border-gray-100 bg-[#f7faf5] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-[#3f6a0b]">
                  <Package size={23} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {material?.nama_material || "Material"}
                  </h3>

                  <p className="mt-1 text-sm font-bold text-[#3f6a0b]">
                    {rupiah(harga)}/{satuan}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Stok tersedia: {stok} {satuan}
                  </p>
                </div>
              </div>
            </div>

            {/* PILIH JUMLAH */}
            <div className="mt-6">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="jumlah-keranjang"
                  className="text-sm font-semibold text-gray-800"
                >
                  Jumlah Material
                </label>

                <span className="text-xs text-gray-500">
                  Maks. {stok} {satuan}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center overflow-hidden rounded-xl border border-gray-300">
                  <button
                    type="button"
                    onClick={kurangJumlah}
                    disabled={
                      loadingCart ||
                      jumlahAngka <= 1
                    }
                    aria-label="Kurangi jumlah"
                    className="flex h-11 w-11 items-center justify-center text-gray-700 transition hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Minus size={18} />
                  </button>

                  <input
                    id="jumlah-keranjang"
                    type="text"
                    inputMode="numeric"
                    value={jumlah}
                    onChange={handleJumlahChange}
                    disabled={loadingCart}
                    className="h-11 w-20 border-x border-gray-200 bg-white text-center text-sm font-semibold text-gray-900 outline-none"
                  />

                  <button
                    type="button"
                    onClick={tambahJumlah}
                    disabled={
                      loadingCart ||
                      jumlahAngka >= stok
                    }
                    aria-label="Tambah jumlah"
                    className="flex h-11 w-11 items-center justify-center text-gray-700 transition hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <span className="text-sm font-medium text-gray-600">
                  {satuan}
                </span>
              </div>

              {!jumlahValid && (
                <p className="mt-2 text-xs text-red-600">
                  Masukkan jumlah antara 1 hingga {stok} {satuan}.
                </p>
              )}
            </div>

            {/* SUBTOTAL */}
            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
              <span className="text-sm text-gray-600">
                Subtotal
              </span>

              <span className="text-xl font-bold text-[#3f6a0b]">
                {rupiah(subtotal)}
              </span>
            </div>

            {/* ERROR POPUP */}
            {modalError && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle
                  size={17}
                  className="mt-0.5 shrink-0"
                />
                <span>{modalError}</span>
              </div>
            )}

            {/* TOMBOL POPUP */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={tutupKeranjang}
                disabled={loadingCart}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!jumlahValid || loadingCart}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3f6a0b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#345609] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingCart ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={17} />
                    Masukkan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
