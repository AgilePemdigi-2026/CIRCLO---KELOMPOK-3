import { jumlah } from "./ui";

export default function NeracaPasokan({ neraca = [] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Neraca Pasokan vs Permintaan</h2>
          <p className="mt-1 text-xs text-slate-500">
            Pasokan = stok aktif saat ini. Permintaan = kuantitas dipesan pada periode terpilih.
            Satuan dipisah agar kg tidak dicampur dengan pcs/m2.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {neraca.length} kelompok kategori/satuan
        </span>
      </div>

      {neraca.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Belum ada data pasokan atau permintaan untuk filter ini.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2 font-semibold">Kategori</th>
                <th className="px-2 py-2 font-semibold">Satuan</th>
                <th className="px-2 py-2 text-right font-semibold">Pasokan</th>
                <th className="px-2 py-2 text-right font-semibold">Permintaan</th>
                <th className="px-2 py-2 text-right font-semibold">Selisih</th>
                <th className="px-2 py-2 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {neraca.map((r) => {
                const defisit = r.permintaan > r.pasokan;
                return (
                  <tr key={`${r.kategori}-${r.satuan}`} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-2.5 font-medium text-slate-800">{r.kategori}</td>
                    <td className="px-2 py-2.5 text-slate-500">{r.satuan}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{jumlah(r.pasokan)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{jumlah(r.permintaan)}</td>
                    <td className={`px-2 py-2.5 text-right font-semibold tabular-nums ${r.selisih < 0 ? "text-red-700" : "text-green-700"}`}>
                      {r.selisih > 0 ? "+" : ""}
                      {jumlah(r.selisih)}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${defisit ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {defisit ? "Defisit" : "Cukup"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}