import Link from 'next/link';
import { ArrowUpRight, Package, ShoppingBag, TrendingUp, Wallet } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';

const cards = [
  { label: 'Total Penjualan', value: 'Rp0', hint: 'Belum ada transaksi', icon: Wallet },
  { label: 'Pesanan Masuk', value: '0', hint: 'Menunggu konfirmasi', icon: ShoppingBag },
  { label: 'Material Aktif', value: '0', hint: 'Tayang di katalog', icon: Package },
  { label: 'Rata-rata Nilai Pesanan', value: 'Rp0', hint: 'Per pesanan', icon: TrendingUp },
];

export default function SellerKpiPage() {
  return (
    <>
      <Navbar />
      <RoleGate allow={['seller']}>
        <main className="mx-auto w-full max-w-[1100px] px-6 py-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-[30px] font-semibold leading-tight text-circlo-ink">
                KPI Ringkasan Penjualan
              </h1>
              <p className="mt-2 text-[15px] text-circlo-muted">
                Pantau performa penjualan dan aktivitas pesanan tokomu.
              </p>
            </div>
            <Link
              href="/seller/orders"
              className="inline-flex items-center gap-2 rounded-lg bg-circlo-green px-5 py-2.5 text-[14px] font-medium text-white hover:brightness-110"
            >
              Lihat Pesanan <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, hint, icon: Icon }) => (
              <article key={label} className="rounded-2xl bg-white p-6 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13.5px] font-medium text-circlo-muted">{label}</p>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-circlo-soft">
                    <Icon className="h-5 w-5 text-circlo-green" />
                  </span>
                </div>
                <p className="mt-4 font-display text-[28px] font-semibold text-circlo-ink">{value}</p>
                <p className="mt-1 text-[13px] text-circlo-muted">{hint}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl bg-white p-6 shadow-card">
              <h2 className="font-display text-[20px] font-semibold text-circlo-ink">Pesanan Terbaru</h2>
              <p className="mt-1 text-[14px] text-circlo-muted">
                Daftar pesanan terakhir beserta statusnya akan tampil di sini.
              </p>
              <div className="mt-5 rounded-xl border border-dashed border-circlo-line p-8 text-center text-[14px] text-circlo-muted">
                Belum ada data pesanan.
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-card">
              <h2 className="font-display text-[20px] font-semibold text-circlo-ink">Material Terlaris</h2>
              <p className="mt-1 text-[14px] text-circlo-muted">
                Material dengan penjualan tertinggi akan tampil di sini.
              </p>
              <div className="mt-5 rounded-xl border border-dashed border-circlo-line p-8 text-center text-[14px] text-circlo-muted">
                Belum ada data material terjual.
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </RoleGate>
    </>
  );
}
