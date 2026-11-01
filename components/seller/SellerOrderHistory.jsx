'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';
import SellerOrderCard from './SellerOrderCard';
import { useSellerOrders } from './useSellerOrders';
import { isActionable, sortOrders, statusKey } from './orderStatus';

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'action', label: 'Perlu Tindakan' },
  { key: 'pending', label: 'Menunggu Konfirmasi' },
  { key: 'confirmed', label: 'Dikonfirmasi' },
  { key: 'distributed', label: 'Disalurkan' },
  { key: 'completed', label: 'Selesai' },
  { key: 'rejected', label: 'Ditolak' },
];

function matches(order, filter) {
  if (filter === 'all') return true;
  if (filter === 'action') return isActionable(order);
  return statusKey(order.status_pesanan) === filter;
}

export default function SellerOrderHistory() {
  const { loading, error, needsLogin, orders, summary, reload } = useSellerOrders();
  const [filter, setFilter] = useState('all');
  const [feedback, setFeedback] = useState(null);

  const sorted = useMemo(() => sortOrders(orders), [orders]);
  const visible = useMemo(() => sorted.filter((order) => matches(order, filter)), [sorted, filter]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 8000);
    return () => clearTimeout(timer);
  }, [feedback]);

  function handleUpdated(message) {
    setFeedback(message);
    reload();
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Link
        href="/seller"
        className="inline-flex items-center gap-2 text-[13.5px] font-medium text-circlo-green hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard Penjual
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-semibold leading-tight text-circlo-ink">
            Riwayat Pesanan
          </h1>
          <p className="mt-2 max-w-[720px] text-[15px] leading-relaxed text-circlo-muted">
            Semua pesanan yang memuat material milikmu, termasuk yang masih perlu ditindaklanjuti.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-circlo-green/50 bg-white px-4 py-2.5 text-[13.5px] font-medium text-circlo-green hover:bg-circlo-soft disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Muat ulang
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-circlo-lime/60 bg-circlo-soft px-4 py-3 text-[13.5px] text-circlo-green"
        >
          <span className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {feedback}
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[12px] font-semibold opacity-70 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {summary && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-circlo-line bg-white px-4 py-3 shadow-card">
            <p className="text-[12px] text-circlo-muted">Menunggu konfirmasi</p>
            <p className="mt-1 font-display text-[22px] font-semibold text-amber-700">
              {summary.pending ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-circlo-line bg-white px-4 py-3 shadow-card">
            <p className="text-[12px] text-circlo-muted">Siap diambil / dikirim</p>
            <p className="mt-1 font-display text-[22px] font-semibold text-circlo-green">
              {summary.ready ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-circlo-line bg-white px-4 py-3 shadow-card">
            <p className="text-[12px] text-circlo-muted">Selesai</p>
            <p className="mt-1 font-display text-[22px] font-semibold text-circlo-ink">
              {summary.completed ?? 0}
            </p>
          </div>
        </div>
      )}

      {needsLogin && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-[14px] text-amber-800">
          <p className="font-semibold">Masuk dulu untuk melihat riwayat pesanan.</p>
          <p className="mt-1">Riwayat terhubung dengan akun penjual pada sesi Supabase Anda.</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-circlo-green px-5 py-2.5 text-[14px] font-medium text-white hover:brightness-110"
          >
            Masuk
          </Link>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-[14px] text-red-700">
          <p className="flex items-center gap-2 text-[16px] font-semibold">
            <AlertCircle className="h-5 w-5" /> Data pesanan gagal dimuat
          </p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 rounded-lg bg-circlo-green px-5 py-2.5 text-[14px] font-medium text-white hover:brightness-110"
          >
            Muat ulang
          </button>
        </div>
      )}

      {loading && !needsLogin && (
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[140px] animate-pulse rounded-2xl bg-white shadow-card" />
          ))}
        </div>
      )}

      {!loading && !needsLogin && !error && (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {FILTERS.map((tab) => {
              const count =
                tab.key === 'all'
                  ? orders.length
                  : tab.key === 'action'
                    ? orders.filter(isActionable).length
                    : orders.filter((order) => statusKey(order.status_pesanan) === tab.key).length;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`rounded-full border px-4 py-2 text-[12.5px] font-medium transition ${
                    filter === tab.key
                      ? 'border-circlo-green bg-circlo-green text-white'
                      : 'border-circlo-line bg-white text-circlo-muted hover:border-circlo-green/50 hover:text-circlo-green'
                  }`}
                >
                  {tab.label} <span className="ml-1 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-4">
            {visible.map((order) => (
              <SellerOrderCard
                key={order.id_pesanan}
                order={order}
                onUpdated={handleUpdated}
                showDetail={false}
              />
            ))}
          </div>

          {!visible.length && (
            <div className="mt-5 rounded-2xl border border-dashed border-circlo-line bg-white p-10 text-center shadow-card">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-circlo-soft">
                <ClipboardList className="h-7 w-7 text-circlo-green" />
              </span>
              <h2 className="mt-4 font-display text-[18px] font-semibold text-circlo-ink">
                Tidak ada pesanan pada filter ini
              </h2>
              <p className="mt-1 text-[13.5px] text-circlo-muted">
                Coba pilih filter lain untuk melihat pesanan lainnya.
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
