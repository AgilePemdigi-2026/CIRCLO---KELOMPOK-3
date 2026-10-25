'use client';

import { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { takeFlash } from '@/lib/flash';

// Ditampilkan melayang di bawah navbar, tidak menggeser tata letak halaman.
export default function FlashBanner() {
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    const f = takeFlash();
    if (f) setFlash(f); // jangan menimpa dengan null (React Strict Mode menjalankan efek dua kali di dev)
  }, []);

  useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(null), 8000);
    return () => clearTimeout(t);
  }, [flash]);

  if (!flash) return null;
  const ok = flash.type !== 'error';

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[92px] z-50 flex justify-center px-4">
      <div
        role={ok ? 'status' : 'alert'}
        className={`pointer-events-auto flex max-w-[560px] items-start gap-3 rounded-xl border px-5 py-3.5 shadow-card ${
          ok ? 'border-circlo-lime/60 bg-circlo-soft text-circlo-green' : 'border-red-200 bg-red-50 text-red-700'
        }`}
      >
        {ok ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" /> : <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />}
        <div>
          <p className="text-[14.5px] font-semibold">{flash.text}</p>
          {flash.note && <p className="mt-0.5 text-[12.5px] font-normal opacity-80">{flash.note}</p>}
        </div>
        <button type="button" onClick={() => setFlash(null)} aria-label="Tutup pesan" className="ml-2 opacity-60 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
