import { jumlah } from "./ui";

export default function PeluangPengembangan({ peluang = [], peluangKota = [] }) {
  if (peluang.length === 0 && peluangKota.length === 0) {
    return (
      <section className="rounded-xl border border-[#d6e6b3] bg-[#f7fbef] p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Peluang Pengembangan</h2>
        <p className="py-6 text-center text-sm text-slate-500">
          Belum ada kategori atau wilayah dengan permintaan di atas pasokan.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#d6e6b3] bg-[#f7fbef] p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Peluang Pengembangan</h2>
      <p className="mt-1 text-xs text-slate-500">
        Kelompok dengan permintaan lebih besar daripada pasokan yang tercatat.
      </p>

      {peluang.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kategori dan satuan</p>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {peluang.map((r) => (
              <li key={`${r.kategori}-${r.satuan}`} className="rounded-lg border border-[#d6e6b3] bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">{r.kategori}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Permintaan {jumlah(r.permintaan)} {r.satuan} vs pasokan {jumlah(r.pasokan)} {r.satuan}
                </p>
                <p className="mt-1 text-xs font-semibold text-red-700">
                  Kekurangan {jumlah(r.permintaan - r.pasokan)} {r.satuan}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {peluangKota.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wilayah (khusus satuan kg)</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {peluangKota.map((r) => (
              <li key={r.kota} className="rounded-full border border-[#d6e6b3] bg-white px-3 py-1.5 text-xs text-slate-700">
                <strong>{r.kota}</strong>: permintaan {jumlah(r.permintaanKg)} kg, pasokan {jumlah(r.pasokanKg)} kg
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}