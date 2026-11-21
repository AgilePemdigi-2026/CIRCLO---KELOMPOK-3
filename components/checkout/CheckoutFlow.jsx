
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Check } from "lucide-react";
import { getAccessToken } from "@/lib/auth";

import JumlahPesananStep from "./JumlahPesananStep";
import AlamatPengirimanStep, {
  validateAlamat,
} from "./AlamatPengirimanStep";
import PembayaranStep from "./PembayaranStep";

const steps = ["Jumlah Pesanan", "Alamat", "Pembayaran"];

const rupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

// JWT hanya dibaca untuk memisahkan
// sessionStorage masing-masing Buyer.
// Otorisasi tetap diperiksa oleh backend.
function buyerIdDariToken(token) {
  try {
    const encoded = token.split(".")[1];

    if (!encoded) return null;

    const base64 = encoded
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = base64.padEnd(
      Math.ceil(base64.length / 4) * 4,
      "="
    );

    const payload = JSON.parse(window.atob(padded));

    return typeof payload.sub === "string" && payload.sub
      ? payload.sub
      : null;
  } catch {
    return null;
  }
}

export default function CheckoutFlow() {
  const router = useRouter();

  // STATE UTAMA
  const [step, setStep] = useState(0);
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAlamatErrors, setShowAlamatErrors] =
    useState(false);

  // REFERENSI CHECKOUT
  const pesananAktifRef = useRef(null);
  const prosesAktifRef = useRef(false);
  const checkoutRequestIdRef = useRef(null);
  const checkoutStorageKeyRef = useRef(null);

  // DATA CHECKOUT
  const [data, setData] = useState({
    jumlah: 1,
    metodeKirim: "Dikirim",
    namaPenerima: "",
    nomorHp: "",
    alamat: "",
    kota: "",
    provinsi: "",
    kodePos: "",
  });

  // 1. MENGAMBIL MATERIAL DARI URL
  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const id = Number(params.get("id"));
    const harga = Number(params.get("harga"));
    const stok = Number(params.get("stok"));
    const jumlahDariCart = Number(params.get("jumlah"));

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !Number.isFinite(harga) ||
      harga < 0 ||
      !Number.isFinite(stok) ||
      stok < 0
    ) {
      return;
    }

    setMaterial({
      id_material: id,
      nama_material:
        params.get("nama") || "Material",
      harga,
      stok,
      satuan: params.get("satuan") || "unit",
    });

    if (
      Number.isInteger(jumlahDariCart) &&
      jumlahDariCart > 0
    ) {
      setData((prev) => ({
        ...prev,
        jumlah: jumlahDariCart,
      }));
    }
  }, []);

  // 2. MEMPERBARUI DATA CHECKOUT
  const update = (patch) => {
    if (pesananAktifRef.current !== null) {
      setError(
        "Pesanan sudah tercatat. Jangan mengubah detailnya selama pembayaran masih berlangsung. Periksa Pesanan Saya jika ingin membatalkan."
      );
      return;
    }

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

  // 3. VALIDASI JUMLAH DAN PENGIRIMAN
  const validasiJumlah = () => {
    if (!material) {
      return "Pilih material terlebih dahulu.";
    }

    if (
      !Number.isInteger(jumlah) ||
      jumlah <= 0
    ) {
      return "Jumlah pesanan harus berupa bilangan bulat lebih dari 0.";
    }

    // Stok diperiksa kembali oleh API Orders.
    // Pemeriksaan pesanan lama dilakukan lebih dahulu.
    if (
      !["Dikirim", "Ambil di tempat"].includes(
        data.metodeKirim
      )
    ) {
      return "Pilih metode pengiriman yang valid.";
    }

    return "";
  };

  // 4. VALIDASI ALAMAT
  const validasiAlamat = () => {
    return validateAlamat(data);
  };

  // 5. MEMBUAT ALAMAT LENGKAP
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

  // 6. TOMBOL LANJUT
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

  // 7. TOMBOL KEMBALI
  const kembali = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 0));
  };

  // 8. MEMBUAT PESANAN DAN MEMBUKA MIDTRANS
  const buatPesanan = async () => {
    if (loading || prosesAktifRef.current) return;

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

    // Pastikan Snap.js sudah siap
    if (
      typeof window === "undefined" ||
      typeof window.snap?.pay !== "function"
    ) {
      setError(
        "Midtrans belum siap. Tunggu halaman selesai dimuat lalu coba kembali."
      );
      return;
    }

    prosesAktifRef.current = true;
    setLoading(true);
    setError("");

    try {
      // 8A. MEMERIKSA LOGIN BUYER
      const token = await getAccessToken();

      if (!token) {
        throw new Error(
          "Silakan login menggunakan akun Buyer."
        );
      }

      const buyerId = buyerIdDariToken(token);

      if (!buyerId) {
        throw new Error(
          "Identitas Buyer tidak ditemukan. Silakan login kembali."
        );
      }

      // 8B. ID CHECKOUT BERDASARKAN BUYER
      // Hanya satu checkoutStorageKey di fungsi ini.
      const checkoutStorageKey =
        `circlo:checkout:buyer:${buyerId}:material:${material.id_material}`;

      // Reset referensi jika akun atau material berubah
      if (
        checkoutStorageKeyRef.current !==
        checkoutStorageKey
      ) {
        checkoutStorageKeyRef.current =
          checkoutStorageKey;

        checkoutRequestIdRef.current = null;
        pesananAktifRef.current = null;
      }

      // 8C. AMBIL ATAU BUAT ID CHECKOUT
      let checkoutRequestId =
        checkoutRequestIdRef.current ||
        window.sessionStorage.getItem(
          checkoutStorageKey
        );

      if (!checkoutRequestId) {
        checkoutRequestId =
          window.crypto.randomUUID();

        window.sessionStorage.setItem(
          checkoutStorageKey,
          checkoutRequestId
        );
      }

      checkoutRequestIdRef.current =
        checkoutRequestId;

      // 8D. GUNAKAN PESANAN SEBELUMNYA JIKA ADA
      let idPesanan = pesananAktifRef.current;

      if (!idPesanan) {
        const response = await fetch(
          "/api/orders",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              id_material:
                material.id_material,
              kuantitas: jumlah,
              metode_kirim:
                data.metodeKirim,
              alamat: alamatLengkap(),
              checkout_request_id:
                checkoutRequestId,
            }),
          }
        );

        const result = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          const statusLama = String(
            result.status_pesanan || ""
          )
            .trim()
            .toLowerCase();

          // Jika pesanan lama sudah tidak aktif,
          // kosongkan ID Checkout sebelumnya.
          if (
            response.status === 409 &&
            result.id_pesanan &&
            result.status_pesanan &&
            statusLama !==
              "menunggu pembayaran"
          ) {
            window.sessionStorage.removeItem(
              checkoutStorageKey
            );

            checkoutRequestIdRef.current = null;
            pesananAktifRef.current = null;

            throw new Error(
              `Pesanan #${result.id_pesanan} sudah berstatus ` +
                `${result.status_pesanan}. ` +
                "Periksa Pesanan Saya terlebih dahulu. " +
                "Jika ingin membeli lagi, klik Bayar dengan Midtrans sekali lagi."
            );
          }

          throw new Error(
            result.error ||
              "Gagal membuat pesanan."
          );
        }

        idPesanan = Number(
          result.id_pesanan
        );

        if (
          !Number.isSafeInteger(idPesanan) ||
          idPesanan <= 0
        ) {
          throw new Error(
            "Pesanan dibuat tetapi ID pesanan tidak valid."
          );
        }

        // Simpan ID agar popup yang ditutup
        // tidak menyebabkan pesanan baru.
        pesananAktifRef.current =
          idPesanan;
      }

      // 8E. MEMINTA SNAP TOKEN MIDTRANS
      const responseBayar = await fetch(
        "/api/midtrans/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            id_pesanan: idPesanan,
          }),
        }
      );

      const hasilBayar = await responseBayar
        .json()
        .catch(() => ({}));

      if (!responseBayar.ok) {
        throw new Error(
          hasilBayar.error ||
            "Gagal mempersiapkan pembayaran Midtrans."
        );
      }

      if (!hasilBayar.snap_token) {
        throw new Error(
          "Snap Token Midtrans tidak ditemukan."
        );
      }

      setLoading(false);

      // 8F. MEMBUKA POPUP MIDTRANS
      window.snap.pay(
        hasilBayar.snap_token,
        {
          // PEMBAYARAN BERHASIL
          onSuccess: async () => {
            setLoading(true);

            try {
              // Verifikasi ke server,
              // bukan hanya callback browser.
              const responseVerify =
                await fetch(
                  "/api/midtrans/verify",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type":
                        "application/json",
                      Authorization:
                        `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      id_pesanan:
                        idPesanan,
                    }),
                  }
                );

              const hasilVerify =
                await responseVerify
                  .json()
                  .catch(() => ({}));

              if (
                responseVerify.ok &&
                hasilVerify.lunas === true
              ) {
                // Pembayaran sudah terverifikasi.
                // Bersihkan ID Checkout lokal.
                window.sessionStorage.removeItem(
                  checkoutStorageKey
                );

                checkoutRequestIdRef.current = null;
                pesananAktifRef.current = null;

                router.push("/orders");
                router.refresh();
              } else {
                setError(
                  "Pembayaran belum terverifikasi. Periksa statusnya di Pesanan Saya sebelum mencoba lagi."
                );
              }
            } catch {
              setError(
                "Status pembayaran belum dapat diperiksa. Silakan cek Pesanan Saya."
              );
            } finally {
              setLoading(false);
              prosesAktifRef.current =
                false;
            }
          },

          // PEMBAYARAN MASIH PENDING
          onPending: () => {
            prosesAktifRef.current =
              false;

            setLoading(false);

            setError(
              "Pembayaran masih menunggu penyelesaian. Ikuti instruksi Midtrans dan jangan membuat pesanan baru."
            );
          },

          // TERJADI ERROR PEMBAYARAN
          onError: () => {
            prosesAktifRef.current =
              false;

            setLoading(false);

            setError(
              "Terjadi kendala pembayaran. Periksa status pesanan sebelum mencoba kembali."
            );
          },

          // POPUP DITUTUP
          onClose: () => {
            prosesAktifRef.current =
              false;

            setLoading(false);

            setError(
              "Popup pembayaran ditutup. Pesanan sudah tercatat dan dapat dilanjutkan tanpa membuat pesanan baru."
            );
          },
        }
      );
    } catch (err) {
      prosesAktifRef.current = false;
      setLoading(false);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses pembayaran."
      );
    }
  };

  // 9. TAMPILAN CHECKOUT
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
      {/* SCRIPT MIDTRANS SANDBOX */}
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={
          process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
        }
        strategy="afterInteractive"
      />

      {/* BAGIAN KIRI */}
      <section className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
        {/* PROGRESS BAR */}
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {steps.map((nama, index) => {
              const isCompleted =
                index < step;

              const isCurrent =
                index === step;

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
                    isCompleted
                      ? "cursor-pointer"
                      : "cursor-default"
                  }`}
                  aria-current={
                    isCurrent
                      ? "step"
                      : undefined
                  }
                >
                  <div
                    className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                      isCompleted ||
                      isCurrent
                        ? "bg-circlo-green"
                        : "bg-circlo-line/50"
                    }`}
                  />

                  <div className="mt-2.5 flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span
                      className={`leading-tight transition-colors ${
                        isCurrent
                          ? "font-semibold text-circlo-green"
                          : isCompleted
                          ? "font-medium text-circlo-ink group-hover:text-circlo-green"
                          : "text-circlo-muted/60"
                      }`}
                    >
                      {index + 1}. {nama}
                    </span>

                    {isCompleted && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-circlo-green" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* INFORMASI MATERIAL */}
        {!material && (
          <p className="mb-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            Belum ada material dipilih.
            Silakan pilih material dari Material Catalog.
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
              subtotal={subtotal}
            />

            {/* KONFIRMASI PESANAN */}
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
                  {jumlah}{" "}
                  {material?.satuan || "unit"}
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
                  <strong>
                    Metode Pembayaran:
                  </strong>{" "}
                  Midtrans Sandbox
                </p>

                <p className="font-bold">
                  Subtotal: {rupiah(subtotal)}
                </p>
              </div>
            </div>

            {/* INFORMASI SANDBOX */}
            <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Pembayaran dilakukan melalui Midtrans
              Sandbox. Setelah menekan tombol Bayar
              dengan Midtrans, pilih metode pembayaran
              pada popup yang muncul. Jangan melakukan
              transfer uang sungguhan.
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
            disabled={
              step === 0 || loading
            }
            className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 disabled:opacity-40"
          >
            Kembali
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={lanjut}
              disabled={
                !material || loading
              }
              className="rounded-lg bg-circlo-green px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              Lanjut
            </button>
          ) : (
            <button
              type="button"
              onClick={buatPesanan}
              disabled={
                loading || !material
              }
              className="rounded-lg bg-circlo-green px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Memproses Pesanan..."
                : "Bayar dengan Midtrans"}
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
            <span>
              {data.metodeKirim}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            <span>Pembayaran</span>
            <span>
              Midtrans Sandbox
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
