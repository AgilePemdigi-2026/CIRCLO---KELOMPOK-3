'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Leaf,
  PackageCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import SellerOrderCard from './SellerOrderCard';
import { useSellerOrders } from './useSellerOrders';
import { isActionable, sortOrders, statusKey } from './orderStatus';

const angka = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

function StatCard({ label, value, hint, icon: Icon, tone }) {
  const toneClass =
    tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-circlo-soft text-circlo-green';

  return (
    <article className="rounded-2xl border border-circlo-line bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13.5px] font-medium text-circlo-muted">{label}</p>
          <p className="mt-3 font-display text-[34px] font-semibold leading-none text-circlo-ink">
            {value}
          </p>
          <p className="mt-2 text-[12.5px] text-circlo-muted">{hint}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="mt-8 space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
        <div className="h-[250px] animate-pulse rounded-2xl bg-white shadow-card" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="h-[118px] animate-pulse rounded-2xl bg-white shadow-card" />
          <div className="h-[118px] animate-pulse rounded-2xl bg-white shadow-card" />
        </div>
      </div>
      <div className="h-[140px] animate-pulse rounded-2xl bg-white shadow-card" />
      <div className="h-[140px] animate-pulse rounded-2xl bg-white shadow-card" />
    </div>
  );
}

export default function SellerDashboard() {
  const { loading, error, needsLogin, orders, summary, reload } = useSellerOrders();
  const [filter, setFilter] = useState('all');
  const [feedback, setFeedback] = useState(null);

  const derived = useMemo(() => {
    const completedOrders = orders.filter((order) => statusKey(order.status_pesanan) === 'completed');
    const impactKg = completedOrders.reduce(
      (sum, order) =>
        sum +
        (order.items || [])
          .filter((item) => String(item.satuan || '').toLowerCase() === 'kg')
          .reduce((itemSum, item) => itemSum + Number(item.kuantitas_pesan || 0), 0),
      0,
    );
    const completedUnits = completedOrders.reduce(
      (sum, order) =>
        sum +
        (order.items || []).reduce(
          (itemSum, item) => itemSum + Number(item.kuantitas_pesan || 0),
          0,
        ),
      0,
    );

    return {
      pending: orders.filter((order) => statusKey(order.status_pesanan) === 'pending').length,
      ready: orders.filter((order) =>
        ['confirmed', 'distributed'].includes(statusKey(order.status_pesanan)),
      ).length,
      completed: completedOrders.length,
      impact_kg: Math.round(impactKg * 100) / 100,
      material_dialihkan_kg: Math.round(impactKg * 100) / 100,
      completed_units: Math.round(completedUnits * 100) / 100,
    };
  }, [orders]);

  const data = summary || derived;
  const sorted = useMemo(() => sortOrders(orders), [orders]);
  const visible = filter === 'action' ? sorted.filter(isActionable) : sorted;
  const shown = visible.slice(0, 6);
  const remaining = Math.max(visible.length - shown.length, 0);

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-semibold leading-tight text-circlo-ink">
            Dashboard Penjual
          </h1>
          <p className="mt-2 max-w-[720px] text-[15px] leading-relaxed text-circlo-muted">
            Kelola kontribusi penatagunaan komunitas Anda dan penuhi pesanan aktif.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-circlo-green/50 bg-white px-4 py-2.5 text-[13.5px] font-medium text-circlo-green hover:bg-circlo-soft disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Muat ulang
        </button>
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

      {needsLogin && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-[14px] text-amber-800">
          <p className="font-semibold">Masuk dulu untuk membuka dashboard penjual.</p>
          <p className="mt-1">
            Statistik dan pesanan terhubung dengan akun penjual pada sesi Supabase Anda.
          </p>
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
            <AlertCircle className="h-5 w-5" /> Data dashboard gagal dimuat
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

      {loading && !needsLogin && <LoadingState />}

      {!loading && !needsLogin && !error && (
        <>
          <div className="mt-8 grid gap-5 lg:grid-cols-[1.65fr_1fr]">
            <section className="relative overflow-hidden rounded-2xl border border-circlo-line bg-white p-6 shadow-card sm:p-8">
              <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-circlo-soft/70" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-circlo-muted">
                    Material Dialihkan
                  </p>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="font-display text-[52px] font-semibold leading-none text-circlo-green">
                      {angka.format(Number(data.material_dialihkan_kg ?? data.impact_kg ?? 0))}
                    </span>
                    <span className="pb-1 text-[18px] font-semibold text-circlo-muted">kg</span>
                  </div>
                  <p className="mt-3 max-w-[470px] text-[14px] leading-relaxed text-circlo-muted">
                    Volume material bersatuan kg dari pesanan berstatus Selesai. Angka ini
                    menunjukkan jumlah material yang tercatat dialihkan, bukan klaim dampak
                    lingkungan.
                  </p>
                </div>
                <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-circlo-soft text-circlo-green">
                  <Leaf className="h-7 w-7" />
                </span>
              </div>

              <div className="relative mt-6 flex flex-wrap items-center gap-3 border-t border-circlo-line/70 pt-5">
                <span className="inline-flex items-center gap-2 rounded-full bg-circlo-soft px-3.5 py-1.5 text-[12.5px] font-semibold text-circlo-green">
                  <Sparkles className="h-4 w-4" />
                  {data.rank?.rank
                    ? `Peringkat #${data.rank.rank} dari ${data.rank.total_sellers} penjual (material kg)`
                    : data.completed > 0
                      ? `${data.completed} pesanan selesai`
                      : 'Belum ada pesanan selesai'}
                </span>
                <span className="text-[12.5px] text-circlo-muted">
                  {angka.format(Number(data.completed_units || 0))} unit material tersalurkan
                </span>
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <StatCard
                label="Pesanan Tertunda"
                value={angka.format(Number(data.pending || 0))}
                hint="Menunggu konfirmasi atau tindakan Anda"
                icon={Clock3}
                tone="amber"
              />
              <StatCard
                label="Siap Diambil"
                value={angka.format(Number(data.ready || 0))}
                hint="Sudah dikonfirmasi dan siap diserahkan"
                icon={PackageCheck}
                tone="green"
              />
            </div>
          </div>

          <section className="mt-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-[22px] font-semibold text-circlo-ink">
                  Pesanan Aktif
                </h2>
                <p className="mt-1 text-[13.5px] text-circlo-muted">
                  Pesanan yang memerlukan tindakan atau baru diperbarui.
                </p>
              </div>

              <div className="flex rounded-full border border-circlo-line bg-white p-1">
                {[
                  { key: 'all', label: 'Semua' },
                  { key: 'action', label: 'Perlu Tindakan' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilter(tab.key)}
                    className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition ${
                      filter === tab.key
                        ? 'bg-circlo-green text-white'
                        : 'text-circlo-muted hover:text-circlo-green'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {shown.map((order) => (
                <SellerOrderCard key={order.id_pesanan} order={order} onUpdated={handleUpdated} />
              ))}
            </div>

            {!visible.length && (
              <div className="mt-5 rounded-2xl border border-dashed border-circlo-line bg-white p-10 text-center shadow-card">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-circlo-soft">
                  {filter === 'action' ? (
                    <CheckCircle2 className="h-7 w-7 text-circlo-green" />
                  ) : (
                    <ClipboardList className="h-7 w-7 text-circlo-green" />
                  )}
                </span>
                <h3 className="mt-4 font-display text-[18px] font-semibold text-circlo-ink">
                  {filter === 'action'
                    ? 'Tidak ada pesanan yang perlu ditindaklanjuti'
                    : 'Belum ada pesanan masuk'}
                </h3>
                <p className="mt-1 text-[13.5px] text-circlo-muted">
                  {filter === 'action'
                    ? 'Semua pesanan sudah diproses. Kamu bisa melihat riwayat lengkap.'
                    : 'Pesanan dari pembeli akan muncul di sini setelah materialmu dipesan.'}
                </p>
                {filter === 'action' && (
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className="mt-4 rounded-lg border border-circlo-green/50 px-4 py-2 text-[13px] font-semibold text-circlo-green hover:bg-circlo-soft"
                  >
                    Lihat Semua
                  </button>
                )}
              </div>
            )}

            {remaining > 0 && (
              <p className="mt-4 text-center text-[12.5px] text-circlo-muted">
                {remaining} pesanan lain tersedia di riwayat pesanan.
              </p>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/seller/orders"
                className="inline-flex items-center gap-2 rounded-lg border border-circlo-green/50 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-circlo-green hover:bg-circlo-soft"
              >
                Lihat Semua Riwayat Pesanan <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
