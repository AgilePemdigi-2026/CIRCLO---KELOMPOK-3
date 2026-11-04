
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/auth";

import JumlahPesananStep from "./JumlahPesananStep";
import AlamatPengirimanStep, {
  validateAlamat,
} from "./AlamatPengirimanStep";
import PembayaranStep from "./PembayaranStep";
import { Check } from "lucide-react";

const steps = ["Jumlah Pesanan", "Alamat", "Pembayaran"];

const rupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export default function CheckoutFlow() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAlamatErrors, setShowAlamatErrors] = useState(false);

  const [data, setData] = useState({
    jumlah: 1,
    metodeKirim: "Dikirim",
    namaPenerima: "",
    nomorHp: "",
    alamat: "",
    kota: "",
    provinsi: "",
    kodePos: "",
    metodePembayaran: "Virtual Account",
    bank: "BCA",
  });

  // Mengambil data material dari URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const id = Number(params.get("id"));
    const harga = Number(params.get("harga"));
    const stok = Number(params.get("stok"));

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !Number.isFinite(harga) ||
      harga < 0 ||
      !Number.isFinite(stok) ||
      stok <= 0
    ) {
      return;
    }

    setMaterial({
      id_material: id,
      nama_material: params.get("nama") || "Material",
      harga,
      stok,
      satuan: params.get("satuan") || "unit",
    });
  }, []);

  // Memperbarui data checkout
  const update = (patch) => {
    setData((prev) => ({
      ...prev,
      ...patch,
    }));

    setError("");

    if (
      Object.prototype.hasOwnProperty.call(
        patch,
        "metodeKirim"
      )
    ) {
      setShowAlamatErrors(false);
    }
  };

  const jumlah = Number(data.jumlah);

  const subtotal =
    material && Number.isFinite(jumlah)
      ? jumlah * material.harga
      : 0;

  // Validasi jumlah dan metode pengiriman
  const validasiJumlah = () => {
    if (!material) {
      return "Pilih material terlebih dahulu.";
    }

    if (!Number.isInteger(jumlah) || jumlah <= 0) {
      return "Jumlah pesanan harus berupa bilangan bulat lebih dari 0.";
    }

    if (jumlah > material.stok) {
      return `Stok hanya tersedia ${material.stok} ${material.satuan}.`;
    }

    if (
      !["Dikirim", "Ambil di tempat"].includes(
        data.metodeKirim
      )
    ) {
      return "Pilih metode pengiriman yang valid.";
    }

    return "";
  };

  // Validasi alamat menggunakan validator bersama
  const validasiAlamat = () => {
    return validateAlamat(data);
  };

  // Menggabungkan alamat menjadi satu string untuk API
  const alamatLengkap = () => {
    if (data.metodeKirim === "Ambil di tempat") {
      return "";
    }

    return [
      `Penerima: ${data.namaPenerima.trim()}`,
      `No. HP: ${data.nomorHp.trim()}`,
      data.alamat.trim(),
      data.kota.trim(),
      data.provinsi.trim(),
      data.kodePos.trim(),
    ].join(", ");
  };

  // Tombol lanjut
  const lanjut = () => {
    setError("");

    if (step === 0) {
      const pesan = validasiJumlah();

      if (pesan) {
        setError(pesan);
        return;
      }
    }

    if (step === 1) {
      setShowAlamatErrors(true);

      const errors = validasiAlamat();

      if (Object.keys(errors).length > 0) {
        setError(
          "Lengkapi data alamat yang masih salah sebelum melanjutkan."
        );
        return;
      }
    }

    setStep((prev) => Math.min(prev + 1, 2));
  };

  // Tombol kembali
  const kembali = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 0));
  };

  // Membuat pesanan melalui API
  const buatPesanan = async () => {
    if (loading) return;

    const errorJumlah = validasiJumlah();

    if (errorJumlah) {
      setError(errorJumlah);
      setStep(0);
      return;
    }

    const errorsAlamat = validasiAlamat();

    if (Object.keys(errorsAlamat).length > 0) {
      setShowAlamatErrors(true);
      setError(
        "Data alamat belum valid. Periksa kembali informasi pengiriman."
      );
      setStep(1);
      return;
    }

    if (!data.metodePembayaran) {
      setError("Pilih metode pembayaran.");
      return;
    }

    if (
      data.metodePembayaran === "Virtual Account" &&
      !["BCA", "BNI", "BRI", "Mandiri"].includes(data.bank)
    ) {
      setError("Pilih bank Virtual Account yang valid.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error(
          "Silakan login menggunakan akun Buyer."
        );
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_material: material.id_material,
          kuantitas: jumlah,
          metode_kirim: data.metodeKirim,
          alamat: alamatLengkap(),
        }),
      });

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal membuat pesanan."
        );
      }

      if (!result.id_pesanan) {
        throw new Error("ID pesanan tidak ditemukan.");
      }

      // Setelah pesanan berhasil, menuju Pesanan Saya
      router.push("/orders");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat membuat pesanan."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
      {/* BAGIAN KIRI */}
      <section className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
        {/* Progress Bar Minimalist */}
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {steps.map((nama, index) => {
              const isCompleted = index < step;
              const isCurrent = index === step;

              return (
                <button
                  key={nama}
                  type="button"
                  onClick={() => {
                    if (isCompleted) {
                      setError("");
                      setStep(index);
                    }
                  }}
                  disabled={!isCompleted}
                  className={`group flex flex-col items-start text-left transition-all ${
                    isCompleted ? "cursor-pointer" : "cursor-default"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {/* Progress Line Bar */}
                  <div
                    className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                      isCompleted || isCurrent
                        ? "bg-circlo-green"
                        : "bg-circlo-line/50"
                    }`}
                  />

                  {/* Step Label */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span
                      className={`transition-colors leading-tight ${
                        isCurrent
                          ? "font-semibold text-circlo-green"
                          : isCompleted
                          ? "font-medium text-circlo-ink group-hover:text-circlo-green"
                          : "text-circlo-muted/60"
                      }`}
                    >
                      <span className="inline">{index + 1}. </span>
                      {nama}
                    </span>
                    {isCompleted && (
                      <Check className="h-3.5 w-3.5 text-circlo-green shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {!material && (
          <p className="mb-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            Belum ada material dipilih. Silakan pilih
            material dari Material Catalog.
          </p>
        )}

        {/* STEP 1: JUMLAH PESANAN */}
        {step === 0 && (
          <JumlahPesananStep
            data={data}
            onChange={update}
            material={material}
          />
        )}

        {/* STEP 2: ALAMAT */}
        {step === 1 && (
          <AlamatPengirimanStep
            data={data}
            onChange={update}
            showErrors={showAlamatErrors}
          />
        )}

        {/* STEP 3: PEMBAYARAN */}
        {step === 2 && (
          <>
            <PembayaranStep
              data={data}
              onChange={update}
            />

            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
              <h3 className="font-semibold text-green-900">
                Konfirmasi Pesanan
              </h3>

              <div className="mt-3 space-y-2 text-sm text-green-900">
                <p>
                  <strong>Material:</strong>{" "}
                  {material?.nama_material || "-"}
                </p>

                <p>
                  <strong>Jumlah:</strong>{" "}
                  {jumlah} {material?.satuan || "unit"}
                </p>

                <p>
                  <strong>Pengiriman:</strong>{" "}
                  {data.metodeKirim}
                </p>

                {data.metodeKirim === "Dikirim" && (
                  <>
                    <p>
                      <strong>Penerima:</strong>{" "}
                      {data.namaPenerima}
                    </p>

                    <p>
                      <strong>No. HP:</strong>{" "}
                      {data.nomorHp}
                    </p>

                    <p>
                      <strong>Alamat:</strong>{" "}
                      {[
                        data.alamat,
                        data.kota,
                        data.provinsi,
                        data.kodePos,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </>
                )}

                <p>
                  <strong>Metode Pembayaran:</strong>{" "}
                  {data.metodePembayaran}
                  {data.metodePembayaran ===
                    "Virtual Account" &&
                    data.bank &&
                    ` - ${data.bank}`}
                </p>

                <p className="font-bold">
                  Subtotal: {rupiah(subtotal)}
                </p>
              </div>
            </div>

            <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              Pembayaran online belum aktif.
              Tombol Buat Pesanan hanya membuat pesanan
              dengan status Menunggu Konfirmasi,
              bukan menyelesaikan pembayaran.
            </p>
          </>
        )}

        {/* PESAN ERROR */}
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {/* TOMBOL NAVIGASI */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t pt-6">
          <button
            type="button"
            onClick={kembali}
            disabled={step === 0 || loading}
            className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 disabled:opacity-40"
          >
            Kembali
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={lanjut}
              disabled={!material || loading}
              className="rounded-lg bg-circlo-green px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              Lanjut
            </button>
          ) : (
            <button
              type="button"
              onClick={buatPesanan}
              disabled={loading || !material}
              className="rounded-lg bg-circlo-green px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Memproses Pesanan..."
                : "Buat Pesanan"}
            </button>
          )}
        </div>
      </section>

      {/* BAGIAN KANAN: RINGKASAN */}
      <aside className="h-fit rounded-2xl bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-circlo-ink">
          Ringkasan Pesanan
        </h2>

        <div className="mt-5 space-y-4 text-sm">
          <div>
            <p className="text-circlo-muted">
              Material
            </p>
            <p className="font-semibold">
              {material?.nama_material || "-"}
            </p>
          </div>

          <div className="flex justify-between gap-3">
            <span>Harga Satuan</span>
            <span>
              {rupiah(material?.harga || 0)}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            <span>Jumlah</span>
            <span>
              {data.jumlah}{" "}
              {material?.satuan || "unit"}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            <span>Pengiriman</span>
            <span>{data.metodeKirim}</span>
          </div>

          <div className="flex justify-between gap-3">
            <span>Pembayaran</span>
            <span>
              {data.metodePembayaran}
              {data.metodePembayaran ===
                "Virtual Account" &&
                data.bank &&
                ` - ${data.bank}`}
            </span>
          </div>

          <div className="flex justify-between border-t pt-4 text-base font-bold">
            <span>Subtotal</span>
            <span className="text-circlo-green">
              {rupiah(subtotal)}
            </span>
          </div>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-circlo-muted">
          Subtotal dihitung dari harga material.
          Belum termasuk biaya pengiriman.
          Harga dan stok akan diverifikasi kembali
          oleh server saat pesanan dibuat.
        </p>
      </aside>
    </div>
  );
}
