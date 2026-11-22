"use client";

import { useState } from "react";
import { WARNA_STATUS, STATUS_INFO, angka } from "./format";

const W = 960;
const H = 560;
const PAD = { kiri: 56, kanan: 32, atas: 28, bawah: 56 };

// Matriks pasokan (listing) lawan permintaan (pesanan) per kota/kabupaten.
// Garis putus-putus = rata-rata seluruh wilayah, membagi grafik menjadi empat kuadran.
// Nama kota hanya tampil saat titik di-hover (atau difokus lewat keyboard).
export default function MatriksPasokan({ wilayah }) {
  const [aktif, setAktif] = useState(null);

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

  // Titik yang di-hover digambar paling akhir supaya selalu di atas titik lain.
  const urut = [...dalam].sort((a, b) => (a.kota === aktif?.kota) - (b.kota === aktif?.kota));

  // Posisi kotak info mengikuti titik, tetapi dijaga agar tidak keluar dari grafik.
  const kotakW = 200;
  const kotakH = 78;
  let kx = 0;
  let ky = 0;
  if (aktif) {
    const cx = x(aktif.listing);
    const cy = y(aktif.pesanan);
    kx = cx + 14 + kotakW > W - PAD.kanan ? cx - 14 - kotakW : cx + 14;
    ky = Math.min(Math.max(cy - kotakH / 2, PAD.atas), PAD.atas + tinggi - kotakH);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Matriks pasokan dan permintaan">
      <h2 className="text-base font-bold text-slate-900">Matriks Pasokan vs Permintaan</h2>
      <p className="text-xs text-slate-400">
        Menunjukkan daerah yang butuh promosi dan daerah yang butuh tambahan pasokan. Arahkan kursor ke titik untuk melihat nama kota.
      </p>

      {dalam.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">Belum ada data untuk filter ini.</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Matriks pasokan dan permintaan. ${ringkasan}`}
          className="mt-3 h-auto w-full"
          onMouseLeave={() => setAktif(null)}
        >
          {/* kuadran */}
          <rect x={PAD.kiri} y={PAD.atas} width={lebar} height={tinggi} fill="#fafcf5" stroke="#e2e8f0" />
          <line x1={x(rataX)} x2={x(rataX)} y1={PAD.atas} y2={PAD.atas + tinggi} stroke="#94a3b8" strokeDasharray="4 4" />
          <line x1={PAD.kiri} x2={PAD.kiri + lebar} y1={y(rataY)} y2={y(rataY)} stroke="#94a3b8" strokeDasharray="4 4" />

          <text x={PAD.kiri + 10} y={PAD.atas + 18} fontSize="13" fill="#7c3aed" fontWeight="600">Butuh pasokan</text>
          <text x={PAD.kiri + lebar - 10} y={PAD.atas + 18} fontSize="13" fill="#3a6b0d" fontWeight="600" textAnchor="end">Pasar aktif</text>
          <text x={PAD.kiri + 10} y={PAD.atas + tinggi - 10} fontSize="13" fill="#64748b" fontWeight="600">Belum berkembang</text>
          <text x={PAD.kiri + lebar - 10} y={PAD.atas + tinggi - 10} fontSize="13" fill="#d97706" fontWeight="600" textAnchor="end">Pasokan menumpuk</text>

          {/* sumbu */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <text x={PAD.kiri - 8} y={y(maksY * f) + 4} fontSize="12" fill="#94a3b8" textAnchor="end">{Math.round(maksY * f)}</text>
              <text x={x(maksX * f)} y={PAD.atas + tinggi + 18} fontSize="12" fill="#94a3b8" textAnchor="middle">{Math.round(maksX * f)}</text>
            </g>
          ))}
          <text x={PAD.kiri + lebar / 2} y={H - 10} fontSize="14" fill="#475569" textAnchor="middle">Pasokan (jumlah listing)</text>
          <text transform={`translate(14 ${PAD.atas + tinggi / 2}) rotate(-90)`} fontSize="14" fill="#475569" textAnchor="middle">Permintaan (pesanan)</text>

          {/* titik wilayah: tanpa label, nama muncul saat hover */}
          {urut.map((w) => {
            const cx = x(w.listing);
            const cy = y(w.pesanan);
            const warna = (WARNA_STATUS[w.status] || WARNA_STATUS["belum-aktif"]).titik;
            const sorot = aktif?.kota === w.kota;
            return (
              <g
                key={w.kota}
                tabIndex={0}
                role="img"
                aria-label={`${w.kota}: ${w.listing} listing, ${w.pesanan} pesanan, serapan ${angka(w.rasioSerapan)}%`}
                onMouseEnter={() => setAktif(w)}
                onFocus={() => setAktif(w)}
                onBlur={() => setAktif(null)}
                style={{ cursor: "pointer", outline: "none" }}
              >
                {/* area hover yang lebih lebar supaya mudah dikenai kursor */}
                <circle cx={cx} cy={cy} r="14" fill="transparent" />
                <circle
                  cx={cx}
                  cy={cy}
                  r={sorot ? 11 : 8}
                  fill={warna}
                  fillOpacity={sorot ? 1 : 0.7}
                  stroke="#fff"
                  strokeWidth={sorot ? 2.5 : 1.5}
                />
              </g>
            );
          })}

          {/* kotak info saat hover */}
          {aktif && (
            <g pointerEvents="none" transform={`translate(${kx} ${ky})`}>
              <rect width={kotakW} height={kotakH} rx="8" fill="#0f172a" fillOpacity="0.95" />
              <text x="12" y="22" fontSize="14" fontWeight="700" fill="#fff">{aktif.kota}</text>
              <text x="12" y="42" fontSize="12" fill="#cbd5e1">{aktif.listing} listing · {aktif.pesanan} pesanan</text>
              <text x="12" y="59" fontSize="12" fill="#cbd5e1">Serapan {angka(aktif.rasioSerapan)}%</text>
              <text x="12" y="72" fontSize="11" fill="#94a3b8">{STATUS_INFO[aktif.status]?.label || ""}</text>
            </g>
          )}
        </svg>
      )}
      <p className="mt-2 text-xs text-slate-400">Garis putus-putus menandai rata-rata seluruh wilayah.</p>
    </section>
  );
}