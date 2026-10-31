'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, CreditCard, MapPin, Package, ReceiptText } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import { getAccessToken } from '@/lib/auth';

const IS_DEV = process.env.NODE_ENV !== 'production';

const timeline = [
  'Pesanan dibuat',
  'Dikonfirmasi penjual',
  'Diproses',
  'Dikirim / siap diambil',
  'Selesai',
];

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});
const angka = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(date);
}

// Posisi status di garis waktu. -1 berarti pesanan dibatalkan.
function stepIndex(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('batal')) return -1;
  if (value.includes('selesai') || value.includes('diterima')) return 4;
  if (value.includes('kirim') || value.includes('siap')) return 3;
  if (value.includes('proses')) return 2;
  if (value.includes('konfirmasi') && !value.includes('menunggu')) return 1;
  return 0;
}

function badgeStyle(status) {
  const index = stepIndex(status);
  if (index === -1) return 'border-red-200 bg-red-50 text-red-700';
  if (index === 4) return 'border-green-200 bg-green-50 text-green-700';
  if (index >= 1) return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

// Data contoh hanya dipakai saat npm run dev tanpa sesi login, supaya tampilan bisa dicoba.
function demoDetail(id) {
  return {
    order: {
      id_pesanan: id,
      tgl_pesan: new Date().toISOString(),
      status_pesanan: 'Menunggu Konfirmasi',
      metode_kirim: 'Dikirim',
      total_estimasi: 750000,
    },
    items: [
      {
        id_detail: 1,
        id_material: 1,
        nama_material: 'Palet kayu bekas',
        kategori: 'Kayu',
        kota: 'Surakarta',
        provinsi: 'Jawa Tengah',
        satuan: 'unit',
        harga: 75000,
        kuantitas_pesan: 10,
        subtotal: 750000,
      },
    ],
    alamat: 'Jl. Contoh No. 1, Surakarta, 57126',
    penerima: 'Contoh Penerima',
    pembayaran: { metode: null, status: null },
    ringkasan: { subtotal: 750000, ongkir: null, total: 750000 },
    riwayat: [
      {
        id: 1,
        status_update: 'Pesanan dibuat, menunggu konfirmasi penjual',
        waktu_update: new Date().toISOString(),
      },
    ],
  };
}

function Panel({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-[19px] font-semibold text-circlo-ink">
        <Icon className="h-5 w-5 text-circlo-green" /> {title}
      </h2>
      {children}
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id;

  const [state, setState] = useState({ loading: true, error: null, data: null, demo: false, needsLogin: false });

  const load = useCallback(async () => {
    if (!id) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const token = await getAccessToken();
    if (!token) {
      if (IS_DEV) {
        setState({ loading: false, error: null, data: demoDetail(id), demo: true, needsLogin: false });
      } else {
        setState({ loading: false, error: null, data: null, demo: false, needsLogin: true });
      }
      return;
    }

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Gagal memuat detail pesanan.');
      setState({ loading: false, error: null, data: body, demo: false, needsLogin: false });
    } catch (err) {
      setState({ loading: false, error: err.message, data: null, demo: false, needsLogin: false });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const { loading, error, data, demo, needsLogin } = state;
  const current = data ? stepIndex(data.order.status_pesanan) : 0;
  const dibatalkan = current === -1;

  return (
    <>
      <Navbar />
      <RoleGate allow={['buyer']}>
        <main className="mx-auto w-full max-w-[1100px] px-6 py-10">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-circlo-muted hover:text-circlo-green"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Pesanan
          </Link>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-[30px] font-semibold leading-tight text-circlo-ink">
                Detail Pesanan #{id}
              </h1>
              <p className="mt-2 text-[15px] text-circlo-muted">
                {data
                  ? `Dipesan pada ${formatDate(data.order.tgl_pesan)}.`
                  : 'Informasi lengkap pesanan, pengiriman, pembayaran, dan riwayat status.'}
              </p>
            </div>
            {data && (
              <span
                className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold ${badgeStyle(data.order.status_pesanan)}`}
              >
                {data.order.status_pesanan}
              </span>
            )}
          </div>

          {demo && (
            <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
              Mode dev tanpa login: yang tampil adalah data contoh. Masuk sebagai Buyer untuk melihat pesanan asli.
            </p>
          )}

          {needsLogin && (
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-[14px] text-amber-800">
              <p className="font-semibold">Masuk dulu untuk melihat detail pesanan.</p>
              <Link
                href="/login"
                className="mt-4 inline-block rounded-lg bg-circlo-green px-5 py-2.5 text-[14px] font-medium text-white hover:brightness-110"
              >
                Masuk
              </Link>
            </div>
          )}

          {error && (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-[14px] text-red-700">
              <p className="font-semibold">{error}</p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={load}
                  className="rounded-lg bg-circlo-green px-5 py-2.5 text-[14px] font-medium text-white hover:brightness-110"
                >
                  Coba lagi
                </button>
                <Link
                  href="/orders"
                  className="rounded-lg border border-circlo-fieldline px-5 py-2.5 text-[14px] font-medium text-circlo-ink hover:bg-white"
                >
                  Lihat semua pesanan
                </Link>
              </div>
            </div>
          )}

          {loading && (
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl bg-white shadow-card" />
                ))}
              </div>
              <div className="h-56 animate-pulse rounded-2xl bg-white shadow-card" />
            </div>
          )}

          {data && !loading && (
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                <Panel icon={Package} title="Item Pesanan">
                  {data.items.length === 0 ? (
                    <p className="mt-4 text-[14px] text-circlo-muted">Pesanan ini belum memiliki item.</p>
                  ) : (
                    <ul className="mt-5 divide-y divide-circlo-line">
                      {data.items.map((item) => (
                        <li key={item.id_detail} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                          <div>
                            <Link
                              href={`/katalog/${item.id_material}`}
                              className="text-[15px] font-semibold text-circlo-ink hover:text-circlo-green"
                            >
                              {item.nama_material}
                            </Link>
                            <p className="mt-1 text-[13px] text-circlo-muted">
                              {angka.format(item.kuantitas_pesan)} {item.satuan} × {rupiah.format(item.harga)}
                            </p>
                            {(item.kategori || item.kota) && (
                              <p className="mt-0.5 text-[13px] text-circlo-muted">
                                {[item.kategori, [item.kota, item.provinsi].filter(Boolean).join(', ')]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            )}
                          </div>
                          <span className="text-[15px] font-semibold text-circlo-ink">{rupiah.format(item.subtotal)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Panel icon={MapPin} title="Alamat Pengiriman">
                    <p className="mt-4 text-[13px] font-medium text-circlo-ink">{data.order.metode_kirim}</p>
                    {data.alamat ? (
                      <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-circlo-muted">
                        {data.penerima && <span className="block font-medium text-circlo-ink">{data.penerima}</span>}
                        {data.alamat}
                      </p>
                    ) : (
                      <p className="mt-2 text-[14px] text-circlo-muted">
                        {data.order.metode_kirim === 'Dikirim'
                          ? 'Alamat pengiriman belum tersimpan.'
                          : 'Material diambil sendiri di lokasi penjual, jadi tidak ada alamat pengiriman.'}
                      </p>
                    )}
                  </Panel>

                  <Panel icon={CreditCard} title="Pembayaran">
                    {data.pembayaran.metode ? (
                      <>
                        <p className="mt-4 text-[14px] font-medium text-circlo-ink">{data.pembayaran.metode}</p>
                        {data.pembayaran.status && (
                          <p className="mt-1 text-[14px] text-circlo-muted">{data.pembayaran.status}</p>
                        )}
                      </>
                    ) : (
                      <p className="mt-4 text-[14px] text-circlo-muted">Metode pembayaran belum dipilih.</p>
                    )}
                  </Panel>
                </section>

                <Panel icon={ReceiptText} title="Riwayat Status">
                  {dibatalkan ? (
                    <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
                      Pesanan ini dibatalkan.
                    </p>
                  ) : (
                    <ol className="mt-5 space-y-4">
                      {timeline.map((label, index) => {
                        const done = index < current;
                        const active = index === current;
                        return (
                          <li key={label} className="flex items-center gap-3 text-[14px]">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                done || active ? 'bg-circlo-green text-white' : 'bg-circlo-line'
                              }`}
                            >
                              {done && <Check className="h-3 w-3" />}
                            </span>
                            <span className={done || active ? 'font-medium text-circlo-ink' : 'text-circlo-muted'}>
                              {label}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  {data.riwayat.length > 0 && (
                    <ul className="mt-6 space-y-2 border-t border-circlo-line pt-4">
                      {[...data.riwayat].reverse().map((row) => (
                        <li key={row.id} className="flex flex-wrap justify-between gap-2 text-[13px]">
                          <span className="text-circlo-ink">{row.status_update}</span>
                          <span className="text-circlo-muted">{formatDate(row.waktu_update)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>

              <aside className="h-fit rounded-2xl bg-white p-6 shadow-card">
                <h2 className="font-display text-[19px] font-semibold text-circlo-ink">Ringkasan Biaya</h2>
                <dl className="mt-4 space-y-3 text-[14px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-circlo-muted">Subtotal</dt>
                    <dd className="font-medium text-circlo-ink">{rupiah.format(data.ringkasan.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-circlo-muted">Ongkos kirim</dt>
                    <dd className="text-right font-medium text-circlo-ink">
                      {data.ringkasan.ongkir === null
                        ? data.order.metode_kirim === 'Dikirim'
                          ? 'Ditentukan penjual'
                          : 'Rp0'
                        : rupiah.format(data.ringkasan.ongkir)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-circlo-line pt-3">
                    <dt className="font-semibold text-circlo-ink">Total</dt>
                    <dd className="font-semibold text-circlo-ink">{rupiah.format(data.ringkasan.total)}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-[12.5px] leading-relaxed text-circlo-muted">
                  Total adalah estimasi dan belum termasuk ongkir jika material dikirim.
                </p>
              </aside>
            </div>
          )}
        </main>
        <Footer />
      </RoleGate>
    </>
  );
}
