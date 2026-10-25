'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, MapPin, Pencil, Plus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import { isDemoStore, listMyMaterials } from '@/lib/materials';

const rupiah = (n) => `Rp${Number(n || 0).toLocaleString('id-ID')}`;

// Halaman ini tidak punya mockup di SRS, jadi tampilannya mengikuti kartu material di halaman lain.
function MyMaterials() {
  const [state, setState] = useState({ loading: true, rows: [], error: '' });

  useEffect(() => {
    let active = true;
    listMyMaterials()
      .then(({ rows }) => active && setState({ loading: false, rows, error: '' }))
      .catch((err) => active && setState({ loading: false, rows: [], error: err.message }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <main className="w-full px-10 pt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[32px] font-semibold leading-tight">My Materials</h1>
            <p className="mt-2 text-[16px] text-circlo-muted">Kelola material yang sudah Anda unggah ke CIRCLO.</p>
          </div>
          <Link href="/upload-material" className="flex items-center gap-2 rounded-lg bg-circlo-green px-6 py-3 text-[14px] font-medium text-white hover:brightness-110">
            <Plus className="h-4 w-4" /> Upload Material
          </Link>
        </div>

        {isDemoStore && (
          <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900">
            Mode demo: Supabase belum dikonfigurasi, jadi daftar ini hanya tersimpan di browser ini dan tidak dibagikan ke pengguna lain.
          </p>
        )}

        {state.error && (
          <p role="alert" className="mt-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700">
            <CircleAlert className="h-4 w-4 shrink-0" /> {state.error}
          </p>
        )}

        {state.loading ? (
          <div className="h-[40vh]" aria-busy="true" />
        ) : state.rows.length === 0 && !state.error ? (
          <div className="mt-10 rounded-2xl bg-white p-12 text-center shadow-card">
            <p className="text-[16px] text-circlo-muted">Belum ada material. Mulai dengan mengunggah sisa material Anda.</p>
            <Link href="/upload-material" className="mt-5 inline-block rounded-lg bg-circlo-green px-7 py-3 text-[14px] font-medium text-white">
              Upload Material
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {state.rows.map((m) => (
              <li key={m.id} className="overflow-hidden rounded-2xl bg-white shadow-card">
                <div className="relative h-[190px] w-full bg-circlo-field">
                  {m.foto_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.foto_url} alt={m.nama} className="h-full w-full object-cover" />
                  )}
                  <span className="absolute left-4 top-4 rounded-full bg-circlo-olive px-3 py-1 text-[12px] font-semibold text-circlo-green">{m.jenis_material}</span>
                </div>
                <div className="p-6">
                  <h2 className="font-display text-[20px] font-semibold leading-tight">{m.nama}</h2>
                  <p className="mt-1 text-[14px] text-circlo-muted">{m.deskripsi}</p>
                  <dl className="mt-4 space-y-1.5 text-[14px]">
                    <div className="flex justify-between"><dt className="text-circlo-muted">Quantity</dt><dd className="font-medium">{m.jumlah}</dd></div>
                    <div className="flex justify-between"><dt className="text-circlo-muted">Price</dt><dd className="font-medium">{rupiah(m.harga)}</dd></div>
                    <div className="flex justify-between"><dt className="text-circlo-muted">Condition</dt><dd className="font-medium">{m.kondisi_seller || m.kondisi}</dd></div>
                    <div className="flex justify-between"><dt className="text-circlo-muted">Location</dt><dd className="flex items-center gap-1 font-medium"><MapPin className="h-3.5 w-3.5" />{m.lokasi}</dd></div>
                  </dl>
                  <Link
                    href={`/upload-material?id=${m.id}`}
                    className="mt-5 flex h-[46px] items-center justify-center gap-2 rounded-lg border border-circlo-green/60 text-[14px] font-medium hover:bg-circlo-bg"
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function MyMaterialsPage() {
  return (
    <>
      <Navbar />
      <RoleGate allow={['seller']}>
        <MyMaterials />
      </RoleGate>
    </>
  );
}
