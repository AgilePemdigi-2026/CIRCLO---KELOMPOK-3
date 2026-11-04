
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, PackageSearch } from "lucide-react";

import Navbar from "@/components/Navbar";
import { getAccessToken, useRole } from "@/lib/auth";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const angka = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

// DAFTAR FILTER STATUS PESANAN
const FILTER_STATUS = [
  "Semua",
  "Menunggu",
  "Dikonfirmasi",
  "Disalurkan",
  "Selesai",
  "Dibatalkan",
  "Ditolak",
];

// FORMAT TANGGAL
function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

// MENGELOMPOKKAN STATUS DARI DATABASE
function kategoriStatus(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  if (value.includes("batal")) {
    return "Dibatalkan";
  }

  if (value.includes("tolak")) {
    return "Ditolak";
  }

  if (
    value.includes("selesai") ||
    value.includes("diterima")
  ) {
    return "Selesai";
  }

  if (
    value.includes("salur") ||
    value.includes("dikirim") ||
    value.includes("siap")
  ) {
    return "Disalurkan";
  }

  if (
    value.includes("dikonfirmasi") ||
    value.includes("diproses") ||
    value.includes("dalam proses")
  ) {
    return "Dikonfirmasi";
  }

  return "Menunggu";
}

// WARNA BADGE STATUS PESANAN
function statusStyle(status) {
  const kategori = kategoriStatus(status);

  switch (kategori) {
    case "Dibatalkan":
      return "bg-red-50 text-red-700 border-red-200";

    case "Ditolak":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "Selesai":
      return "bg-green-50 text-green-700 border-green-200";

    case "Disalurkan":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "Dikonfirmasi":
      return "bg-sky-50 text-sky-700 border-sky-200";

    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

export default function OrdersPage() {
  const { role } = useRole();

  const [state, setState] = useState({
    loading: true,
    error: null,
    orders: [],
    role: null,
  });

  const [needsLogin, setNeedsLogin] = useState(false);

  // FILTER YANG SEDANG DIPILIH
  const [filterStatus, setFilterStatus] = useState("Semua");

  // MENGAMBIL DATA PESANAN
  const load = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const token = await getAccessToken();

      if (!token) {
        setNeedsLogin(true);

        setState({
          loading: false,
          error: null,
          orders: [],
          role: null,
        });

        return;
      }

      const response = await fetch("/api/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error || "Gagal memuat pesanan."
        );
      }

      setNeedsLogin(false);

      setState({
        loading: false,
        error: null,
        orders: Array.isArray(data.orders)
          ? data.orders
          : [],
        role: data.role || null,
      });
    } catch (err) {
      setState({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Gagal memuat pesanan.",
        orders: [],
        role: null,
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // DATA PESANAN YANG SESUAI FILTER
  const filteredOrders =
    filterStatus === "Semua"
      ? state.orders
      : state.orders.filter(
          (order) =>
            kategoriStatus(order.status_pesanan) ===
            filterStatus
        );

  // MENGHITUNG JUMLAH PESANAN SETIAP STATUS
  const jumlahStatus = (status) => {
    if (status === "Semua") {
      return state.orders.length;
    }

    return state.orders.filter(
      (order) =>
        kategoriStatus(order.status_pesanan) === status
    ).length;
  };

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER HALAMAN */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {state.role === "seller"
                ? "Pesanan Masuk"
                : "Daftar Pesanan"}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {state.role === "seller"
                ? "Pesanan yang berisi material milikmu."
                : "Pantau status pesanan material yang sudah dibuat."}
            </p>
          </div>

          {/* TOMBOL MUAT ULANG */}
          <button
            type="button"
            onClick={load}
            disabled={state.loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                state.loading ? "animate-spin" : ""
              }
            />

            Muat Ulang
          </button>
        </div>

        {/* BELUM LOGIN */}
        {needsLogin && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            <p className="font-semibold">
              Masuk dulu untuk melihat pesanan.
            </p>

            <p className="mt-1">
              Pesanan terhubung dengan akun Supabase kamu.
            </p>

            <Link
              href="/login"
              className="mt-3 inline-block rounded-lg bg-[#3f6a0b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#345609]"
            >
              Masuk
            </Link>
          </div>
        )}

        {/* ERROR */}
        {state.error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p className="font-semibold">
              Data pesanan gagal dimuat
            </p>

            <p className="mt-1">
              {state.error}
            </p>

            <button
              type="button"
              onClick={load}
              className="mt-3 rounded-lg bg-[#3f6a0b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#345609]"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* LOADING */}
        {state.loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
              />
            ))}
          </div>
        )}

        {/* BELUM ADA PESANAN */}
        {!state.loading &&
          !state.error &&
          !needsLogin &&
          state.orders.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <PackageSearch
                size={36}
                className="mx-auto mb-3 text-gray-400"
              />

              <p className="font-semibold text-gray-800">
                Belum ada pesanan.
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Pesanan yang kamu buat akan ditampilkan
                di halaman ini.
              </p>
            </div>
          )}

        {/* FILTER STATUS PESANAN */}
        {!state.loading &&
          !state.error &&
          !needsLogin &&
          state.orders.length > 0 && (
            <>
              <div className="mb-5 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">

                <div className="flex gap-2 overflow-x-auto pb-1">

                  {FILTER_STATUS.map((status) => {
                    const active =
                      filterStatus === status;

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setFilterStatus(status)
                        }
                        aria-pressed={active}
                        className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                          active
                            ? "bg-[#3f6a0b] text-white shadow-sm"
                            : "text-gray-500 hover:bg-green-50 hover:text-[#3f6a0b]"
                        }`}
                      >
                        <span>{status}</span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {jumlahStatus(status)}
                        </span>
                      </button>
                    );
                  })}

                </div>
              </div>

              {/* JUMLAH HASIL FILTER */}
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  Menampilkan{" "}
                  <span className="font-semibold text-gray-800">
                    {filteredOrders.length}
                  </span>{" "}
                  {filterStatus === "Semua"
                    ? "pesanan"
                    : `pesanan ${filterStatus.toLowerCase()}`}
                </p>
              </div>

              {/* FILTER TIDAK MEMILIKI PESANAN */}
              {filteredOrders.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">

                  <PackageSearch
                    size={40}
                    className="mx-auto mb-3 text-gray-400"
                  />

                  <h3 className="font-semibold text-gray-800">
                    Tidak ada pesanan
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Belum ada pesanan dengan status{" "}
                    <span className="font-semibold">
                      {filterStatus}
                    </span>
                    .
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setFilterStatus("Semua")
                    }
                    className="mt-5 rounded-lg border border-[#3f6a0b] px-5 py-2.5 text-sm font-semibold text-[#3f6a0b] transition hover:bg-green-50"
                  >
                    Lihat Semua Pesanan
                  </button>
                </div>
              )}

              {/* DAFTAR KARTU PESANAN */}
              <div className="space-y-4">

                {filteredOrders.map((order) => (
                  <article
                    key={order.id_pesanan}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                  >

                    {/* HEADER KARTU */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Pesanan #{order.id_pesanan}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(order.tgl_pesan)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(order.status_pesanan)}`}
                      >
                        {order.status_pesanan ||
                          "Menunggu Konfirmasi"}
                      </span>

                    </div>

                    {/* MATERIAL PESANAN */}
                    <div className="space-y-3 px-5 py-4">

                      {order.items?.map((item) => (
                        <div
                          key={item.id_detail}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <div>
                            <Link
                              href={`/katalog/${item.id_material}`}
                              className="font-semibold text-gray-800 hover:text-[#3f6a0b]"
                            >
                              {item.nama_material}
                            </Link>

                            <p className="text-xs text-gray-500">
                              {angka.format(
                                item.kuantitas_pesan
                              )}{" "}
                              {item.satuan} ×{" "}
                              {rupiah.format(item.harga)}
                              {item.kota
                                ? ` · ${item.kota}`
                                : ""}
                            </p>
                          </div>

                          <span className="font-semibold text-gray-800">
                            {rupiah.format(item.subtotal)}
                          </span>
                        </div>
                      ))}

                    </div>

                    {/* FOOTER KARTU */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3 text-sm">

                      <span className="text-gray-500">
                        {order.metode_kirim ||
                          "Ambil di tempat"}
                      </span>

                      <div className="flex items-center gap-3">

                        <span className="font-bold text-gray-900">
                          Total{" "}
                          {rupiah.format(
                            order.total_estimasi
                          )}
                        </span>

                        {state.role === "buyer" && (
                          <Link
                            href={`/orders/${order.id_pesanan}`}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-white hover:text-[#3f6a0b]"
                          >
                            Detail
                          </Link>
                        )}

                      </div>
                    </div>

                  </article>
                ))}

              </div>
            </>
          )}

        {/* INFORMASI ROLE SELLER */}
        {role === "seller" &&
          !needsLogin &&
          state.role === "buyer" &&
          state.orders.length > 0 && (
            <p className="mt-4 text-xs text-gray-400">
              Akun ini terdaftar sebagai pembeli.
              Pesanan penjual akan tampil jika akun
              punya data penjual.
            </p>
          )}

      </main>
    </>
  );
}

