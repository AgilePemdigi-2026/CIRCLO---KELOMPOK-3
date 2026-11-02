
"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// Fungsi validasi yang digunakan juga oleh CheckoutFlow
export function validateAlamat(data) {
  if (data.metodeKirim === "Ambil di tempat") {
    return {};
  }

  const errors = {};

  const nama = String(data.namaPenerima || "").trim();
  const hp = String(data.nomorHp || "").trim();
  const alamat = String(data.alamat || "").trim();
  const kota = String(data.kota || "").trim();
  const provinsi = String(data.provinsi || "").trim();
  const kodePos = String(data.kodePos || "").trim();

  if (nama.length < 3) {
    errors.namaPenerima = "Nama penerima minimal 3 karakter.";
  } else if (!/^[\p{L}.'\s-]+$/u.test(nama)) {
    errors.namaPenerima = "Nama hanya boleh berisi huruf.";
  }

  if (!/^08\d{8,11}$/.test(hp)) {
    errors.nomorHp =
      "Nomor HP harus diawali 08 dan terdiri dari 10–13 digit.";
  }

  if (alamat.length < 10) {
    errors.alamat = "Alamat lengkap minimal 10 karakter.";
  }

  if (kota.length < 3) {
    errors.kota = "Kota/Kabupaten minimal 3 karakter.";
  }

  if (provinsi.length < 3) {
    errors.provinsi = "Provinsi minimal 3 karakter.";
  }

  if (!/^\d{5}$/.test(kodePos)) {
    errors.kodePos = "Kode pos harus terdiri dari 5 angka.";
  }

  return errors;
}

export default function AlamatPengirimanStep({
  data,
  onChange,
  showErrors = false,
}) {
  const [touched, setTouched] = useState({});

  const errors = validateAlamat(data);

  const update = (field, value) => {
    onChange({ [field]: value });
  };

  const markTouched = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const tampilkanError = (field) =>
    (touched[field] || showErrors) && Boolean(errors[field]);

  const tampilkanValid = (field) =>
    (touched[field] || showErrors) &&
    !errors[field] &&
    String(data[field] || "").trim().length > 0;

  const inputClass = (field) => {
    const base =
      "mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none transition focus:ring-1";

    if (tampilkanError(field)) {
      return `${base} border-red-400 focus:border-red-500 focus:ring-red-500`;
    }

    if (tampilkanValid(field)) {
      return `${base} border-green-500 focus:border-green-600 focus:ring-green-600`;
    }

    return `${base} border-gray-300 focus:border-[#3f6a0b] focus:ring-[#3f6a0b]`;
  };

  const renderPesan = (field) => {
    if (tampilkanError(field)) {
      return (
        <p
          id={`${field}-error`}
          role="alert"
          className="mt-2 flex items-center gap-1 text-xs text-red-600"
        >
          <AlertCircle size={14} />
          {errors[field]}
        </p>
      );
    }

    if (tampilkanValid(field)) {
      return (
        <p className="mt-2 flex items-center gap-1 text-xs text-green-700">
          <CheckCircle2 size={14} />
          Data valid
        </p>
      );
    }

    return null;
  };

  const commonProps = (field) => ({
    id: field,
    name: field,
    value: data[field] || "",
    onBlur: () => markTouched(field),
    "aria-invalid": tampilkanError(field),
    "aria-describedby": tampilkanError(field)
      ? `${field}-error`
      : undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-circlo-ink">
          Alamat Pengiriman
        </h2>

        <p className="mt-1 text-sm text-circlo-muted">
          Lengkapi informasi penerima dan alamat pengiriman.
        </p>
      </div>

      {data.metodeKirim === "Ambil di tempat" ? (
        <div className="rounded-xl bg-green-50 p-5 text-sm text-green-800">
          Kamu memilih ambil di tempat.
          Alamat pengiriman tidak diperlukan.
        </div>
      ) : (
        <div className="space-y-5">
          {/* NAMA PENERIMA */}
          <div>
            <label
              htmlFor="namaPenerima"
              className="text-sm font-medium"
            >
              Nama Penerima <span className="text-red-500">*</span>
            </label>

            <input
              {...commonProps("namaPenerima")}
              type="text"
              autoComplete="name"
              placeholder="Masukkan nama penerima"
              onChange={(e) =>
                update("namaPenerima", e.target.value)
              }
              className={inputClass("namaPenerima")}
            />

            {renderPesan("namaPenerima")}
          </div>

          {/* NOMOR HP */}
          <div>
            <label
              htmlFor="nomorHp"
              className="text-sm font-medium"
            >
              Nomor HP <span className="text-red-500">*</span>
            </label>

            <input
              {...commonProps("nomorHp")}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={13}
              placeholder="081234567890"
              onChange={(e) =>
                update(
                  "nomorHp",
                  e.target.value.replace(/\D/g, "")
                )
              }
              className={inputClass("nomorHp")}
            />

            {renderPesan("nomorHp")}
          </div>

          {/* ALAMAT */}
          <div>
            <label
              htmlFor="alamat"
              className="text-sm font-medium"
            >
              Alamat Lengkap <span className="text-red-500">*</span>
            </label>

            <textarea
              {...commonProps("alamat")}
              rows={3}
              autoComplete="street-address"
              placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan"
              onChange={(e) =>
                update("alamat", e.target.value)
              }
              className={inputClass("alamat")}
            />

            {renderPesan("alamat")}
          </div>

          {/* KOTA DAN PROVINSI */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="kota"
                className="text-sm font-medium"
              >
                Kota/Kabupaten <span className="text-red-500">*</span>
              </label>

              <input
                {...commonProps("kota")}
                type="text"
                autoComplete="address-level2"
                placeholder="Contoh: Surabaya"
                onChange={(e) =>
                  update("kota", e.target.value)
                }
                className={inputClass("kota")}
              />

              {renderPesan("kota")}
            </div>

            <div>
              <label
                htmlFor="provinsi"
                className="text-sm font-medium"
              >
                Provinsi <span className="text-red-500">*</span>
              </label>

              <input
                {...commonProps("provinsi")}
                type="text"
                autoComplete="address-level1"
                placeholder="Contoh: Jawa Timur"
                onChange={(e) =>
                  update("provinsi", e.target.value)
                }
                className={inputClass("provinsi")}
              />

              {renderPesan("provinsi")}
            </div>
          </div>

          {/* KODE POS */}
          <div>
            <label
              htmlFor="kodePos"
              className="text-sm font-medium"
            >
              Kode Pos <span className="text-red-500">*</span>
            </label>

            <input
              {...commonProps("kodePos")}
              type="text"
              inputMode="numeric"
              maxLength={5}
              autoComplete="postal-code"
              placeholder="Contoh: 60286"
              onChange={(e) =>
                update(
                  "kodePos",
                  e.target.value.replace(/\D/g, "")
                )
              }
              className={inputClass("kodePos")}
            />

            {renderPesan("kodePos")}
          </div>
        </div>
      )}
    </div>
  );
}
