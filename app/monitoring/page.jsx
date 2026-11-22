"use client";

import { useGovernment } from "@/components/government/GovernmentContext";
import InsightAI from "@/components/government/InsightAI";
import TrenBulanan from "@/components/government/TrenBulanan";
import { KartuKpi, formatBerat } from "@/components/government/ui";
import { persen, rupiahRingkas } from "@/components/government/format";

export default function RingkasanPage() {
  const { data } = useGovernment();
  const berat = formatBerat(data.kpi.terserapKg);

  return (
    <div className="space-y-6">
      <InsightAI ringkas />

      <div className="grid gap-4 sm:grid-cols-3">
        <KartuKpi ikon="♻️" angka={berat.angka} label={berat.unit} tren={data.kpi.trenKg} />
        <KartuKpi ikon="🤝" angka={data.kpi.pesananBerhasil.toLocaleString("id-ID")} label="Kecocokan Berhasil (pesanan)" tren={data.kpi.trenPesanan} />
        <KartuKpi ikon="👥" angka={data.kpi.pengelolaAktif.toLocaleString("id-ID")} label="Pengelola Aktif" tren={data.kpi.trenPengelola} />
        <KartuKpi ikon="💰" angka={rupiahRingkas(data.kpi.nilaiTransaksi)} label="Nilai Transaksi" tren={data.kpi.trenNilai} />
        <KartuKpi ikon="📈" angka={persen(data.kpi.rasioSerapan)} label="Rasio Serapan Material" />
        <KartuKpi ikon="📍" angka={`${data.kpi.wilayahAktif}/${data.kpi.totalWilayah}`} label="Kota/Kabupaten Bertransaksi" />
      </div>

      <TrenBulanan tren={data.trenBulanan} />
    </div>
  );
}