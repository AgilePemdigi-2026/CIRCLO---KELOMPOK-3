"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { barisLaporanWilayah } from "./ekspor";

export const PERIODE = [
  { v: "semua", t: "Semua periode" },
  { v: "7", t: "7 hari terakhir" },
  { v: "30", t: "30 hari terakhir" },
  { v: "90", t: "90 hari terakhir" },
];

const Ctx = createContext(null);

export function useGovernment() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGovernment harus dipakai di dalam GovernmentProvider");
  return v;
}

export function GovernmentProvider({ children }) {
  const [periode, setPeriode] = useState("semua");
  const [kategori, setKategori] = useState("");
  const [kota, setKota] = useState("");

  const [data, setData] = useState(null);
  const [opsi, setOpsi] = useState({ kategori: [], kota: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [akses, setAkses] = useState("");

  const [insight, setInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(true);

  const muat = useCallback(async () => {
    const qs = new URLSearchParams({ periode, kategori, kota }).toString();
    setLoading(true);
    setLoadingInsight(true);
    setError("");
    setAkses("");

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
      ...barisLaporanWilayah(data),
      [],
      ["Neraca Pasokan-Permintaan"],
      ["Kategori", "Satuan", "Pasokan", "Permintaan", "Selisih"],
      ...(data.neraca || []).map((r) => [r.kategori, r.satuan, r.pasokan, r.permintaan, r.selisih]),
    ];
    const csv = "\uFEFF" + baris.map((b) => b.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-monitoring-ekosistem-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const value = {
    periode, setPeriode, kategori, setKategori, kota, setKota,
    data, opsi, loading, error, akses, insight, loadingInsight, muat, ekspor,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}