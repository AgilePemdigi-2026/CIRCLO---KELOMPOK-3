"use client";

import { useMemo, useState } from "react";
import { BadgeStatus, HIJAU, STATUS_INFO, angka, persen, rupiah } from "./format";

const URUTAN = [
  { v: "nilai", t: "Nilai transaksi", ambil: (w) => w.nilai },
  { v: "pesanan", t: "Jumlah pesanan", ambil: (w) => w.pesanan },
  { v: "serapan", t: "Rasio serapan", ambil: (w) => w.rasioSerapan },
  { v: "listing", t: "Jumlah listing", ambil: (w) => w.listing },
  { v: "batal", t: "Tingkat pembatalan", ambil: (w) => w.tingkatBatal },
  { v: "mengendap", t: "Stok mengendap", ambil: (w) => w.mengendap },
];

export default function WilayahTable({ wilayah }) {
  const [urut, setUrut] = useState("nilai");

  const baris = useMemo(() => {
    const ambil = URUTAN.find((u) => u.v === urut).ambil;
    return [...wilayah].sort((a, b) => ambil(b) - ambil(a) || a.kota.localeCompare(b.kota));
  }, [wilayah, urut]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Persebaran per kota dan kabupaten">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Persebaran per Kota/Kabupaten</h2>
          <p className="text-xs text-slate-400">Efektivitas jual beli material sirkular di tiap daerah</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="urut-wilayah" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Urutkan
          </label>
          <select
            id="urut-wilayah"
            value={urut}
            onChange={(e) => setUrut(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-[#3a6b0d] focus:outline-none focus:ring-2 focus:ring-[#3a6b0d]/20"
          >
            {URUTAN.map((u) => (
              <option key={u.v} value={u.v}>{u.t}</option>
            ))}
          </select>
        </div>
      </div>

      {baris.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">Belum ada data untuk filter ini.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="py-2 pr-3 font-semibold">Kota/Kabupaten</th>
                <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Listing</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Seller</th>
                <th scope="col" className="px-3 py-2 font-semibold">Serapan</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Pesanan</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Nilai transaksi</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Dialihkan</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Batal</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">Mengendap</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((w) => (
                <tr key={w.kota} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="py-3 pr-3 font-medium text-slate-900">
                    {w.kota}
                    {w.kategoriDominan && (
                      <span className="block text-xs font-normal text-slate-400">Dominan: {w.kategoriDominan}</span>
                    )}
                  </th>
                  <td className="px-3 py-3"><BadgeStatus status={w.status} label={STATUS_INFO[w.status].label} /></td>
                  <td className="px-3 py-3 text-right tabular-nums">{angka(w.listing)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{angka(w.seller)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100" role="presentation">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, w.rasioSerapan)}%`, background: HIJAU }} />
                      </div>
                      <span className="text-xs tabular-nums text-slate-600">{persen(w.rasioSerapan)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{angka(w.pesanan)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{rupiah(w.nilai)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {angka(w.kg)} kg
                    {w.unitLain > 0 && <span className="block text-xs text-slate-400">+{angka(w.unitLain)} unit lain</span>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{persen(w.tingkatBatal)}</td>
                  <td className="py-3 pl-3 text-right tabular-nums">{angka(w.mengendap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Serapan = listing yang sudah dipesan dibagi total listing. Batal = pesanan ditolak/dibatalkan dibagi seluruh
        pesanan. Mengendap = listing aktif berumur lebih dari 30 hari yang belum pernah dipesan.
      </p>
    </section>
  );
}