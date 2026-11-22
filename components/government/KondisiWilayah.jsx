import { BadgeStatus, STATUS_INFO, URUTAN_STATUS } from "./format";

// Pengelompokan kota/kabupaten berdasarkan status pasar, lengkap dengan saran tindak lanjut.
export default function KondisiWilayah({ wilayah }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Kondisi wilayah">
      <h2 className="text-base font-bold text-slate-900">Kondisi Wilayah</h2>
      <p className="text-xs text-slate-400">Pengelompokan kota/kabupaten dan tindak lanjut yang disarankan</p>
      {wilayah.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Belum ada data.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {URUTAN_STATUS.map((st) => {
            const daftar = wilayah.filter((w) => w.status === st);
            if (!daftar.length) return null;
            return (
              <li key={st}>
                <div className="flex items-center justify-between gap-2">
                  <BadgeStatus status={st} label={STATUS_INFO[st].label} />
                  <span className="text-xs text-slate-500">{daftar.length} wilayah</span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-800">{daftar.map((w) => w.kota).join(", ")}</p>
                <p className="text-xs text-slate-500">{STATUS_INFO[st].saran}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}