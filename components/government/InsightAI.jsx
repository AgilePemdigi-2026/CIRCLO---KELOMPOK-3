"use client";

import Link from "next/link";
import { useGovernment } from "./GovernmentContext";
import { Skeleton } from "./ui";

// ringkas = true: versi singkat di halaman Ringkasan, dengan link ke Rekomendasi.
export default function InsightAI({ ringkas = false }) {
  const { insight, loading, loadingInsight } = useGovernment();

  return (
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
          <p className={`mt-1 text-sm leading-relaxed text-slate-700 ${ringkas ? "line-clamp-3" : ""}`}>
            {insight.teks}
            {loadingInsight && <span className="ml-2 text-xs text-slate-400">memperbarui dengan AI…</span>}
          </p>
        )}
        {ringkas && (
          <Link href="/monitoring/rekomendasi" className="mt-2 inline-block text-xs font-semibold text-[#3a6b0d] hover:underline">
            Lihat rekomendasi lengkap →
          </Link>
        )}
      </div>
    </section>
  );
}