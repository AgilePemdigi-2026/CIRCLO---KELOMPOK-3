"use client";

import { useCallback, useEffect, useState } from "react";

const HIJAU = "#3a6b0d";
const HIJAU_MUDA = "#bcd98a";

const PERIODE = [
  { v: "semua", t: "Semua periode" },
  { v: "7", t: "7 hari terakhir" },
  { v: "30", t: "30 hari terakhir" },
  { v: "90", t: "90 hari terakhir" },
];

function formatBerat(kg) {
  if (kg >= 1000) return { angka: (kg / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 }), unit: "Ton Dialihkan" };
  return { angka: Number(kg).toLocaleString("id-ID"), unit: "Kg Dialihkan" };
}

function Badge({ tren }) {
  const t = tren || { label: "Stabil", arah: "tetap" };
  const warna =
    t.arah === "naik"
      ? "bg-green-100 text-green-800"
      : t.arah === "turun"
        ? "bg-red-100 text-red-800"
        : "bg-slate-100 text-slate-600";
  const panah = t.arah === "naik" ? "↗ " : t.arah === "turun" ? "↘ " : "→ ";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${warna}`}>{panah}{t.label}</span>;
}

function KartuKpi({ ikon, angka, label, tren }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e8f1da] text-lg">{ikon}</span>
        <Badge tren={tren} />
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{angka}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}

export default function GovernmentDashboard() {
  const [periode, setPeriode] = useState("semua");
  const [kategori, setKategori] = useState("");
  const [kota, setKota] = useState("");
  const [bukaFilter, setBukaFilter] = useState(true);

  const [data, setData] = useState(null);
  const [opsi, setOpsi] = useState({ kategori: [], kota: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [akses, setAkses] = useState(""); // pesan jika bukan Pemerintah / belum login

  const [insight, setInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(true);

  const muat = useCallback(async () => {
    const qs = new URLSearchParams({ periode, kategori, kota }).toString();
    setLoading(true);
    setLoadingInsight(true);
    setError("");
    setAkses("");

    // Statistik dulu (cepat), insight AI belakangan supaya dashboard tidak menunggu AI.
    try {
      const res = await fetch(`/api/government?${qs}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        setData(null);
        setAkses(json.error || "Halaman ini khusus Pemerintah/Admin.");
        setLoading(false);
        setLoadingInsight(false);
        return;
      }
      if (!res.ok || json.error) throw new Error(json.error || "Data gagal dimuat");
      setData(json);
      // Opsi dari server selalu berisi semua kategori/kota (tidak menyempit saat difilter).
      setOpsi(json.opsi);
      setInsight({ teks: json.insightAturan, sumber: "aturan" });
    } catch (e) {
      setData(null);
      setError("Data gagal dimuat");
      setLoading(false);
      setLoadingInsight(false);
      return;
    }
    setLoading(false);

    try {
      const res = await fetch(`/api/government/insight?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.teks) setInsight(json);
    } catch {
      /* tetap pakai ringkasan otomatis */
    } finally {
      setLoadingInsight(false);
    }
  }, [periode, kategori, kota]);

  useEffect(() => {
    muat();
  }, [muat]);

  function ekspor() {
    if (!data) return;
    const baris = [
      ["Kategori", "Jumlah Listing", "Material Terserap", "Material Belum Terserap"],
      ...data.kategori.map((r) => [r.kategori, r.listing, r.terserap, r.belum]),
    ];
    const csv = "﻿" + baris.map((b) => b.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-monitoring-ekosistem-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const labelPeriode = PERIODE.find((p) => p.v === periode)?.t;
  const maks = data ? Math.max(1, ...data.kategori.map((r) => r.listing)) : 1;
  const maksKota = data ? Math.max(1, ...data.hotspot.map((r) => r.listing + r.pesanan)) : 1;
  const berat = data ? formatBerat(data.kpi.terserapKg) : null;

  const selectCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#3a6b0d] focus:outline-none focus:ring-2 focus:ring-[#3a6b0d]/20";

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

      {/* Wawasan AI */}
      {!error && !akses && (
        <section
          aria-label="Wawasan AI"
          className="flex items-start gap-3 rounded-xl border border-[#d6e6b3] p-4"
          style={{ background: "linear-gradient(90deg,#dbe9a8 0%,#f3f8e6 60%,#ffffff 100%)" }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">✨</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-800">
              Wawasan AI
              {insight && !loadingInsight && (
                <span className="ml-2 rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-slate-500">
                  {insight.sumber === "ai" ? "dibuat oleh AI" : "ringkasan otomatis"}
                </span>
              )}
            </p>
            {loading || !insight ? (
              <Skeleton className="mt-2 h-4 w-3/4" />
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {insight.teks}
                {loadingInsight && <span className="ml-2 text-xs text-slate-400">memperbarui dengan AI…</span>}
              </p>
            )}
          </div>
        </section>
      )}

      {loading && !error && !akses && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      )}

      {data && !error && (
        <>
          {/* Keterangan filter aktif */}
          {periode !== "semua" && (
            <h2 className="text-sm font-semibold text-slate-700">
              {kategori
                ? `Statistik Berdasarkan Kategori dan Periode: ${kategori}, ${labelPeriode}`
                : `Data Berdasarkan Periode: ${labelPeriode}`}
            </h2>
          )}
          {periode === "semua" && kategori && (
            <h2 className="text-sm font-semibold text-slate-700">Statistik Berdasarkan Kategori: {kategori}</h2>
          )}

          {/* KPI Laporan */}
          <div className="grid gap-4 sm:grid-cols-3">
            <KartuKpi ikon="♻️" angka={berat.angka} label={berat.unit} tren={data.kpi.trenKg} />
            <KartuKpi ikon="🤝" angka={data.kpi.pesananBerhasil.toLocaleString("id-ID")} label="Kecocokan Berhasil (pesanan)" tren={data.kpi.trenPesanan} />
            <KartuKpi ikon="👥" angka={data.kpi.pengelolaAktif.toLocaleString("id-ID")} label="Pengelola Aktif" tren={data.kpi.trenPengelola} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Chart distribusi */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
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

            {/* Titik panas */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Titik Panas Aktivitas</h2>
              <p className="text-xs text-slate-400">Wilayah dengan listing dan pesanan terbanyak</p>
              {data.hotspot.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">Belum ada data.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.hotspot.map((h) => (
                    <li key={h.kota}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-medium text-slate-800">{h.kota}</span>
                        <span className="text-xs text-slate-500">{h.listing} listing · {h.pesanan} pesanan</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${((h.listing + h.pesanan) / maksKota) * 100}%`, background: HIJAU }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <p className="text-xs text-slate-400">
            Dashboard bersifat read-only. Terakhir diperbarui {new Date(data.diperbarui).toLocaleString("id-ID")}.
          </p>
        </>
      )}
    </div>
  );
}
