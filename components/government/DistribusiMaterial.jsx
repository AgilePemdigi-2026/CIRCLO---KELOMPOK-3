"use client";

import { HIJAU, HIJAU_MUDA } from "./format";

export default function DistribusiMaterial({ data }) {
  const maks = Math.max(1, ...data.kategori.map((r) => r.listing));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900">Statistik Distribusi Material</h2>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: HIJAU }} />
            Material Terserap: {data.ringkasan.terserap}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: HIJAU_MUDA }} />
            Material Belum Terserap: {data.ringkasan.belumTerserap}
          </span>
        </div>
      </div>

      {data.kategori.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">Belum ada data untuk filter ini.</p>
      ) : (
        <div className="mt-6 flex">
          <div className="flex h-56 flex-col justify-between pr-2 text-right text-[10px] text-slate-400">
            {[maks, Math.round(maks * 0.75), Math.round(maks * 0.5), Math.round(maks * 0.25), 0].map((n, i) => (
              <span key={i}>{n}</span>
            ))}
          </div>
          <div className="relative flex-1 overflow-x-auto">
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-56 flex-col justify-between">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-slate-100" />
              ))}
            </div>
            <div className="relative flex h-56 min-w-max items-end gap-5 px-2">
              {data.kategori.map((r) => (
                <div key={r.kategori} className="flex h-full w-14 flex-col justify-end" title={`${r.kategori}: ${r.terserap} terserap, ${r.belum} belum terserap`}>
                  <div className="flex flex-1 items-end justify-center gap-1">
                    <div className="w-5 rounded-t" style={{ height: `${(r.terserap / maks) * 100}%`, background: HIJAU, minHeight: r.terserap ? 3 : 0 }} />
                    <div className="w-5 rounded-t" style={{ height: `${(r.belum / maks) * 100}%`, background: HIJAU_MUDA, minHeight: r.belum ? 3 : 0 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex min-w-max gap-5 px-2 pt-2">
              {data.kategori.map((r) => (
                <div key={r.kategori} className="w-14 text-center text-[11px] font-medium text-slate-600">
                  {r.kategori}
                  <div className="text-[10px] font-normal text-slate-400">{r.listing} listing</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-400">
        Terserap = listing yang sudah dipesan (pesanan tidak ditolak/dibatalkan) pada periode terpilih.
      </p>
    </section>
  );
}