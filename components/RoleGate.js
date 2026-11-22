'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { LOGIN_PATH, useRole } from '@/lib/auth';

const LABEL = { buyer: 'Buyer', seller: 'Seller', government: 'Pemerintah' };

// Hanya tampilkan children kalau role pengguna termasuk dalam `allow`.
export default function RoleGate({ allow, children }) {
  const { role, loading } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !role) router.replace(LOGIN_PATH);
  }, [loading, role, router]);

  if (loading || !role) return <div className="h-[60vh]" aria-busy="true" />;

  if (!allow.includes(role)) {
    return (
      <main className="mx-auto max-w-[520px] px-4 pt-24 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-circlo-soft">
          <Lock className="h-6 w-6 text-circlo-green" />
        </span>
        <h1 className="mt-5 font-display text-[24px] font-semibold">Halaman ini khusus {allow.map((r) => LABEL[r]).join(' / ')}</h1>
        <p className="mt-2 text-[15px] text-circlo-muted">Kamu masuk sebagai {LABEL[role]}, jadi halaman ini tidak bisa dibuka.</p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-lg bg-circlo-green px-7 py-3 text-[14px] font-medium text-white">
          Kembali ke Beranda
        </Link>
      </main>
    );
  }

  return children;
}
