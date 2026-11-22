export const jumlah = (n) =>
  Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

export function formatBerat(kg) {
  if (kg >= 1000)
    return { angka: (kg / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 }), unit: "Ton Dialihkan" };
  return { angka: Number(kg).toLocaleString("id-ID"), unit: "Kg Dialihkan" };
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}

export function Badge({ tren }) {
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

export function KartuKpi({ ikon, angka, label, tren }) {
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