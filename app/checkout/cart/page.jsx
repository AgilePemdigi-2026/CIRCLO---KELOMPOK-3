
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingBag,
  Package,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getAccessToken } from "@/lib/auth";
import AlamatPengirimanStep from "@/components/checkout/AlamatPengirimanStep";
import PembayaranStep from "@/components/checkout/PembayaranStep";

const steps = ["Jumlah Pesanan", "Alamat", "Pembayaran"];

function validateAlamat(data) {
  if (data.metodeKirim === "Ambil di tempat") return {};

  const errors = {};

  if (!String(data.namaPenerima || "").trim()) {
    errors.namaPenerima = true;
  }

  if (!/^08\d{8,11}$/.test(String(data.nomorHp || "").trim())) {
    errors.nomorHp = true;
  }

  if (!String(data.alamat || "").trim()) {
    errors.alamat = true;
  }

  if (!String(data.kota || "").trim()) {
    errors.kota = true;
  }

  if (!String(data.provinsi || "").trim()) {
    errors.provinsi = true;
  }

  if (!/^\d{5}$/.test(String(data.kodePos || "").trim())) {
    errors.kodePos = true;
  }

  return errors;
}

const rupiah = (angka) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(angka) || 0);

export default function CartCheckoutPage() {
  const [step, setStep] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showAlamatErrors, setShowAlamatErrors] = useState(false);

  const [data, setData] = useState({
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

  // AMBIL MATERIAL TERPILIH DARI KERANJANG
  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams(
          window.location.search
        );

        const rawIds = params.get("ids") || "";

        const ids = [
          ...new Set(rawIds.split(",").map(Number)),
        ].filter(
          (id) => Number.isSafeInteger(id) && id > 0
        );

        if (ids.length < 2 || ids.length > 20) {
          throw new Error(
            "Pilih 2 sampai 20 material dari Keranjang."
          );
        }

        const token = await getAccessToken();

        if (!token) {
          throw new Error(
            "Silakan login sebagai Buyer terlebih dahulu."
          );
        }

        const response = await fetch("/api/cart", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const result = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error || "Gagal mengambil data keranjang."
          );
        }

        const selected = (result.items || []).filter(
          (item) => ids.includes(Number(item.id_keranjang))
        );

        if (selected.length !== ids.length) {
          throw new Error(
            "Sebagian material tidak ditemukan dalam keranjang."
          );
        }

        const unavailable = selected.some((item) => {
          const qty = Number(item.kuantitas);
          const stock = Number(item.stok);
          const price = Number(item.harga);

          return (
            item.status_material === false ||
            !Number.isSafeInteger(qty) ||
            qty < 1 ||
            !Number.isFinite(stock) ||
            qty > stock ||
            item.harga == null ||
            !Number.isFinite(price) ||
            price < 0
          );
        });

        if (unavailable) {
          throw new Error(
            "Ada material yang tidak tersedia atau stoknya kurang. Kembali ke Keranjang."
          );
        }

        setItems(selected);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Gagal memuat keranjang."
        );
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []);

  // UPDATE DATA FORM
  const update = (patch) => {
    setData((prev) => ({
      ...prev,
      ...patch,
    }));

    setError("");
  };

  // HITUNG TOTAL HARGA
  const total = items.reduce(
    (sum, item) =>
      sum +
      Number(item.harga) * Number(item.kuantitas),
    0
  );

  // VALIDASI ALAMAT
  const cekAlamat = () => {
    if (data.metodeKirim === "Ambil di tempat") {
      return true;
    }

    setShowAlamatErrors(true);

    const errors = validateAlamat(data);

    if (Object.keys(errors || {}).length > 0) {
      setError(
        "Lengkapi alamat pengiriman dengan benar sebelum melanjutkan."
      );
      return false;
    }

    return true;
  };

  // PINDAH KE LANGKAH BERIKUTNYA
  const lanjut = () => {
    setError("");

    if (items.length < 2) {
      setError(
        "Pilih minimal 2 material untuk Checkout gabungan."
      );
      return;
    }

    if (step === 1 && !cekAlamat()) {
      return;
    }

    setStep((prev) => Math.min(prev + 1, 2));
  };

  // KEMBALI KE LANGKAH SEBELUMNYA
  const kembali = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const alamatLengkap = [
    data.alamat,
    data.kota,
    data.provinsi,
    data.kodePos,
  ]
    .filter(Boolean)
    .join(", ");

  // MEMBUAT PESANAN GABUNGAN
  const buatPesanan = async () => {
    if (submitting) return;

    setError("");

    if (items.length < 2 || items.length > 20) {
      setError(
        "Checkout gabungan membutuhkan 2 sampai 20 material."
      );
      setStep(0);
      return;
    }

    if (!cekAlamat()) {
      setStep(1);
      return;
    }

    if (
      data.metodePembayaran === "Virtual Account" &&
      !data.bank
    ) {
      setError("Pilih bank untuk pembayaran.");
      return;
    }

    const alamat =
      data.metodeKirim === "Dikirim"
        ? [
            `Penerima: ${data.namaPenerima}`,
            `No. HP: ${data.nomorHp}`,
            alamatLengkap,
          ]
            .filter(Boolean)
            .join(", ")
        : "";

    // KONFIRMASI SEBELUM MENGUBAH DATABASE
    const setuju = window.confirm(
      `Buat pesanan untuk ${items.length} material dengan total ${rupiah(total)}?\n\n` +
        "Ini akan menyimpan pesanan, mengurangi stok, dan menghapus material yang dipesan dari keranjang di Supabase."
    );

    if (!setuju) return;

    setSubmitting(true);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error(
          "Silakan login sebagai Buyer terlebih dahulu."
        );
      }

      const response = await fetch("/api/orders/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          items: items.map((item) => ({
            id_keranjang: Number(item.id_keranjang),
            kuantitas: Number(item.kuantitas),
            harga: Number(item.harga),
          })),

          metode_kirim: data.metodeKirim,
          alamat,
        }),
      });

      const result = await response
        .json()
        .catch(() => ({}));

      if (
        !response.ok ||
        !result.success ||
        !result.id_pesanan
      ) {
        throw new Error(
          result.error ||
            "Gagal membuat pesanan gabungan."
        );
      }

      // BERHASIL: MENUJU PESANAN SAYA
      window.location.assign("/orders");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat membuat pesanan."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#f5f8f2] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#3f6a0b]"
          >
            <ArrowLeft size={17} />
            Kembali ke Keranjang
          </Link>

          {/* HEADER */}
          <div className="mt-6">
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
              <ShoppingBag
                size={30}
                className="text-[#3f6a0b]"
              />
              Checkout Keranjang
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Selesaikan tiga langkah untuk memesan material yang kamu pilih.
            </p>
          </div>

          {loading ? (
            <div className="mt-8 rounded-2xl bg-white p-12 text-center">
              <Loader2
                size={30}
                className="mx-auto animate-spin text-[#3f6a0b]"
              />

              <p className="mt-3 text-sm text-gray-500">
                Memuat material pilihan...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
              <p className="text-sm text-red-700">
                {error ||
                  "Tidak ada material yang dapat di-checkout."}
              </p>

              <Link
                href="/cart"
                className="mt-4 inline-block font-semibold text-[#3f6a0b]"
              >
                Kembali ke Keranjang
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
              {/* BAGIAN KIRI */}
              <section className="h-fit rounded-2xl bg-white p-6 shadow-sm sm:p-8">
                {/* PROGRESS BAR */}
                <div className="mb-8 grid grid-cols-3 gap-3">
                  {steps.map((name, index) => (
                    <div key={name}>
                      <div
                        className={`h-1.5 rounded-full ${
                          index <= step
                            ? "bg-[#3f6a0b]"
                            : "bg-gray-200"
                        }`}
                      />

                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className={`text-xs sm:text-sm ${
                            index === step
                              ? "font-semibold text-[#3f6a0b]"
                              : "text-gray-500"
                          }`}
                        >
                          {index + 1}. {name}
                        </span>

                        {index < step && (
                          <Check
                            size={15}
                            className="text-[#3f6a0b]"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* STEP 1: JUMLAH PESANAN */}
                {step === 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Jumlah Pesanan
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                      Periksa material dan jumlah pesanan.
                    </p>

                    <div className="mt-6 space-y-4">
                      {items.map((item) => (
                        <div
                          key={item.id_keranjang}
                          className="rounded-xl border border-gray-200 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                              <Package
                                size={24}
                                className="text-[#3f6a0b]"
                              />
                            </div>

                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">
                                {item.nama_material}
                              </h3>

                              <p className="mt-1 text-sm text-gray-500">
                                {rupiah(item.harga)}/
                                {item.satuan || "unit"}
                              </p>

                              <p className="mt-2 text-sm">
                                Jumlah:{" "}
                                <strong>
                                  {item.kuantitas}{" "}
                                  {item.satuan || "unit"}
                                </strong>
                              </p>

                              <p className="mt-2 font-bold text-[#3f6a0b]">
                                {rupiah(
                                  Number(item.harga) *
                                    Number(item.kuantitas)
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Link
                      href="/cart"
                      className="mt-5 inline-block text-sm font-medium text-[#3f6a0b] hover:underline"
                    >
                      Ubah jumlah di Keranjang
                    </Link>
                  </div>
                )}

                {/* STEP 2: ALAMAT */}
                {step === 1 && (
                  <div>
                    <div className="mb-5 flex gap-3">
                      {[
                        "Dikirim",
                        "Ambil di tempat",
                      ].map((metode) => (
                        <button
                          key={metode}
                          type="button"
                          onClick={() =>
                            update({
                              metodeKirim: metode,
                            })
                          }
                          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                            data.metodeKirim === metode
                              ? "border-[#3f6a0b] bg-green-50 text-[#3f6a0b]"
                              : "border-gray-200 text-gray-600"
                          }`}
                        >
                          {metode}
                        </button>
                      ))}
                    </div>

                    <AlamatPengirimanStep
                      data={data}
                      onChange={update}
                      showErrors={showAlamatErrors}
                    />
                  </div>
                )}

                {/* STEP 3: PEMBAYARAN */}
                {step === 2 && (
                  <div>
                    <PembayaranStep
                      data={data}
                      onChange={update}
                    />

                    <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
                      <h3 className="font-bold text-green-900">
                        Konfirmasi Pesanan
                      </h3>

                      <div className="mt-4 space-y-3 text-sm text-green-900">
                        {items.map((item) => (
                          <div
                            key={item.id_keranjang}
                            className="flex justify-between gap-3"
                          >
                            <span>
                              {item.nama_material} (
                              {item.kuantitas}{" "}
                              {item.satuan || "unit"})
                            </span>

                            <strong>
                              {rupiah(
                                Number(item.harga) *
                                  Number(item.kuantitas)
                              )}
                            </strong>
                          </div>
                        ))}

                        <div className="border-t border-green-200 pt-3">
                          <p>
                            <strong>Pengiriman:</strong>{" "}
                            {data.metodeKirim}
                          </p>

                          {data.metodeKirim === "Dikirim" && (
                            <>
                              <p className="mt-2">
                                <strong>Penerima:</strong>{" "}
                                {data.namaPenerima}
                              </p>

                              <p className="mt-2">
                                <strong>No. HP:</strong>{" "}
                                {data.nomorHp}
                              </p>

                              <p className="mt-2">
                                <strong>Alamat:</strong>{" "}
                                {alamatLengkap}
                              </p>
                            </>
                          )}

                          <p className="mt-2">
                            <strong>
                              Pembayaran (simulasi):
                            </strong>{" "}
                            {data.metodePembayaran}
                            {data.metodePembayaran ===
                              "Virtual Account" &&
                              ` - ${data.bank}`}
                          </p>
                        </div>

                        <div className="flex justify-between border-t border-green-200 pt-3 font-bold">
                          <span>Total Pesanan</span>
                          <span>{rupiah(total)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                      <AlertCircle
                        size={18}
                        className="shrink-0"
                      />

                      <span>
                        Nomor Virtual Account hanya simulasi.
                        Membuat pesanan akan mengubah stok dan
                        keranjang pada database yang terhubung.
                      </span>
                    </div>
                  </div>
                )}

                {/* PESAN ERROR */}
                {error && (
                  <div
                    role="alert"
                    className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                {/* TOMBOL NAVIGASI */}
                <div className="mt-8 flex justify-between gap-3 border-t border-gray-100 pt-6">
                  <button
                    type="button"
                    onClick={kembali}
                    disabled={step === 0 || submitting}
                    className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 disabled:opacity-40"
                  >
                    Kembali
                  </button>

                  {step < 2 ? (
                    <button
                      type="button"
                      onClick={lanjut}
                      className="rounded-lg bg-[#3f6a0b] px-6 py-3 text-sm font-semibold text-white hover:bg-[#345609]"
                    >
                      Lanjut
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={buatPesanan}
                      disabled={submitting}
                      className="rounded-lg bg-[#3f6a0b] px-6 py-3 text-sm font-semibold text-white hover:bg-[#345609] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting
                        ? "Memproses Pesanan..."
                        : "Buat Pesanan"}
                    </button>
                  )}
                </div>
              </section>

              {/* BAGIAN KANAN: RINGKASAN */}
              <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">
                  Ringkasan Pesanan
                </h2>

                <div className="mt-5 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Jumlah Material
                    </span>
                    <strong>{items.length}</strong>
                  </div>

                  {items.map((item) => (
                    <div
                      key={item.id_keranjang}
                      className="border-t border-gray-100 pt-3"
                    >
                      <p className="text-sm font-semibold text-gray-900">
                        {item.nama_material}
                      </p>

                      <div className="mt-2 flex justify-between text-xs text-gray-500">
                        <span>
                          {item.kuantitas}{" "}
                          {item.satuan || "unit"}
                        </span>

                        <span>
                          {rupiah(
                            Number(item.harga) *
                              Number(item.kuantitas)
                          )}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between border-t border-gray-100 pt-4">
                    <span className="font-bold">
                      Total
                    </span>

                    <span className="text-xl font-bold text-[#3f6a0b]">
                      {rupiah(total)}
                    </span>
                  </div>
                </div>

                <p className="mt-5 text-xs leading-relaxed text-gray-500">
                  Total belum termasuk biaya pengiriman.
                  Harga dan stok diverifikasi ulang oleh
                  server sebelum pesanan dibuat.
                </p>

                <Link
                  href="/cart"
                  className="mt-6 flex justify-center rounded-xl border border-[#3f6a0b] px-4 py-3 text-sm font-semibold text-[#3f6a0b] hover:bg-green-50"
                >
                  Kembali ke Keranjang
                </Link>
              </aside>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
