
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  PackageSearch,
  RefreshCw,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import { getAccessToken, useRole } from "@/lib/auth";
import SellerOrderCard from "@/components/seller/SellerOrderCard";
import {
  statusKey,
  statusStyle,
} from "@/components/seller/orderStatus";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const angka = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

const FILTER_STATUS = [
  { key: "all", label: "Semua" },
  { key: "unpaid", label: "Menunggu Pembayaran" },
  { key: "pending", label: "Menunggu Konfirmasi" },
  { key: "confirmed", label: "Dikonfirmasi" },
  { key: "distributed", label: "Disalurkan" },
  { key: "completed", label: "Selesai" },
  { key: "cancelled", label: "Dibatalkan" },
  { key: "rejected", label: "Ditolak" },
];

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function OrdersPage() {
  const {
    role,
    loading: roleLoading,
  } = useRole();

  const [state, setState] = useState({
    loading: true,
    error: null,
    orders: [],
    role: null,
  });

  const [needsLogin, setNeedsLogin] =
    useState(false);

  const [filterStatus, setFilterStatus] =
    useState("all");

  const [feedback, setFeedback] =
    useState(null);

  // ======================================
  // 1. MENGAMBIL DATA PESANAN
  // ======================================

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

      // Seller menggunakan scope khusus Seller.
      // Buyer menggunakan daftar pesanan miliknya.
      const endpoint =
        role === "seller"
          ? "/api/orders?scope=seller"
          : "/api/orders";

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal memuat pesanan."
        );
      }

      setNeedsLogin(false);

      setState({
        loading: false,
        error: null,
        orders: Array.isArray(result.orders)
          ? result.orders
          : [],
        role: result.role || null,
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
  }, [role]);

  useEffect(() => {
    if (!roleLoading) {
      load();
    }
  }, [roleLoading, load]);

  // ======================================
  // 2. REFRESH SETELAH AKSI SELLER
  // ======================================

  const handleUpdated = (message) => {
    setFeedback(message);
    load();
  };

  // ======================================
  // 3. FILTER STATUS PESANAN
  // ======================================

  const filteredOrders =
    filterStatus === "all"
      ? state.orders
      : state.orders.filter(
          (order) =>
            statusKey(order.status_pesanan) ===
            filterStatus
        );

  const jumlahStatus = (key) => {
    if (key === "all") {
      return state.orders.length;
    }

    return state.orders.filter(
      (order) =>
        statusKey(order.status_pesanan) === key
    ).length;
  };

  const isSeller =
    state.role === "seller";

  // ======================================
  // 4. TAMPILAN HALAMAN
  // ======================================

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isSeller
                ? "Pesanan Masuk"
                : "Daftar Pesanan"}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {isSeller
                ? "Kelola pesanan material, konfirmasi, dan proses penyaluran."
                : "Pantau status pesanan material yang sudah dibuat."}
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={
              state.loading || roleLoading
            }
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                state.loading
                  ? "animate-spin"
                  : ""
              }
            />
            Muat Ulang
          </button>
        </div>

        {/* NOTIFIKASI AKSI BERHASIL */}
        {feedback && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2
                size={18}
                className="shrink-0"
              />
              {feedback}
            </span>

            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="font-semibold hover:underline"
            >
              Tutup
            </button>
          </div>
        )}

        {/* BELUM LOGIN */}
        {needsLogin && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            <p className="font-semibold">
              Masuk dulu untuk melihat pesanan.
            </p>

            <p className="mt-1">
              Pesanan terhubung dengan akun
              Supabase kamu.
            </p>

            <Link
              href="/login"
              className="mt-3 inline-block rounded-lg bg-circlo-green px-4 py-2 font-semibold text-white"
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
              className="mt-3 rounded-lg bg-circlo-green px-4 py-2 font-semibold text-white"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* LOADING */}
        {(state.loading || roleLoading) &&
          !needsLogin && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
                />
              ))}
            </div>
          )}

        {/* PESANAN KOSONG */}
        {!state.loading &&
          !roleLoading &&
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
                {isSeller
                  ? "Pesanan material milikmu akan muncul di sini."
                  : "Pesanan yang kamu buat akan muncul di sini."}
              </p>
            </div>
          )}

        {/* DAFTAR PESANAN */}
        {!state.loading &&
          !roleLoading &&
          !state.error &&
          !needsLogin &&
          state.orders.length > 0 && (
            <>
              {/* FILTER */}
              <div className="mb-5 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {FILTER_STATUS.map((filter) => {
                    const active =
                      filterStatus === filter.key;

                    return (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() =>
                          setFilterStatus(
                            filter.key
                          )
                        }
                        aria-pressed={active}
                        className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                          active
                            ? "bg-circlo-green text-white"
                            : "text-gray-500 hover:bg-green-50 hover:text-circlo-green"
                        }`}
                      >
                        <span>
                          {filter.label}
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {jumlahStatus(
                            filter.key
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* JUMLAH HASIL */}
              <p className="mb-4 text-sm text-gray-500">
                Menampilkan{" "}
                <span className="font-semibold text-gray-800">
                  {filteredOrders.length}
                </span>{" "}
                pesanan
              </p>

              {/* HASIL FILTER KOSONG */}
              {filteredOrders.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
                  <PackageSearch
                    size={36}
                    className="mx-auto mb-3 text-gray-400"
                  />

                  <p className="font-semibold text-gray-800">
                    Tidak ada pesanan pada filter ini.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setFilterStatus("all")
                    }
                    className="mt-4 rounded-lg border border-circlo-green px-4 py-2 text-sm font-semibold text-circlo-green"
                  >
                    Lihat Semua Pesanan
                  </button>
                </div>
              )}

              {/* KARTU PESANAN */}
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  // SELLER:
                  // Gunakan komponen tindakan yang
                  // sudah dipakai Dashboard Seller.
                  if (isSeller) {
                    return (
                      <SellerOrderCard
                        key={order.id_pesanan}
                        order={order}
                        onUpdated={handleUpdated}
                        showDetail={false}
                      />
                    );
                  }

                  // BUYER:
                  // Pertahankan daftar pesanan
                  // dengan tombol Detail.
                  return (
                    <article
                      key={order.id_pesanan}
                      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                    >
                      {/* HEADER KARTU */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Pesanan #
                            {order.id_pesanan}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {formatDate(
                              order.tgl_pesan
                            )}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
                            order.status_pesanan
                          )}`}
                        >
                          {order.status_pesanan ||
                            "Menunggu Konfirmasi"}
                        </span>
                      </div>

                      {/* MATERIAL */}
                      <div className="space-y-3 px-5 py-4">
                        {order.items?.map((item) => (
                          <div
                            key={item.id_detail}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                          >
                            <div>
                              <Link
                                href={`/katalog/${item.id_material}`}
                                className="font-semibold text-gray-800 hover:text-circlo-green"
                              >
                                {item.nama_material}
                              </Link>

                              <p className="text-xs text-gray-500">
                                {angka.format(
                                  item.kuantitas_pesan
                                )}{" "}
                                {item.satuan} ×{" "}
                                {rupiah.format(
                                  item.harga
                                )}
                              </p>
                            </div>

                            <span className="font-semibold text-gray-800">
                              {rupiah.format(
                                item.subtotal
                              )}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* FOOTER BUYER */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-5 py-3 text-sm">
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

                          <Link
                            href={`/orders/${order.id_pesanan}`}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white"
                          >
                            Detail
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
      </main>
    </>
  );
}
