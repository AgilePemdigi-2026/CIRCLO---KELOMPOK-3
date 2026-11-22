"use client";

import { useState } from "react";
import { GovernmentProvider, PERIODE, useGovernment } from "./GovernmentContext";
import { HIJAU } from "./format";
import { Skeleton } from "./ui";

const selectCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#3a6b0d] focus:outline-none focus:ring-2 focus:ring-[#3a6b0d]/20";

function Isi({ children }) {
  const {
    periode, setPeriode, kategori, setKategori, kota, setKota,
    data, opsi, loading, error, akses, muat, ekspor,
  } = useGovernment();
  const [bukaFilter, setBukaFilter] = useState(true);

  const labelPeriode = PERIODE.find((p) => p.v === periode)?.t;

  return (
    <div className="space-y-6">
      {/* Judul + aksi */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Monitoring Ekosistem</h1>
          <p className="mt-1 text-sm text-slate-500">
            Dashboard Statistik Ekosistem untuk memantau distribusi dan penyerapan material.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={ekspor}
            disabled={!data}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            ⭳ Ekspor Laporan
          </button>
          <button
            type="button"
            onClick={() => setBukaFilter((v) => !v)}
            aria-expanded={bukaFilter}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            style={{ background: HIJAU }}
          >
            ☰ Saring Data
          </button>
        </div>
      </div>

      {/* Filter */}
      {bukaFilter && (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
          <div>
            <label htmlFor="period" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Periode Monitoring
            </label>
            <select id="period" name="Period" value={periode} onChange={(e) => setPeriode(e.target.value)} className={selectCls}>
              {PERIODE.map((p) => (
                <option key={p.v} value={p.v}>{p.t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="material-category" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Kategori Material
            </label>
            <select id="material-category" name="Material Category" value={kategori} onChange={(e) => setKategori(e.target.value)} className={selectCls}>
              <option value="">Semua kategori</option>
              {opsi.kategori.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="wilayah" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Wilayah
            </label>
            <select id="wilayah" name="Region" value={kota} onChange={(e) => setKota(e.target.value)} className={selectCls}>
              <option value="">Semua wilayah</option>
              {opsi.kota.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Akses ditolak */}
      {akses && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">{akses}</p>
          <a href="/login" className="mt-2 inline-block text-sm font-medium underline">Ke halaman login</a>
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">{error}</p>
          <button type="button" onClick={muat} className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-red-100">
            Muat ulang
          </button>
        </div>
      )}

      {/* Skeleton hanya saat pertama kali memuat */}
      {loading && !data && !error && !akses && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      )}

      {data && !error && (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {(periode !== "semua" || kategori) && (
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              {kategori && periode !== "semua"
                ? `Statistik Berdasarkan Kategori dan Periode: ${kategori}, ${labelPeriode}`
                : kategori
                  ? `Statistik Berdasarkan Kategori: ${kategori}`
                  : `Data Berdasarkan Periode: ${labelPeriode}`}
            </h2>
          )}
          {children}
          <p className="mt-6 text-xs text-slate-400">
            Dashboard bersifat read-only. Terakhir diperbarui {new Date(data.diperbarui).toLocaleString("id-ID")}.
          </p>
        </div>
      )}
    </div>
  );
}

export default function MonitoringShell({ children }) {
  return (
    <GovernmentProvider>
      <Isi>{children}</Isi>
    </GovernmentProvider>
  );
}