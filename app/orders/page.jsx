"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getAccessToken, useRole } from "@/lib/auth";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusStyle(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("batal")) return "bg-red-50 text-red-700 border-red-200";
  if (value.includes("selesai") || value.includes("diterima")) {
    return "bg-green-50 text-green-700 border-green-200";
  }
  if (value.includes("kirim") || value.includes("proses")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function OrdersPage() {
  const { role } = useRole();
  const [state, setState] = useState({ loading: true, error: null, orders: [], role: null });
  const [needsLogin, setNeedsLogin] = useState(false);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const token = await getAccessToken();
    if (!token) {
      setNeedsLogin(true);
      setState({ loading: false, error: null, orders: [], role: null });
      return;
    }

    try {
      const response = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Gagal memuat pesanan.");
      setNeedsLogin(false);
      setState({
        loading: false,
        error: null,
        orders: Array.isArray(data.orders) ? data.orders : [],
        role: data.role || null,
      });
    } catch (err) {
      setState({ loading: false, error: err.message, orders: [], role: null });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {state.role === "seller" ? "Pesanan Masuk" : "Daftar Pesanan"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {state.role === "seller"
                ? "Pesanan yang berisi material milikmu."
                : "Pantau status pesanan material yang sudah dibuat."}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              disabled={state.loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Muat ulang
            </button>
            <Link
              href="/cari-material"
              className="rounded-lg bg-[#3f6a0b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#345609]"
            >
              Cari material
            </Link>
          </div>
        </div>

        {needsLogin && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            <p className="font-semibold">Masuk dulu untuk melihat pesanan.</p>
            <p className="mt-1">Pesanan terhubung dengan akun Supabase kamu.</p>
            <Link
              href="/login"
              className="mt-3 inline-block rounded-lg bg-[#3f6a0b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#345609]"
            >
              Masuk
            </Link>
          </div>
        )}

        {state.error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Data pesanan gagal dimuat</p>
            <p className="mt-1">{state.error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 rounded-lg bg-[#3f6a0b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#345609]"
            >
              Muat ulang
            </button>
          </div>
        )}

        {state.loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
            ))}
          </div>
        )}

        {!state.loading && !state.error && !needsLogin && state.orders.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="font-semibold text-gray-800">Belum ada pesanan.</p>
            <p className="mt-1 text-sm text-gray-500">
              Cari material di CIRCLO AI, lalu tekan tombol Pesan pada kartu material.
            </p>
            <Link
              href="/cari-material"
              className="mt-4 inline-block rounded-lg bg-[#3f6a0b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#345609]"
            >
              Mulai cari material
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {!state.loading &&
            state.orders.map((order) => (
              <article
                key={order.id_pesanan}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Pesanan #{order.id_pesanan}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{formatDate(order.tgl_pesan)}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(order.status_pesanan)}`}>
                    {order.status_pesanan || "Menunggu Konfirmasi"}
                  </span>
                </div>

                <div className="space-y-3 px-5 py-4">
                  {order.items?.map((item) => (
                    <div key={item.id_detail} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div>
                        <Link
                          href={`/katalog/${item.id_material}`}
                          className="font-semibold text-gray-800 hover:text-[#3f6a0b]"
                        >
                          {item.nama_material}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {angka.format(item.kuantitas_pesan)} {item.satuan} × {rupiah.format(item.harga)}
                          {item.kota ? ` · ${item.kota}` : ""}
                        </p>
                      </div>
                      <span className="font-semibold text-gray-800">{rupiah.format(item.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3 text-sm">
                  <span className="text-gray-500">{order.metode_kirim || "Ambil di tempat"}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">
                      Total {rupiah.format(order.total_estimasi)}
                    </span>
                    {state.role === "buyer" && (
                      <Link
                        href={`/orders/${order.id_pesanan}`}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white"
                      >
                        Detail
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
        </div>

        {role === "seller" && !needsLogin && state.role === "buyer" && state.orders.length > 0 && (
          <p className="mt-4 text-xs text-gray-400">
            Akun ini terdaftar sebagai pembeli. Pesanan penjual akan tampil jika akun punya data penjual.
          </p>
        )}
      </main>
    </>
  );
}
