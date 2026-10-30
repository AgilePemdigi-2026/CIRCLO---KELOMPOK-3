import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';

const tabs = ['Semua', 'Menunggu Konfirmasi', 'Diproses', 'Dikirim', 'Selesai'];

export default function SellerOrdersPage() {
  return (
    <>
      <Navbar />
      <RoleGate allow={['seller']}>
        <main className="mx-auto w-full max-w-[1100px] px-6 py-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-[30px] font-semibold leading-tight text-circlo-ink">
                Kelola Pesanan
              </h1>
              <p className="mt-2 text-[15px] text-circlo-muted">
                Konfirmasi pesanan masuk, perbarui status, dan selesaikan transaksi pembeli.
              </p>
            </div>
            <Link
              href="/seller/kpi"
              className="rounded-lg border border-circlo-green/60 px-5 py-2.5 text-[14px] font-medium text-circlo-ink hover:bg-circlo-bg"
            >
              KPI Penjualan
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {tabs.map((tab, index) => (
              <span
                key={tab}
                className={`rounded-full border px-4 py-2 text-[13px] font-medium ${
                  index === 0
                    ? 'border-circlo-green bg-circlo-green text-white'
                    : 'border-circlo-line bg-white text-circlo-muted'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-white p-12 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-circlo-soft">
              <ClipboardList className="h-7 w-7 text-circlo-green" />
            </span>
            <h2 className="mt-5 font-display text-[20px] font-semibold text-circlo-ink">Belum ada pesanan masuk</h2>
            <p className="mt-2 text-[14px] text-circlo-muted">
              Pesanan dari pembeli akan muncul di sini setelah materialmu dipesan.
            </p>
          </div>
        </main>
        <Footer />
      </RoleGate>
    </>
  );
}
