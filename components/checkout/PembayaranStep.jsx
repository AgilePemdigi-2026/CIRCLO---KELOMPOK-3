
"use client";

import { useState } from "react";

const BANK = {
  BCA: "8800012345678901",
  BNI: "8800212345678901",
  BRI: "8800312345678901",
  Mandiri: "8800412345678901",
};

export default function PembayaranStep({
  data,
  onChange,
}) {
  const [copied, setCopied] = useState(false);

  const bank = data.bank || "BCA";
  const nomorVA = BANK[bank];

  const pilihBank = (namaBank) => {
    onChange({
      bank: namaBank,
      metodePembayaran: "Virtual Account",
    });
    setCopied(false);
  };

  const salinVA = async () => {
    try {
      await navigator.clipboard.writeText(nomorVA);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-circlo-ink">
          Pembayaran
        </h2>
        <p className="mt-1 text-sm text-circlo-muted">
          Pilih bank untuk melihat nomor Virtual Account simulasi.
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold">
          Pilih Bank
        </p>

        <div className="grid grid-cols-2 gap-3">
          {Object.keys(BANK).map((namaBank) => (
            <button
              key={namaBank}
              type="button"
              onClick={() => pilihBank(namaBank)}
              className={`rounded-xl border p-4 text-left font-semibold transition ${
                bank === namaBank
                  ? "border-[#3f6a0b] bg-green-50 text-[#3f6a0b]"
                  : "border-gray-200 hover:border-green-400"
              }`}
            >
              Bank {namaBank}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <p className="text-xs font-semibold uppercase text-green-700">
          Virtual Account Simulasi
        </p>

        <p className="mt-3 text-sm text-gray-600">
          Bank {bank}
        </p>

        <p className="mt-1 break-all text-2xl font-bold tracking-wider text-[#3f6a0b]">
          {nomorVA}
        </p>

        <button
          type="button"
          onClick={salinVA}
          className="mt-4 rounded-lg border border-[#3f6a0b] px-4 py-2 text-sm font-semibold text-[#3f6a0b]"
        >
          {copied ? "Berhasil Disalin" : "Salin Nomor VA"}
        </button>

        <p className="mt-4 text-xs text-amber-700">
          Nomor ini hanya contoh untuk demonstrasi.
          Jangan melakukan transfer ke nomor tersebut.
        </p>
      </div>
    </div>
  );
}
