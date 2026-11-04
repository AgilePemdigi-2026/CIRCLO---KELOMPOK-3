'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LOGIN_PATH, useRole } from '@/lib/auth';
import { dashboardPathFor } from '@/lib/roles';

// /dashboard dipakai oleh skenario SRS ("Given I am on /dashboard") dan tautan di Profil serta RoleGate.
// Halaman ini mengarahkan pengguna ke dashboard sesuai role: Buyer ke /buyer, Seller ke /seller.
export default function DashboardRedirect() {
  const { role, loading } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(role ? dashboardPathFor(role) : LOGIN_PATH);
  }, [loading, role, router]);

  return <div className="h-[60vh]" aria-busy="true" />;
}
