import { WARNA_STATUS, angka } from "./format";

const W = 560;
const H = 340;
const PAD = { kiri: 44, kanan: 24, atas: 20, bawah: 44 };

// Matriks pasokan (listing) lawan permintaan (pesanan) per kota/kabupaten.
// Garis putus-putus = rata-rata seluruh wilayah, membagi grafik menjadi empat kuadran.
export default function MatriksPasokan({ wilayah }) {
  const dalam = wilayah.filter((w) => w.listing > 0 || w.pesanan > 0);
  const maksX = Math.max(1, ...dalam.map((w) => w.listing));
  const maksY = Math.max(1, ...dalam.map((w) => w.pesanan));
  const rataX = dalam.length ? dalam.reduce((a, w) => a + w.listing, 0) / dalam.length : 0;
  const rataY = dalam.length ? dalam.reduce((a, w) => a + w.pesanan, 0) / dalam.length : 0;

  const lebar = W - PAD.kiri - PAD.kanan;
  const tinggi = H - PAD.atas - PAD.bawah;
  const x = (v) => PAD.kiri + (v / (maksX * 1.1)) * lebar;
  const y = (v) => PAD.atas + tinggi - (v / (maksY * 1.1)) * tinggi;

  const ringkasan = dalam
    .map((w) => `${w.kota}: ${w.listing} listing, ${w.pesanan} pesanan`)
    .join("; ");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Matriks pasokan dan permintaan">
      <h2 className="text-base font-bold text-slate-900">Matriks Pasokan vs Permintaan</h2>
      <p className="text-xs text-slate-400">Menunjukkan daerah yang butuh promosi dan daerah yang butuh tambahan pasokan</p>

      {dalam.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">Belum ada data untuk filter ini.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Matriks pasokan dan permintaan. ${ringkasan}`} className="mt-3 h-auto w-full">
          {/* kuadran */}
          <rect x={PAD.kiri} y={PAD.atas} width={lebar} height={tinggi} fill="#fafcf5" stroke="#e2e8f0" />
          <line x1={x(rataX)} x2={x(rataX)} y1={PAD.atas} y2={PAD.atas + tinggi} stroke="#94a3b8" strokeDasharray="4 4" />
          <line x1={PAD.kiri} x2={PAD.kiri + lebar} y1={y(rataY)} y2={y(rataY)} stroke="#94a3b8" strokeDasharray="4 4" />

          <text x={PAD.kiri + 8} y={PAD.atas + 14} fontSize="10" fill="#7c3aed" fontWeight="600">Butuh pasokan</text>
          <text x={PAD.kiri + lebar - 8} y={PAD.atas + 14} fontSize="10" fill="#3a6b0d" fontWeight="600" textAnchor="end">Pasar aktif</text>
          <text x={PAD.kiri + 8} y={PAD.atas + tinggi - 8} fontSize="10" fill="#64748b" fontWeight="600">Belum berkembang</text>
          <text x={PAD.kiri + lebar - 8} y={PAD.atas + tinggi - 8} fontSize="10" fill="#d97706" fontWeight="600" textAnchor="end">Pasokan menumpuk</text>

          {/* sumbu */}
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <text x={PAD.kiri - 6} y={y(maksY * f) + 3} fontSize="10" fill="#94a3b8" textAnchor="end">{Math.round(maksY * f)}</text>
              <text x={x(maksX * f)} y={PAD.atas + tinggi + 14} fontSize="10" fill="#94a3b8" textAnchor="middle">{Math.round(maksX * f)}</text>
            </g>
          ))}
          <text x={PAD.kiri + lebar / 2} y={H - 8} fontSize="11" fill="#475569" textAnchor="middle">Pasokan (jumlah listing)</text>
          <text transform={`translate(12 ${PAD.atas + tinggi / 2}) rotate(-90)`} fontSize="11" fill="#475569" textAnchor="middle">Permintaan (pesanan)</text>

          {/* titik wilayah */}
          {dalam.map((w) => {
            const cx = x(w.listing);
            const cy = y(w.pesanan);
            const kananTepi = cx > PAD.kiri + lebar - 70;
            return (
              <g key={w.kota}>
                <title>{`${w.kota}: ${w.listing} listing, ${w.pesanan} pesanan, serapan ${angka(w.rasioSerapan)}%`}</title>
                <circle cx={cx} cy={cy} r="7" fill={(WARNA_STATUS[w.status] || WARNA_STATUS["belum-aktif"]).titik} fillOpacity="0.85" stroke="#fff" strokeWidth="1.5" />
                <text
                  x={kananTepi ? cx - 10 : cx + 10}
                  y={cy + 3.5}
                  fontSize="10.5"
                  fill="#334155"
                  textAnchor={kananTepi ? "end" : "start"}
                >
                  {w.kota}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <p className="mt-2 text-xs text-slate-400">Garis putus-putus menandai rata-rata seluruh wilayah.</p>
    </section>
  );
}