'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, MapPin, MessageSquareText, Receipt, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import MaterialImage from '@/components/MaterialImage';
import { getAccessToken } from '@/lib/auth';

// Halaman Order Detail & Tracking (SRS 3.1.10, Gambar 1.10) untuk use case 4.12 Melihat Status Pesanan.
// Teks yang dipakai skenario Gherkin: "Detail Pesanan", "Status Pesanan", "Status Terbaru",
// "Riwayat Status Pesanan", "Data pesanan gagal dimuat", plus status "Dikonfirmasi", "Disalurkan", "Selesai", "Ditolak".

const IS_DEV = process.env.NODE_ENV !== 'production';

const STEPS = ['Pesanan Dibuat', 'Dikonfirmasi', 'Disalurkan', 'Selesai'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const angka = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

const pad = (n) => String(n).padStart(2, '0');

function orderCode(id) {
  return `ORD-${String(id).padStart(4, '0')}`;
}

// Format waktu seperti di mockup: "12 Okt, 10:45 Pagi".
function fmtStep(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const period = h < 11 ? 'Pagi' : h < 15 ? 'Siang' : h < 18 ? 'Sore' : 'Malam';
  return `${d.getDate()} ${BULAN[d.getMonth()]}, ${pad(h)}:${pad(d.getMinutes())} ${period}`;
}

function fmtLong(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(d);
}

// Status dari database dipetakan ke empat tahap pada mockup, ditambah kondisi Ditolak (SRS 4.8).
function parseStatus(status) {
  const v = String(status || '').toLowerCase();
  if (/tolak|batal/.test(v)) return { rejected: true, index: 0 };
  if (/selesai|diterima/.test(v)) return { rejected: false, index: 3 };
  if (/salur|kirim|siap/.test(v)) return { rejected: false, index: 2 };
  if (/proses/.test(v) || (/konfirmasi/.test(v) && !/menunggu/.test(v))) return { rejected: false, index: 1 };
  return { rejected: false, index: 0 };
}

function statusLabel({ rejected, index }) {
  if (rejected) return 'Ditolak';
  return index === 0 ? 'Menunggu Konfirmasi' : STEPS[index];
}

const MATCHERS = [
  null,
  (t) => (/proses/.test(t) || /konfirmasi/.test(t)) && !/menunggu/.test(t),
  (t) => /salur|kirim|siap/.test(t),
  (t) => /selesai|diterima/.test(t),
];

function buildTimeline(data) {
  const parsed = parseStatus(data.order.status_pesanan);
  const log = data.riwayat.map((row) => ({ ...row, text: String(row.status_update || '').toLowerCase() }));
  const timeOf = (i) => {
    if (i === 0) return data.order.tgl_pesan;
    const hit = log.find((row) => MATCHERS[i](row.text));
    return hit?.waktu_update || null;
  };
  const dikirim = data.order.metode_kirim === 'Dikirim';

  if (parsed.rejected) {
    const rejection = log.find((row) => /tolak|batal/.test(row.text));
    return {
      parsed,
      steps: [
        { title: STEPS[0], state: 'done', time: fmtStep(timeOf(0)), note: '' },
        {
          title: 'Ditolak',
          state: 'rejected',
          time: fmtStep(rejection?.waktu_update),
          note: rejection?.status_update || 'Informasi Penolakan: pesanan tidak dapat dipenuhi oleh penjual.',
        },
      ],
    };
  }

  const notes = {
    0: { current: 'Menunggu konfirmasi penjual.' },
    1: { done: 'Pesanan telah dikonfirmasi oleh penjual.', future: 'Menunggu konfirmasi penjual.' },
    2: {
      current: dikirim ? 'Material sedang disalurkan ke lokasi Anda.' : 'Material siap diambil di lokasi penjemputan.',
      done: 'Material telah disalurkan.',
      future: 'Menunggu penyaluran material.',
    },
    3: { done: 'Penerimaan material telah dikonfirmasi.', future: 'Menunggu konfirmasi pembeli.' },
  };

  const steps = STEPS.map((title, i) => {
    const complete = parsed.index === 3 || i < parsed.index;
    const state = complete ? 'done' : i === parsed.index ? 'current' : 'future';
    return {
      title,
      state,
      time: state === 'future' ? '' : fmtStep(timeOf(i)),
      note: notes[i][state] || '',
    };
  });
  return { parsed, steps };
}

function dotColor({ rejected, index }) {
  if (rejected) return 'bg-red-500';
  if (index === 3) return 'bg-green-600';
  return 'bg-amber-500';
}

function gradeOf(item) {
  return item.grade ? (
    <span className="absolute right-1 top-1 rounded bg-circlo-lime px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      {item.grade}
    </span>
  ) : null;
}

function initials(name) {
  return String(name || 'P')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

// Data contoh hanya dipakai saat npm run dev tanpa sesi login, supaya tampilan bisa dicoba.
// Ubah tahap lewat ?status=Menunggu|Dikonfirmasi|Disalurkan|Selesai|Ditolak.
function demoDetail(id) {
  const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('status') : null;
  const status = { Menunggu: 'Menunggu Konfirmasi', Dikonfirmasi: 'Dikonfirmasi', Selesai: 'Selesai', Ditolak: 'Ditolak' }[query] || 'Disalurkan';
  const log = [{ id: 1, status_update: 'Pesanan dibuat, menunggu konfirmasi penjual', waktu_update: '2026-10-12T10:45:00' }];
  const idx = parseStatus(status);
  if (idx.rejected) log.push({ id: 2, status_update: 'Ditolak: stok material tidak mencukupi', waktu_update: '2026-10-12T13:05:00' });
  else {
    if (idx.index >= 1) log.push({ id: 2, status_update: 'Dikonfirmasi penjual', waktu_update: '2026-10-12T14:15:00' });
    if (idx.index >= 2) log.push({ id: 3, status_update: 'Material disalurkan', waktu_update: '2026-10-13T09:30:00' });
    if (idx.index >= 3) log.push({ id: 4, status_update: 'Pesanan selesai', waktu_update: '2026-10-13T17:00:00' });
  }
  return {
    order: { id_pesanan: Number(id) || 1, tgl_pesan: '2026-10-12T10:45:00', status_pesanan: status, metode_kirim: 'Dikirim' },
    items: [
      {
        id_detail: 1,
        id_material: 1,
        nama_material: 'Papan Ek Reklamasi',
        kategori: 'Kayu',
        label: 'Daur Ulang Naik',
        grade: 'A+',
        foto_url: null,
        satuan: 'kaki persegi',
        harga: 1800,
        kuantitas_pesan: 250,
        subtotal: 450000,
      },
    ],
    seller: { id_seller: 1, nama: 'EcoBuild Materials Co.', alamat: 'Jl. Slamet Riyadi No. 442', terverifikasi: true, rating: 98 },
    lokasi: { nama: 'Pusat Daur Ulang Industri', alamat: 'Jl. Slamet Riyadi No. 442', kota: 'Surakarta', provinsi: 'Jawa Tengah' },
    ringkasan: { subtotal: 450000, biaya_layanan: 15000, total: 465000 },
    riwayat: log,
  };
}

function Marker({ state }) {
  if (state === 'done') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-circlo-green text-white">
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-circlo-green bg-white">
        <span className="h-2.5 w-2.5 rounded-full bg-circlo-green" />
      </span>
    );
  }
  if (state === 'rejected') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
        <X className="h-4 w-4" strokeWidth={3} />
      </span>
    );
  }
  return <span className="h-7 w-7 shrink-0 rounded-full border-2 border-circlo-line bg-circlo-line/70" />;
}

function Faktur({ data, code, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-circlo-ink/50 p-4 print:static print:block print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-label="Faktur pesanan"
    >
      <div className="my-8 w-full max-w-[560px] rounded-2xl bg-white p-8 shadow-card print:my-0 print:max-w-none print:shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[22px] font-semibold text-circlo-ink">Faktur #{code}</h2>
            <p className="mt-1 text-[13px] text-circlo-muted">{fmtLong(data.order.tgl_pesan)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup faktur" className="rounded-full p-1.5 text-circlo-muted hover:bg-circlo-field print:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-[13px]">
          <div>
            <dt className="text-circlo-muted">Penjual</dt>
            <dd className="mt-0.5 font-medium text-circlo-ink">{data.seller?.nama || '-'}</dd>
          </div>
          <div>
            <dt className="text-circlo-muted">Status Pesanan</dt>
            <dd className="mt-0.5 font-medium text-circlo-ink">{statusLabel(parseStatus(data.order.status_pesanan))}</dd>
          </div>
        </dl>

        <table className="mt-6 w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-circlo-line text-circlo-muted">
              <th className="pb-2 font-medium">Material</th>
              <th className="pb-2 text-right font-medium">Jumlah</th>
              <th className="pb-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id_detail} className="border-b border-circlo-line/60">
                <td className="py-3 text-circlo-ink">{item.nama_material}</td>
                <td className="py-3 text-right text-circlo-muted">
                  {angka.format(item.kuantitas_pesan)} {item.satuan}
                </td>
                <td className="py-3 text-right font-medium text-circlo-ink">{rupiah.format(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 space-y-2 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-circlo-muted">Subtotal</dt>
            <dd className="text-circlo-ink">{rupiah.format(data.ringkasan.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-circlo-muted">Biaya Layanan Platform</dt>
            <dd className="text-circlo-ink">{rupiah.format(data.ringkasan.biaya_layanan)}</dd>
          </div>
          <div className="flex justify-between border-t border-circlo-line pt-3 text-[16px] font-semibold text-circlo-ink">
            <dt>Total</dt>
            <dd>{rupiah.format(data.ringkasan.total)}</dd>
          </div>
        </dl>

        <div className="mt-8 flex justify-end gap-3 print:hidden">
          <button type="button" onClick={onClose} className="rounded-lg border border-circlo-fieldline px-5 py-2.5 text-[14px] font-medium text-circlo-ink hover:bg-circlo-bg">
            Tutup
          </button>
          <button type="button" onClick={() => window.print()} className="rounded-lg bg-circlo-green px-5 py-2.5 text-[14px] font-medium text-white hover:brightness-110">
            Cetak
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id;

  const [state, setState] = useState({ loading: true, error: null, notFound: false, data: null, demo: false, needsLogin: false });
  const [fakturOpen, setFakturOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setState((prev) => ({ ...prev, loading: true, error: null, notFound: false }));

    const token = await getAccessToken();
    if (!token) {
      if (IS_DEV) {
        setState({ loading: false, error: null, notFound: false, data: demoDetail(id), demo: true, needsLogin: false });
      } else {
        setState({ loading: false, error: null, notFound: false, data: null, demo: false, needsLogin: true });
      }
      return;
    }

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 404) {
        setState({ loading: false, error: body?.error || 'Pesanan tidak ditemukan.', notFound: true, data: null, demo: false, needsLogin: false });
        return;
      }
      if (!response.ok) throw new Error(body?.error || 'Server tidak merespons.');
      setState({ loading: false, error: null, notFound: false, data: body, demo: false, needsLogin: false });
    } catch (err) {
      setState({ loading: false, error: err.message, notFound: false, data: null, demo: false, needsLogin: false });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const { loading, error, notFound, data, demo, needsLogin } = state;
  const code = orderCode(id);
  const timeline = data ? buildTimeline(data) : null;

  const lokasiQuery = data
    ? [data.lokasi.alamat, data.lokasi.kota, data.lokasi.provinsi].filter(Boolean).join(', ')
    : '';
  const sellerMeta = data?.seller
    ? [data.seller.terverifikasi ? 'Penjual Terverifikasi' : 'Penjual', data.seller.rating ? `Rating ${data.seller.rating}%` : null]
        .filter(Boolean)
        .join(' • ')
    : '';

  return (
    <>
      <div className="print:hidden">
        <Navbar />
      </div>
      <RoleGate allow={['buyer']}>
        <main className="mx-auto w-full max-w-[1240px] px-6 py-10 sm:px-10 print:hidden">
          <Link
            href="/buyer"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-circlo-green hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
          </Link>

          <h1 className="mt-5 font-display text-[30px] font-semibold leading-tight text-circlo-ink">
            Detail Pesanan #{code}
          </h1>
          {timeline && (
            <p className="mt-3 flex items-center gap-2 text-[15px] text-circlo-ink">
              <span className="sr-only">Status Pesanan, Status Terbaru: </span>
              <span className={`h-2.5 w-2.5 rounded-full ${dotColor(timeline.parsed)}`} />
              {statusLabel(timeline.parsed)}
            </p>
          )}

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
            <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-[14px] text-red-700">
              <p className="text-[16px] font-semibold">{notFound ? 'Pesanan tidak ditemukan' : 'Data pesanan gagal dimuat'}</p>
              <p className="mt-1">{error}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={load}
                  className="rounded-lg bg-circlo-green px-5 py-2.5 text-[14px] font-medium text-white hover:brightness-110"
                >
                  Muat ulang
                </button>
                <Link
                  href="/orders"
                  className="rounded-lg border border-circlo-fieldline bg-white px-5 py-2.5 text-[14px] font-medium text-circlo-ink hover:bg-circlo-bg"
                >
                  Lihat Daftar Pesanan
                </Link>
              </div>
            </div>
          )}

          {loading && (
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                <div className="h-80 animate-pulse rounded-2xl bg-white shadow-card" />
                <div className="h-72 animate-pulse rounded-2xl bg-white shadow-card" />
              </div>
              <div className="space-y-6">
                <div className="h-60 animate-pulse rounded-2xl bg-white shadow-card" />
                <div className="h-48 animate-pulse rounded-2xl bg-white shadow-card" />
              </div>
            </div>
          )}

          {data && !loading && (
            <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                <section className="rounded-2xl bg-white p-8 shadow-card">
                  <h2 className="border-b border-circlo-line pb-5 font-display text-[22px] font-semibold text-circlo-ink">
                    Riwayat Status Pesanan
                  </h2>
                  <ol className="mt-8 pl-2">
                    {timeline.steps.map((step, i) => {
                      const last = i === timeline.steps.length - 1;
                      const lineDone = step.state === 'done';
                      return (
                        <li key={step.title} className="flex gap-5">
                          <div className="flex flex-col items-center">
                            <Marker state={step.state} />
                            {!last && (
                              <span className={`mt-1 min-h-[44px] w-0.5 flex-1 ${lineDone ? 'bg-circlo-green' : 'bg-circlo-line'}`} />
                            )}
                          </div>
                          <div className={last ? '' : 'pb-7'}>
                            <p
                              className={`text-[15px] font-semibold ${
                                step.state === 'current'
                                  ? 'text-circlo-green'
                                  : step.state === 'rejected'
                                    ? 'text-red-600'
                                    : step.state === 'future'
                                      ? 'text-circlo-muted'
                                      : 'text-circlo-ink'
                              }`}
                            >
                              {step.title}
                            </p>
                            {step.time && <p className="mt-0.5 text-[14px] text-circlo-ink/80">{step.time}</p>}
                            {step.note && (
                              <p className={`mt-0.5 text-[14px] ${step.state === 'future' ? 'text-circlo-muted/80' : 'text-circlo-ink/80'}`}>
                                {step.note}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>

                <section className="overflow-hidden rounded-2xl bg-white shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-circlo-line px-8 py-6">
                    <h2 className="font-display text-[22px] font-semibold text-circlo-ink">Lokasi Penjemputan</h2>
                    {(data.lokasi.kota || data.lokasi.provinsi) && (
                      <span className="rounded-full bg-[#E6F4FD] px-3 py-1 text-[12px] font-semibold text-circlo-green">
                        {data.lokasi.kota || data.lokasi.provinsi}
                      </span>
                    )}
                  </div>
                  <div className="relative h-[280px] bg-[#E6F4FD]">
                    {lokasiQuery ? (
                      <iframe
                        title="Peta lokasi penjemputan"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(lokasiQuery)}&output=embed`}
                        className="h-full w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[14px] text-circlo-muted">
                        Lokasi penjemputan belum tersedia.
                      </div>
                    )}
                    {lokasiQuery && (
                      <div className="pointer-events-none absolute bottom-4 left-4 flex max-w-[290px] items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-card">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E6F4FD]">
                          <MapPin className="h-5 w-5 text-circlo-green" />
                        </span>
                        <span className="text-[12.5px] leading-snug text-circlo-muted">
                          <span className="block text-[14px] font-semibold text-circlo-ink">
                            {data.lokasi.nama || 'Lokasi Penjual'}
                          </span>
                          {[data.lokasi.alamat, [data.lokasi.kota, data.lokasi.provinsi].filter(Boolean).join(', ')]
                            .filter(Boolean)
                            .map((line) => (
                              <span key={line} className="block">
                                {line}
                              </span>
                            ))}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-2xl bg-white p-6 shadow-card">
                  <h2 className="border-b border-circlo-line pb-4 font-display text-[22px] font-semibold text-circlo-ink">
                    Detail Material
                  </h2>
                  <ul className="mt-5 space-y-4">
                    {data.items.map((item) => (
                      <li key={item.id_detail} className="flex gap-4">
                        <div className="relative h-[66px] w-[66px] shrink-0 overflow-hidden rounded-md">
                          <MaterialImage
                            materialId={item.id_material}
                            materialName={item.nama_material}
                            category={item.kategori}
                            imageUrl={item.foto_url}
                            className="h-full w-full"
                          />
                          {gradeOf(item)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/katalog/${item.id_material}`}
                            className="block text-[14px] font-semibold text-circlo-ink hover:text-circlo-green"
                          >
                            {item.nama_material}
                          </Link>
                          <p className="mt-0.5 text-[12.5px] text-circlo-ink/80">
                            Jml: {angka.format(item.kuantitas_pesan)} {item.satuan}.
                          </p>
                          {item.label && (
                            <span className="mt-1.5 inline-block rounded-full bg-circlo-lime px-2.5 py-0.5 text-[11px] font-medium text-circlo-ink">
                              {item.label}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-5 space-y-3 border-t border-circlo-line pt-5 text-[14px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-circlo-ink/80">Subtotal</dt>
                      <dd className="text-circlo-ink">{rupiah.format(data.ringkasan.subtotal)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-circlo-ink/80">Biaya Layanan Platform</dt>
                      <dd className="text-circlo-ink">{rupiah.format(data.ringkasan.biaya_layanan)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 border-t border-circlo-line pt-4">
                      <dt className="font-display text-[20px] font-bold text-circlo-ink">Total</dt>
                      <dd className="font-display text-[24px] font-bold text-circlo-ink">{rupiah.format(data.ringkasan.total)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-2xl border border-circlo-line bg-[#E6F4FD] p-6 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-circlo-soft text-[16px] font-bold text-circlo-green">
                    {initials(data.seller?.nama)}
                  </span>
                  <p className="mt-3 text-[15px] font-semibold text-circlo-ink">{data.seller?.nama || 'Penjual'}</p>
                  <p className="mt-0.5 text-[12.5px] text-circlo-ink/80">{sellerMeta}</p>
                  <Link
                    href="/chat"
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#8A5200] px-4 py-3 text-[14px] font-medium text-white hover:brightness-110"
                  >
                    <MessageSquareText className="h-4 w-4" /> Hubungi Seller
                  </Link>
                  <button
                    type="button"
                    onClick={() => setFakturOpen(true)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-circlo-green bg-[#E6F4FD] px-4 py-3 text-[14px] font-medium text-circlo-green hover:bg-white"
                  >
                    <Receipt className="h-4 w-4" /> Lihat Faktur
                  </button>
                </section>
              </div>
            </div>
          )}
        </main>
        <div className="print:hidden">
          <Footer />
        </div>
        {fakturOpen && data && <Faktur data={data} code={code} onClose={() => setFakturOpen(false)} />}
      </RoleGate>
    </>
  );
}
