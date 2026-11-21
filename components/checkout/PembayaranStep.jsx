
"use client";

import { CreditCard, ShieldCheck, Info } from "lucide-react";

const rupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export default function PembayaranStep({ subtotal }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-circlo-ink">
          Pembayaran
        </h2>
        <p className="mt-1 text-sm text-circlo-muted">
          Selesaikan pembayaran melalui Midtrans
          Sandbox dengan metode yang tersedia.
        </p>
      </div>

      <div className="rounded-xl border border-green-200 bg-green-50/60 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-circlo-green text-white">
            <CreditCard className="h-6 w-6" />
          </div>

          <div>
            <h3 className="font-semibold text-circlo-ink">
              Pembayaran melalui Midtrans
            </h3>
            <p className="mt-1 text-sm text-circlo-muted">
              Pilih Virtual Account, QRIS, atau metode
              pembayaran lain yang tersedia langsung
              pada halaman pembayaran Midtrans.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-green-200 bg-white p-4">
          <p className="text-xs text-circlo-muted">
            Total Pembayaran
          </p>
          <p className="mt-1 text-2xl font-bold text-circlo-green">
            {rupiah(subtotal)}
          </p>
          <p className="mt-1 text-xs text-circlo-muted">
            Belum termasuk biaya pengiriman jika berlaku.
          </p>
        </div>

        <div className="mt-4 flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-circlo-green" />
          <p className="text-xs leading-relaxed text-circlo-muted">
            Instruksi dan nomor pembayaran resmi akan
            ditampilkan oleh Midtrans setelah transaksi dibuat.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
        <p className="text-xs leading-relaxed text-blue-900">
          Saat ini pembayaran menggunakan Midtrans Sandbox
          untuk pengujian. Jangan melakukan transfer uang
          sungguhan. Status pesanan akan diperbarui setelah
          pembayaran berhasil diverifikasi.
        </p>
      </div>
    </div>
  );
}
