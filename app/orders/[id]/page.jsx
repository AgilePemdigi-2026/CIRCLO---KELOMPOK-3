'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CreditCard, MapPin, Package, ReceiptText } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';

const timeline = [
  'Pesanan dibuat',
  'Dikonfirmasi penjual',
  'Diproses',
  'Dikirim / siap diambil',
  'Selesai',
];

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id;

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
                Informasi lengkap pesanan, pengiriman, pembayaran, dan riwayat status.
              </p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-[13px] font-semibold text-amber-700">
              Menunggu Konfirmasi
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <section className="rounded-2xl bg-white p-6 shadow-card">
                <h2 className="flex items-center gap-2 font-display text-[19px] font-semibold text-circlo-ink">
                  <Package className="h-5 w-5 text-circlo-green" /> Item Pesanan
                </h2>
                <div className="mt-5 rounded-xl border border-dashed border-circlo-line px-5 py-10 text-center text-[14px] text-circlo-muted">
                  Data item pesanan akan dimuat dari <code className="rounded bg-circlo-field px-1.5 py-0.5">detail_pesanan</code>.
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow-card">
                  <h2 className="flex items-center gap-2 font-display text-[19px] font-semibold text-circlo-ink">
                    <MapPin className="h-5 w-5 text-circlo-green" /> Alamat Pengiriman
                  </h2>
                  <p className="mt-4 text-[14px] text-circlo-muted">Belum ada alamat pada pesanan ini.</p>
                </div>
                <div className="rounded-2xl bg-white p-6 shadow-card">
                  <h2 className="flex items-center gap-2 font-display text-[19px] font-semibold text-circlo-ink">
                    <CreditCard className="h-5 w-5 text-circlo-green" /> Pembayaran
                  </h2>
                  <p className="mt-4 text-[14px] text-circlo-muted">Metode pembayaran belum dipilih.</p>
                </div>
              </section>

              <section className="rounded-2xl bg-white p-6 shadow-card">
                <h2 className="flex items-center gap-2 font-display text-[19px] font-semibold text-circlo-ink">
                  <ReceiptText className="h-5 w-5 text-circlo-green" /> Riwayat Status
                </h2>
                <ol className="mt-5 space-y-4">
                  {timeline.map((label, index) => (
                    <li key={label} className="flex items-center gap-3 text-[14px]">
                      <span
                        className={`h-3 w-3 shrink-0 rounded-full ${index === 0 ? 'bg-circlo-green' : 'bg-circlo-line'}`}
                      />
                      <span className={index === 0 ? 'font-medium text-circlo-ink' : 'text-circlo-muted'}>{label}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <aside className="h-fit rounded-2xl bg-white p-6 shadow-card">
              <h2 className="font-display text-[19px] font-semibold text-circlo-ink">Ringkasan Biaya</h2>
              <dl className="mt-4 space-y-3 text-[14px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-circlo-muted">Subtotal</dt>
                  <dd className="font-medium text-circlo-ink">Rp0</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-circlo-muted">Ongkos kirim</dt>
                  <dd className="font-medium text-circlo-ink">Rp0</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-circlo-line pt-3">
                  <dt className="font-semibold text-circlo-ink">Total</dt>
                  <dd className="font-semibold text-circlo-ink">Rp0</dd>
                </div>
              </dl>
              <p className="mt-4 text-[12.5px] leading-relaxed text-circlo-muted">
                Ambil data pesanan dari endpoint <code className="rounded bg-circlo-field px-1.5 py-0.5">/api/orders</code> lalu
                saring berdasarkan ID pesanan.
              </p>
            </aside>
          </div>
        </main>
        <Footer />
      </RoleGate>
    </>
  );
}
