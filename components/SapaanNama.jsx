'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Menampilkan nama pengguna yang sedang login. Selama nama belum terbaca (atau akun
// tidak punya nama), yang tampil adalah "Buyer".
const KUNCI_NAMA = ['full_name', 'fullName', 'name', 'nama', 'nama_lengkap', 'display_name'];

export default function SapaanNama() {
  const [nama, setNama] = useState('Buyer');

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const meta = data?.user?.user_metadata || {};
        const kunci = KUNCI_NAMA.find((k) => typeof meta[k] === 'string' && meta[k].trim());
        if (kunci && !batal) setNama(meta[kunci].trim());
      } catch {
        // tetap "Buyer"
      }
    })();
    return () => {
      batal = true;
    };
  }, []);

  return <>{nama}</>;
}
