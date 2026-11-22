"use client";

import { useState } from "react";
import { HIJAU, angka, rupiah, rupiahRingkas } from "./format";

const METRIK = [
  { v: "nilai", t: "Nilai transaksi", ambil: (b) => b.nilai, tampil: (n) => rupiahRingkas(n), detail: (n) => rupiah(n) },
  { v: "pesanan", t: "Pesanan", ambil: (b) => b.pesanan, tampil: (n) => angka(n), detail: (n) => `${angka(n)} pesanan` },
  { v: "kg", t: "Material dialihkan (kg)", ambil: (b) => b.kg, tampil: (n) => angka(n), detail: (n) => `${angka(n)} kg` },
];

// Tren 6 bulan terakhir. Mengikuti filter kategori dan wilayah, tetapi tidak mengikuti filter periode.
export default function TrenBulanan({ tren }) {
  const [metrik, setMetrik] = useState("nilai");
  const m = METRIK.find((x) => x.v === metrik);
  const maks = Math.max(1, ...tren.map(m.ambil));
  const kosong = tren.every((b) => m.ambil(b) === 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Tren bulanan">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Tren Bulanan</h2>
          <p className="text-xs text-slate-400">6 bulan terakhir, pesanan yang tidak ditolak/dibatalkan</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="Pilih metrik tren">
          {METRIK.map((x) => (
            <button
              key={x.v}
              type="button"
              onClick={() => setMetrik(x.v)}
              aria-pressed={metrik === x.v}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                metrik === x.v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {x.t.split(" (")[0]}
            </button>
          ))}
        </div>
      </div>

      {kosong ? (
        <p className="py-16 text-center text-sm text-slate-500">Belum ada transaksi pada 6 bulan terakhir.</p>
      ) : (
        <div className="mt-6 flex h-56 items-end gap-3" role="img" aria-label={`Tren bulanan ${m.t}: ${tren.map((b) => `${b.label} ${m.detail(m.ambil(b))}`).join("; ")}`}>
          {tren.map((b) => {
            const v = m.ambil(b);
            return (
              <div key={b.kunci} className="flex h-full flex-1 flex-col justify-end" title={`${b.label}: ${m.detail(v)}`}>
                <span className="mb-1 text-center text-[10px] font-medium tabular-nums text-slate-600">{v ? m.tampil(v) : ""}</span>
                <div className="w-full rounded-t" style={{ height: `${(v / maks) * 100}%`, minHeight: v ? 3 : 0, background: HIJAU }} />
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-2 flex gap-3">
        {tren.map((b) => (
          <div key={b.kunci} className="flex-1 text-center text-[11px] font-medium text-slate-600">{b.label}</div>
        ))}
      </div>
    </section>
  );
}