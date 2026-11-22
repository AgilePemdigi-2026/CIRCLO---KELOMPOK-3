"use client";

import { useGovernment } from "@/components/government/GovernmentContext";
import DistribusiMaterial from "@/components/government/DistribusiMaterial";
import NeracaPasokan from "@/components/government/NeracaPasokan";

export default function MaterialPage() {
  const { data } = useGovernment();

  return (
    <div className="space-y-6">
      <DistribusiMaterial data={data} />
      <NeracaPasokan neraca={data.neraca || []} />
    </div>
  );
}