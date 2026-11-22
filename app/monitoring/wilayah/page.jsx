"use client";

import { useGovernment } from "@/components/government/GovernmentContext";
import MatriksPasokan from "@/components/government/MatriksPasokan";
import WilayahTable from "@/components/government/WilayahTable";

export default function WilayahPage() {
  const { data } = useGovernment();

  return (
    <div className="space-y-6">
      <MatriksPasokan wilayah={data.wilayah} />
      <WilayahTable wilayah={data.wilayah} />
    </div>
  );
}