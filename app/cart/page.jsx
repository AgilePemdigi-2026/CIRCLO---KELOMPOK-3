
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Package,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  MapPin,
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  X,
  CheckCircle2,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import MaterialImage from "@/components/MaterialImage";
import { getAccessToken } from "@/lib/auth";

const rupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const isAvailable = (item) => {
  const stok = Number(item.stok);
  const jumlah = Number(item.kuantitas);

  return (
    item.status_material === true &&
    Number.isSafeInteger(jumlah) &&
    jumlah >= 1 &&
    jumlah <= stok &&
    Number.isFinite(Number(item.harga))
  );
};

const checkoutLink = (item) => ({
  pathname: "/checkout",
  query: {
    id: item.id_material,
    nama: item.nama_material || "Material",
    harga: item.harga,
    stok: item.stok,
    satuan: item.satuan || "unit",
    jumlah: item.kuantitas,
  },
});

export default function CartPage() {
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // AMBIL DATA KERANJANG
  const loadCart = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error("Silakan login sebagai Buyer.");
      }

      const response = await fetch("/api/cart", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal memuat keranjang."
        );
      }

      const data = Array.isArray(result.items)
        ? result.items
        : [];

      setItems(data);

      // Pertahankan centang yang masih valid
      setSelectedIds((prev) =>
        prev.filter((id) =>
          data.some(
            (item) =>
              item.id_keranjang === id &&
              isAvailable(item)
          )
        )
      );
    } catch (err) {
      setError(err.message || "Gagal memuat keranjang.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // PILIH SATU MATERIAL
  const toggleItem = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((value) => value !== id)
        : [...prev, id]
    );
  };

  // PILIH SEMUA MATERIAL TERSEDIA
  const availableItems = items.filter(isAvailable);
  const availableIds = availableItems.map(
    (item) => item.id_keranjang
  );

  const allSelected =
    availableIds.length > 0 &&
    availableIds.every((id) => selectedIds.includes(id));

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : availableIds);
  };

  // MATERIAL YANG DICENTANG
  const selectedItems = items.filter(
    (item) =>
      selectedIds.includes(item.id_keranjang) &&
      isAvailable(item)
  );

  const jumlahTerpilih = selectedItems.length;

  const totalHarga = selectedItems.reduce(
    (total, item) =>
      total +
      Number(item.harga || 0) *
        Number(item.kuantitas || 0),
    0
  );

  // UBAH JUMLAH MATERIAL
  const ubahJumlah = async (item, jumlahBaru) => {
    const stok = Number(item.stok);

    if (updatingId !== null || deletingId !== null) {
      return;
    }

    if (
      !Number.isSafeInteger(jumlahBaru) ||
      jumlahBaru < 1 ||
      jumlahBaru > stok
    ) {
      setError(
        `Jumlah harus antara 1 sampai ${stok} ${
          item.satuan || "unit"
        }.`
      );
      return;
    }

    setUpdatingId(item.id_keranjang);
    setError("");
    setSuccess("");

    try {
      const token = await getAccessToken();

      if (!token) throw new Error("Silakan login.");

      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_keranjang: item.id_keranjang,
          jumlah: jumlahBaru,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Gagal mengubah jumlah."
        );
      }

      setItems((prev) =>
        prev.map((produk) =>
          produk.id_keranjang === item.id_keranjang
            ? {
                ...produk,
                kuantitas: Number(result.jumlah),
              }
            : produk
        )
      );
    } catch (err) {
      setError(err.message || "Gagal mengubah jumlah.");
    } finally {
      setUpdatingId(null);
    }
  };

  // HAPUS MATERIAL
  const hapusMaterial = async () => {
    if (
      !selectedItem ||
      deletingId !== null ||
      updatingId !== null
    ) {
      return;
    }

    const id = selectedItem.id_keranjang;

    setDeletingId(id);
    setError("");
    setSuccess("");

    try {
      const token = await getAccessToken();

      if (!token) throw new Error("Silakan login.");

      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_keranjang: id,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Gagal menghapus material."
        );
      }

      setItems((prev) =>
        prev.filter((item) => item.id_keranjang !== id)
      );

      setSelectedIds((prev) =>
        prev.filter((value) => value !== id)
      );

      setSelectedItem(null);
      setSuccess("Material berhasil dihapus dari keranjang.");
    } catch (err) {
      setError(err.message || "Gagal menghapus material.");
    } finally {
      setDeletingId(null);
    }
  };

  const isBusy =
    loading ||
    updatingId !== null ||
    deletingId !== null;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#f5f8f2] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          {/* KEMBALI */}
          <Link
            href="/marketplace"
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#3f6a0b]"
          >
            <ArrowLeft size={17} />
            Kembali ke Material Catalog
          </Link>

          {/* HEADER */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <ShoppingCart
                  size={30}
                  className="text-[#3f6a0b]"
                />
                <h1 className="text-3xl font-bold text-gray-900">
                  Keranjang Saya
                </h1>
              </div>

              <p className="mt-2 text-sm text-gray-500">
                Pilih material yang ingin dibeli sebelum
                melanjutkan checkout.
              </p>
            </div>

            <button
              type="button"
              onClick={loadCart}
              disabled={isBusy}
              className="flex items-center gap-2 rounded-lg border border-[#3f6a0b] px-4 py-2 text-sm font-semibold text-[#3f6a0b] hover:bg-green-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {/* NOTIFIKASI */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}

          {/* LOADING */}
          {loading ? (
            <div className="rounded-2xl bg-white p-12 text-center">
              <Loader2
                size={32}
                className="mx-auto animate-spin text-[#3f6a0b]"
              />
              <p className="mt-4 text-gray-500">
                Memuat keranjang...
              </p>
            </div>
          ) : items.length === 0 ? (
            /* KERANJANG KOSONG */
            <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm">
              <ShoppingCart
                size={45}
                className="mx-auto text-[#3f6a0b]"
              />
              <h2 className="mt-5 text-xl font-bold">
                Keranjang Masih Kosong
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Kamu belum menambahkan material.
              </p>
              <Link
                href="/marketplace"
                className="mt-6 inline-block rounded-xl bg-[#3f6a0b] px-6 py-3 text-sm font-semibold text-white"
              >
                Cari Material
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              {/* DAFTAR MATERIAL */}
              <section className="space-y-4">
                {/* PILIH SEMUA */}
                <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-sm">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={
                      isBusy || availableIds.length === 0
                    }
                    aria-label="Pilih semua material tersedia"
                    className="h-5 w-5 cursor-pointer accent-[#3f6a0b]"
                  />

                  <label className="text-sm font-semibold text-gray-800">
                    Pilih Semua ({availableItems.length})
                  </label>

                  <span className="ml-auto text-xs text-gray-500">
                    {items.length} Material
                  </span>
                </div>

                {items.map((item) => {
                  const kuantitas = Number(
                    item.kuantitas || 0
                  );

                  const harga = Number(item.harga || 0);
                  const stok = Number(item.stok || 0);
                  const satuan = item.satuan || "unit";
                  const subtotal = harga * kuantitas;

                  const tersedia = isAvailable(item);

                  const checked = selectedIds.includes(
                    item.id_keranjang
                  );

                  const sedangUpdate =
                    updatingId === item.id_keranjang;

                  return (
                    <article
                      key={item.id_keranjang}
                      className={`rounded-2xl border bg-white p-5 shadow-sm ${
                        checked
                          ? "border-[#9dc174]"
                          : "border-gray-100"
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* CHECKBOX MATERIAL */}
                        <div className="pt-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!tersedia || isBusy}
                            onChange={() =>
                              toggleItem(item.id_keranjang)
                            }
                            aria-label={`Pilih ${item.nama_material}`}
                            className="h-5 w-5 cursor-pointer accent-[#3f6a0b] disabled:cursor-not-allowed"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-4 sm:flex-row">
                            {/* GAMBAR */}
                            <Link
                              href={`/katalog/${item.id_material}`}
                              className="shrink-0"
                            >
                              <div className="h-32 w-32 overflow-hidden rounded-xl bg-gray-50">
                                <MaterialImage
                                  materialId={item.id_material}
                                  materialName={item.nama_material}
                                  category={item.kategori}
                                  imageAlt={item.nama_material}
                                  className="h-full w-full"
                                />
                              </div>
                            </Link>

                            {/* INFO MATERIAL */}
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/katalog/${item.id_material}`}
                                className="font-bold text-gray-900 hover:text-[#3f6a0b]"
                              >
                                {item.nama_material || "Material"}
                              </Link>

                              <p className="mt-1 text-xs text-gray-500">
                                {item.kategori || "Material"}
                              </p>

                              <p className="mt-3 text-lg font-bold text-[#3f6a0b]">
                                {rupiah(harga)}
                                <span className="text-xs font-normal text-gray-500">
                                  /{satuan}
                                </span>
                              </p>

                              {/* KUANTITAS */}
                              <div className="mt-4 flex flex-wrap items-center gap-3">
                                <span className="text-sm text-gray-600">
                                  Jumlah:
                                </span>

                                <div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      ubahJumlah(
                                        item,
                                        kuantitas - 1
                                      )
                                    }
                                    disabled={
                                      isBusy || kuantitas <= 1
                                    }
                                    aria-label="Kurangi jumlah"
                                    className="flex h-9 w-9 items-center justify-center hover:bg-gray-100 disabled:opacity-40"
                                  >
                                    <Minus size={16} />
                                  </button>

                                  <span className="flex h-9 min-w-12 items-center justify-center border-x border-gray-200 text-sm font-semibold">
                                    {sedangUpdate ? (
                                      <Loader2
                                        size={16}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      kuantitas
                                    )}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      ubahJumlah(
                                        item,
                                        kuantitas + 1
                                      )
                                    }
                                    disabled={
                                      isBusy ||
                                      kuantitas >= stok ||
                                      item.status_material === false
                                    }
                                    aria-label="Tambah jumlah"
                                    className="flex h-9 w-9 items-center justify-center hover:bg-gray-100 disabled:opacity-40"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>

                                <span className="text-sm text-gray-500">
                                  {satuan}
                                </span>
                              </div>

                              {/* STOK & LOKASI */}
                              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Package size={15} />
                                  Stok: {stok} {satuan}
                                </span>

                                {item.lokasi && (
                                  <span className="flex items-center gap-1">
                                    <MapPin size={15} />
                                    {item.lokasi}
                                  </span>
                                )}
                              </div>

                              {!tersedia && (
                                <p className="mt-2 text-xs text-red-600">
                                  Material tidak tersedia atau
                                  jumlah melebihi stok.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SUBTOTAL DAN TOMBOL */}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
                        <div>
                          <p className="text-xs text-gray-500">
                            Subtotal Material
                          </p>
                          <p className="mt-1 text-lg font-bold text-[#3f6a0b]">
                            {rupiah(subtotal)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setError("");
                              setSuccess("");
                              setSelectedItem(item);
                            }}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 size={17} />
                            Hapus
                          </button>

                          {tersedia && (
                            <Link
                              href={checkoutLink(item)}
                              aria-disabled={isBusy}
                              className={`inline-flex items-center gap-2 rounded-lg bg-[#3f6a0b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#345609] ${
                                isBusy
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }`}
                            >
                              <ShoppingBag size={17} />
                              Checkout
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

              {/* RINGKASAN PILIHAN */}
              <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">
                  Ringkasan Keranjang
                </h2>

                <div className="mt-6 space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Total Material
                    </span>
                    <strong>{items.length}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Material Dipilih
                    </span>
                    <strong>{jumlahTerpilih}</strong>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <span className="font-semibold">
                      Total Terpilih
                    </span>
                    <span className="text-xl font-bold text-[#3f6a0b]">
                      {rupiah(totalHarga)}
                    </span>
                  </div>
                </div>

                <p className="mt-5 text-xs leading-relaxed text-gray-500">
                  Total dihitung dari material yang dicentang.
                  Harga dan stok diverifikasi kembali saat checkout.
                </p>

                
{/* CHECKOUT MATERIAL DIPILIH */}
{jumlahTerpilih > 0 ? (
  <Link
    href={
      jumlahTerpilih === 1
        ? checkoutLink(selectedItems[0])
        : `/checkout/cart?ids=${selectedItems
            .map((item) => item.id_keranjang)
            .join(",")}`
    }
    className={`mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#3f6a0b] px-4 py-3 text-sm font-semibold text-white hover:bg-[#345609] ${
      isBusy ? "pointer-events-none opacity-50" : ""
    }`}
  >
    <ShoppingBag size={18} />
    Checkout ({jumlahTerpilih})
  </Link>
) : (
  <button
    type="button"
    disabled
    className="mt-6 w-full rounded-xl bg-gray-200 px-4 py-3 text-sm font-semibold text-gray-500"
  >
    Checkout (0)
  </button>
)}

{jumlahTerpilih === 0 && (
  <p className="mt-2 text-center text-xs text-gray-500">
    Pilih material yang ingin kamu checkout.
  </p>
)}


                <Link
                  href="/marketplace"
                  className="mt-4 flex items-center justify-center rounded-xl border border-[#3f6a0b] px-4 py-3 text-sm font-semibold text-[#3f6a0b] hover:bg-green-50"
                >
                  Lanjut Belanja
                </Link>
              </aside>
            </div>
          )}
        </div>
      </main>

      {/* POPUP KONFIRMASI HAPUS */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-cart-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 size={26} />
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                disabled={deletingId !== null}
                aria-label="Tutup"
                className="p-2 text-gray-400 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <h2
              id="delete-cart-title"
              className="mt-5 text-xl font-bold text-gray-900"
            >
              Hapus Material?
            </h2>

            <p className="mt-3 text-sm text-gray-600">
              Yakin ingin menghapus{" "}
              <strong>
                {selectedItem.nama_material || "material ini"}
              </strong>{" "}
              dari keranjang?
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Produk asli di katalog tidak akan dihapus.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                disabled={deletingId !== null}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={hapusMaterial}
                disabled={deletingId !== null}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deletingId !== null ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={17} />
                    Ya, Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
