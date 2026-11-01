'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  MessageCircle,
  Truck,
  X,
} from 'lucide-react';
import MaterialImage from '@/components/MaterialImage';
import { getAccessToken } from '@/lib/auth';
import {
  actionsFor,
  actionDialog,
  statusDot,
  statusLabel,
  statusStyle,
} from './orderStatus';

const angka = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function ActionIcon({ action }) {
  if (action === 'contact') return <MessageCircle className="h-4 w-4" />;
  if (action === 'detail') return <Eye className="h-4 w-4" />;
  if (action === 'ship') return <Truck className="h-4 w-4" />;
  if (action === 'confirm' || action === 'complete') return <CheckCircle2 className="h-4 w-4" />;
  return null;
}

export default function SellerOrderCard({ order, onUpdated, showDetail = true }) {
  const [dialog, setDialog] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const items = Array.isArray(order?.items) ? order.items : [];
  const first = items[0] || {
    id_material: null,
    nama_material: 'Material tidak tersedia',
    kategori: null,
    satuan: 'unit',
    kuantitas_pesan: 0,
    foto_url: null,
  };
  const quantity = items.reduce((sum, item) => sum + Number(item.kuantitas_pesan || 0), 0);
  const buyerName = order?.buyer?.nama_buyer || 'Pembeli CIRCLO';
  const buyerEmail = order?.buyer?.email_buyer || null;
  const actions = useMemo(
    () => actionsFor(order).filter((action) => showDetail || action.key !== 'detail'),
    [order, showDetail],
  );
  const config = dialog ? actionDialog(dialog, order) : null;

  const mailto = buyerEmail
    ? `mailto:${buyerEmail}?subject=${encodeURIComponent(`Pesanan #${order.id_pesanan} - CIRCLO`)}`
    : null;

  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !submitting) {
        setDialog(null);
        setError(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, submitting]);

  async function submitAction() {
    if (!dialog || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');

      const response = await fetch(`/api/orders/${order.id_pesanan}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: dialog,
          expected_status: order.status_pesanan,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Gagal memperbarui pesanan.');
      }

      setDialog(null);
      onUpdated?.(`Pesanan #${order.id_pesanan} berhasil diperbarui.`);
    } catch (err) {
      setError(err?.message || 'Gagal memperbarui pesanan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <article
        id={`order-${order.id_pesanan}`}
        className="rounded-2xl border border-circlo-line bg-white p-5 shadow-card transition hover:border-circlo-green/30 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-4">
            <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl">
              <MaterialImage
                materialId={first.id_material}
                materialName={first.nama_material}
                category={first.kategori}
                imageUrl={first.foto_url}
                className="h-full w-full"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-circlo-muted">
                Pesanan #{order.id_pesanan}
              </p>
              {first.id_material ? (
                <Link
                  href={`/katalog/${first.id_material}`}
                  className="mt-1 block truncate font-display text-[17px] font-semibold text-circlo-ink hover:text-circlo-green"
                >
                  {first.nama_material}
                </Link>
              ) : (
                <p className="mt-1 truncate font-display text-[17px] font-semibold text-circlo-ink">
                  {first.nama_material}
                </p>
              )}
              <p className="mt-1 text-[13px] text-circlo-muted">
                {angka.format(quantity)} {first.satuan || 'unit'}
                {items.length > 1 ? ` · ${items.length} material` : ''} · {buyerName}
              </p>
              <p className="mt-0.5 text-[12px] text-circlo-muted">
                {formatDate(order.tgl_pesan)} · {order.metode_kirim || 'Ambil di tempat'}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold ${statusStyle(
              order.status_pesanan,
            )}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusDot(order.status_pesanan)}`} />
            {statusLabel(order.status_pesanan, order.metode_kirim)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-circlo-line/70 pt-4">
          <p className="text-[13px] text-circlo-muted">
            Total{' '}
            <span className="font-semibold text-circlo-ink">
              {rupiah.format(Number(order.seller_total || order.total_estimasi || 0))}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => {
              if (action.key === 'contact') {
                return mailto ? (
                  <a
                    key={action.key}
                    href={mailto}
                    className="inline-flex items-center gap-2 rounded-lg border border-circlo-green/50 bg-white px-4 py-2 text-[13px] font-semibold text-circlo-green hover:bg-circlo-soft"
                  >
                    <ActionIcon action={action.key} /> {action.label}
                  </a>
                ) : (
                  <span
                    key={action.key}
                    className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-circlo-line px-4 py-2 text-[13px] font-semibold text-circlo-muted"
                    title="Email pembeli belum tersedia"
                  >
                    <ActionIcon action={action.key} /> {action.label}
                  </span>
                );
              }

              if (action.key === 'detail') {
                return (
                  <Link
                    key={action.key}
                    href={`/seller/orders#order-${order.id_pesanan}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-circlo-green/50 bg-white px-4 py-2 text-[13px] font-semibold text-circlo-green hover:bg-circlo-soft"
                  >
                    <ActionIcon action={action.key} /> {action.label}
                  </Link>
                );
              }

              const isDanger = action.variant === 'danger';
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => {
                    setError(null);
                    setDialog(action.key);
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
                    isDanger
                      ? 'border border-red-200 bg-white text-red-700 hover:bg-red-50'
                      : 'bg-circlo-green text-white hover:brightness-110'
                  }`}
                >
                  <ActionIcon action={action.key} /> {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </article>

      {dialog && config && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-circlo-ink/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`dialog-title-${order.id_pesanan}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setDialog(null);
              setError(null);
            }
          }}
        >
          <div className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id={`dialog-title-${order.id_pesanan}`}
                  className="font-display text-[20px] font-semibold text-circlo-ink"
                >
                  {config.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-circlo-muted">{config.description}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!submitting) {
                    setDialog(null);
                    setError(null);
                  }
                }}
                disabled={submitting}
                aria-label="Tutup dialog"
                className="rounded-full p-1.5 text-circlo-muted hover:bg-circlo-field disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setDialog(null);
                  setError(null);
                }}
                disabled={submitting}
                className="rounded-lg border border-circlo-fieldline px-4 py-2.5 text-[14px] font-medium text-circlo-ink hover:bg-circlo-bg disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={submitAction}
                disabled={submitting}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                  config.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-circlo-green hover:brightness-110'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
                  </>
                ) : (
                  config.confirmLabel
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
