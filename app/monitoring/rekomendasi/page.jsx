"use client";

import { useGovernment } from "@/components/government/GovernmentContext";
import InsightAI from "@/components/government/InsightAI";
import PeluangPengembangan from "@/components/government/PeluangPengembangan";
import KondisiWilayah from "@/components/government/KondisiWilayah";

export default function RekomendasiPage() {
  const { data } = useGovernment();

  return (
    <div className="space-y-6">
      <InsightAI />
      <PeluangPengembangan peluang={data.peluang || []} peluangKota={data.peluangKota || []} />
      <KondisiWilayah wilayah={data.wilayah} />
    </div>
  );
}