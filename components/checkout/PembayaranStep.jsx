"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  Clock,
  Copy,
  QrCode,
  RefreshCw,
} from "lucide-react";

const BRI_VA = "8800312345678901";

// Grid QR 29x29 deterministik mandiri
const QR_GRID = (() => {
  const size = 29;
  const grid = Array.from({ length: size }, () => Array(size).fill(false));

  function addFinder(r, c) {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (
          i === 0 ||
          i === 6 ||
          j === 0 ||
          j === 6 ||
          (i >= 2 && i <= 4 && j >= 2 && j <= 4)
        ) {
          grid[r + i][c + j] = true;
        }
      }
    }
  }

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  const alignR = size - 9;
  const alignC = size - 9;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (i === 0 || i === 4 || j === 0 || j === 4 || (i === 2 && j === 2)) {
        grid[alignR + i][alignC + j] = true;
      }
    }
  }

  let seed = 1337;
  const nextRandom = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTL = r < 9 && c < 9;
      const inTR = r < 9 && c >= size - 9;
      const inBL = r >= size - 9 && c < 9;
      const inTiming = r === 6 || c === 6;
      const inAlign =
        r >= alignR && r < alignR + 5 && c >= alignC && c < alignC + 5;

      if (!inTL && !inTR && !inBL && !inTiming && !inAlign) {
        grid[r][c] = nextRandom() > 0.48;
      }
    }
  }
  return grid;
})();

const rupiah = (val) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);

export default function PembayaranStep({ data, onChange, subtotal }) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const metode = data.metodePembayaran || "Virtual Account";

  // Countdown 1 menit untuk QRIS
  useEffect(() => {
    if (metode !== "QRIS") return;
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [metode, timeLeft]);

  const pilihMetode = (namaMetode) => {
    if (namaMetode === "QRIS" && timeLeft <= 0) {
      setTimeLeft(60);
    }
    onChange({
      metodePembayaran: namaMetode,
      bank: namaMetode === "Virtual Account" ? "BRI" : undefined,
    });
    setCopied(false);
  };

  const salinVA = async () => {
    try {
      await navigator.clipboard.writeText(BRI_VA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const resetQr = () => {
    setTimeLeft(60);
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-circlo-ink">Pembayaran</h2>
        <p className="mt-1 text-sm text-circlo-muted">
          Pilih salah satu metode pembayaran simulasi di bawah ini.
        </p>
      </div>

      {/* Pilihan Metode Pembayaran: Hanya Virtual Account (BRI) & QRIS */}
      <div>
        <p className="mb-3 text-sm font-semibold text-circlo-ink">
          Metode Pembayaran
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Opsi 1: Virtual Account BRI */}
          <button
            type="button"
            onClick={() => pilihMetode("Virtual Account")}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
              metode === "Virtual Account"
                ? "border-circlo-green bg-green-50/60 ring-1 ring-circlo-green"
                : "border-gray-200 bg-white hover:border-circlo-green/50"
            }`}
          >
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                metode === "Virtual Account"
                  ? "bg-circlo-green text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p
                className={`text-sm font-semibold ${
                  metode === "Virtual Account"
                    ? "text-circlo-green"
                    : "text-gray-900"
                }`}
              >
                Virtual Account (BRI)
              </p>
              <p className="mt-0.5 text-xs text-circlo-muted">
                Transfer via BRIVA Bank BRI
              </p>
            </div>
          </button>

          {/* Opsi 2: QRIS */}
          <button
            type="button"
            onClick={() => pilihMetode("QRIS")}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
              metode === "QRIS"
                ? "border-circlo-green bg-green-50/60 ring-1 ring-circlo-green"
                : "border-gray-200 bg-white hover:border-circlo-green/50"
            }`}
          >
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                metode === "QRIS"
                  ? "bg-circlo-green text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p
                className={`text-sm font-semibold ${
                  metode === "QRIS" ? "text-circlo-green" : "text-gray-900"
                }`}
              >
                QRIS
              </p>
              <p className="mt-0.5 text-xs text-circlo-muted">
                Scan kode QR via e-Wallet / m-Banking
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* KONTEN METODE 1: VIRTUAL ACCOUNT BRI */}
      {metode === "Virtual Account" && (
        <div className="rounded-xl border border-green-200 bg-green-50/60 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00529C] text-xs font-bold text-white shadow-sm">
                BRI
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Bank BRI (BRIVA)
                </p>
                <p className="text-xs text-circlo-muted">
                  Virtual Account Simulasi
                </p>
              </div>
            </div>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-[#00529C]">
              BRI
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-green-200 bg-white p-4">
            <p className="text-xs text-gray-500">Nomor Virtual Account</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <p className="break-all font-mono text-2xl font-bold tracking-wider text-circlo-green">
                {BRI_VA}
              </p>
              <button
                type="button"
                onClick={salinVA}
                className="flex items-center gap-1.5 rounded-lg border border-circlo-green bg-green-50 px-3.5 py-2 text-xs font-semibold text-circlo-green transition hover:bg-green-100"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-circlo-green" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Salin Nomor VA</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-1 text-xs text-circlo-muted">
            <p className="font-semibold text-circlo-ink">Petunjuk Transfer:</p>
            <p>1. Buka aplikasi BRImo atau mesin ATM Bank BRI.</p>
            <p>2. Pilih menu <strong>Pembayaran &gt; BRIVA</strong>.</p>
            <p>3. Masukkan nomor Virtual Account di atas.</p>
            <p>
              4. Sistem akan otomatis memvalidasi saat pesanan dibuat.
            </p>
          </div>
        </div>
      )}

      {/* KONTEN METODE 2: QRIS DENGAN COUNTDOWN 1 MENIT */}
      {metode === "QRIS" && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          {/* Header Card QRIS */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded bg-[#CD0000] px-2 py-0.5 text-xs font-black tracking-wider text-white">
                QRIS
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">
                  CIRCLO INDONESIA
                </p>
                <p className="text-[10px] text-gray-500">
                  NMID: ID1020039182391
                </p>
              </div>
            </div>

            {/* Countdown Badge */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                timeLeft <= 0
                  ? "border border-red-200 bg-red-50 text-red-600"
                  : timeLeft <= 15
                  ? "animate-pulse border border-amber-200 bg-amber-50 text-amber-700"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>
                {timeLeft > 0
                  ? `Sisa waktu: ${formatCountdown(timeLeft)}`
                  : "QR Kedaluwarsa"}
              </span>
            </div>
          </div>

          {/* Frame QR Code */}
          <div className="relative mt-5 flex flex-col items-center justify-center">
            <div className="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-inner">
              <svg
                viewBox="0 0 29 29"
                className="h-48 w-48 sm:h-56 sm:w-56"
                shapeRendering="crispEdges"
                aria-label="Kode QR QRIS"
              >
                <rect width="29" height="29" fill="white" />
                {QR_GRID.map((row, r) =>
                  row.map(
                    (filled, c) =>
                      filled && (
                        <rect
                          key={`${r}-${c}`}
                          x={c}
                          y={r}
                          width="1"
                          height="1"
                          fill="#0F1E29"
                        />
                      )
                  )
                )}
              </svg>

              {/* Overlay jika waktu habis (1 menit) */}
              {timeLeft <= 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/95 p-4 text-center backdrop-blur-sm">
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    QR Code Kedaluwarsa
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Waktu pembayaran 1 menit telah habis.
                  </p>
                  <button
                    type="button"
                    onClick={resetQr}
                    className="mt-3.5 flex items-center gap-1.5 rounded-lg bg-circlo-green px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Perbarui QR Code
                  </button>
                </div>
              )}
            </div>

            {/* Keterangan Pembayaran */}
            <div className="mt-4 text-center">
              {subtotal > 0 && (
                <p className="text-sm font-bold text-circlo-ink">
                  Total: {rupiah(subtotal)}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Pindai menggunakan aplikasi e-Wallet (GoPay, OVO, Dana, LinkAja,
                ShopeePay) atau m-Banking bank manapun.
              </p>
              {timeLeft > 0 && (
                <button
                  type="button"
                  onClick={resetQr}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-circlo-green hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reset ulang waktu 1 menit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Catatan Simulasi: Buat Pesanan Tetap Bisa Diklik */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-900">
        <p className="flex items-center gap-1.5 font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          Mode Simulasi Demo
        </p>
        <p className="mt-1 text-amber-800">
          Ini adalah pembayaran simulasi. Anda tidak perlu mentransfer uang
          sungguhan. Tombol <strong>&quot;Buat Pesanan&quot;</strong> di bawah
          dapat langsung diklik untuk menyelesaikan proses checkout.
        </p>
      </div>
    </div>
  );
}
