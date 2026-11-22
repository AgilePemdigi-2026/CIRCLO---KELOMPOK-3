import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';

const columns = ['Material', 'Stok', 'Harga', 'Status', 'Aksi'];

export default function SellerCatalogPage() {
  return (
    <>
      <Navbar />
      <RoleGate allow={['seller']}>
        <main className="mx-auto w-full max-w-[1100px] px-6 py-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-[30px] font-semibold leading-tight text-circlo-ink">
                Kelola Katalog
              </h1>
              <p className="mt-2 text-[15px] text-circlo-muted">
                Atur material yang tayang di katalog, perbarui stok, harga, dan statusnya.
              </p>
            </div>
            <Link
              href="/upload-material"
              className="inline-flex items-center gap-2 rounded-lg bg-circlo-green px-5 py-2.5 text-[14px] font-medium text-white hover:brightness-110"
            >
              <Plus className="h-4 w-4" /> Tambah Material
            </Link>
          </div>

          <div className="mt-8 rounded-2xl bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-circlo-line px-6 py-5">
              <div className="flex items-center gap-2 rounded-lg border border-circlo-fieldline bg-circlo-field px-3">
                <Search className="h-4 w-4 text-circlo-muted" />
                <input
                  type="search"
                  placeholder="Cari material..."
                  className="h-10 w-56 bg-transparent text-[14px] outline-none placeholder:text-circlo-muted"
                />
              </div>
              <Link href="/my-materials" className="text-[14px] font-medium text-circlo-green hover:underline">
                Buka daftar My Materials
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-circlo-line text-[13px] uppercase tracking-wide text-circlo-muted">
                    {columns.map((column) => (
                      <th key={column} className="px-6 py-4 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-14 text-center text-circlo-muted">
                      Belum ada material. Tambahkan material pertamamu untuk mulai berjualan.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-4 text-[13px] text-circlo-muted">
            Data material tersambung dengan <code className="rounded bg-circlo-field px-1.5 py-0.5">lib/materials.js</code> dan
            halaman <Link href="/my-materials" className="font-medium text-circlo-green hover:underline">/my-materials</Link>.
          </p>
        </main>
        <Footer />
      </RoleGate>
    </>
  );
}
