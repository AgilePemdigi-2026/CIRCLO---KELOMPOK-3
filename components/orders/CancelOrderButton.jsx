
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import { getAccessToken } from "@/lib/auth";

export default function CancelOrderButton({
  idPesanan,
  statusPesanan,
  compact = false,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const cancelRef = useRef(null);
  const triggerRef = useRef(null);
  const titleId = useId();

  const canCancel =
    String(statusPesanan || "")
      .trim()
      .toLowerCase() === "menunggu konfirmasi";

  const kodePesanan = `ORD-${String(idPesanan).padStart(4, "0")}`;

  // Menangani tombol Escape dan scroll ketika popup terbuka
  useEffect(() => {
    if (!modalOpen) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    cancelRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) {
        setModalOpen(false);
        setError("");
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [modalOpen, submitting]);

  // Membuka popup
  const bukaModal = () => {
    if (submitting) return;

    setError("");
    setModalOpen(true);
  };

  // Menutup popup tanpa membatalkan pesanan
  const tutupModal = () => {
    if (submitting) return;

    setModalOpen(false);
    setError("");
    triggerRef.current?.focus();
  };

  // Mengirim pembatalan ke API CIRCLO
  const konfirmasiPembatalan = async () => {
    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error(
          "Silakan login sebagai Buyer terlebih dahulu."
        );
      }

      const response = await fetch(
        `/api/orders/${encodeURIComponent(idPesanan)}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Gagal membatalkan pesanan."
        );
      }

      // Perbarui status dan riwayat setelah berhasil
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat membatalkan pesanan."
      );

      setSubmitting(false);
    }
  };

  // Hanya muncul jika pesanan belum dikonfirmasi Seller
  if (!canCancel) return null;

  // Tombol pembatalan di halaman Detail Pesanan
  const tombol = (
    <button
      ref={triggerRef}
      type="button"
      onClick={bukaModal}
      disabled={submitting}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500 bg-white px-4 py-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
    >
      <XCircle size={18} />
      Batalkan Pesanan
    </button>
  );

  // Popup konfirmasi pembatalan
  const modal =
    modalOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-[2px]">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              {/* TOMBOL TUTUP */}
              <button
                type="button"
                aria-label="Tutup konfirmasi pembatalan"
                onClick={tutupModal}
                disabled={submitting}
                className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
              >
                <X size={20} />
              </button>

              {/* ICON PERINGATAN */}
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle size={27} />
              </div>

              {/* JUDUL */}
              <h2
                id={titleId}
                className="pr-8 text-xl font-bold text-slate-900"
              >
                Batalkan Pesanan?
              </h2>

              {/* NOMOR PESANAN */}
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Kamu yakin ingin membatalkan pesanan
                <span className="font-semibold text-slate-900">
                  {" "}#{kodePesanan}
                </span>
                ?
              </p>

              {/* INFORMASI PEMBATALAN */}
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                Pesanan akan berstatus{" "}
                <strong>Dibatalkan</strong> dan stok seluruh
                material dikembalikan. Pesanan yang dibatalkan
                tidak bisa dilanjutkan kembali.
              </div>

              {/* PESAN ERROR */}
              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              {/* TOMBOL AKSI */}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={tutupModal}
                  disabled={submitting}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Kembali
                </button>

                <button
                  type="button"
                  onClick={konfirmasiPembatalan}
                  disabled={submitting}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Memproses...
                    </>
                  ) : (
                    "Ya, Batalkan Pesanan"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  // Tombol compact di kanan atas halaman Detail Pesanan
  if (compact) {
    return (
      <div className="w-full shrink-0 sm:w-auto">
        {tombol}
        {modal}
      </div>
    );
  }

  // Tampilan alternatif jika dipakai di halaman lain
  return (
    <section className="mt-5 rounded-xl border border-red-200 bg-white p-5">
      <h3 className="mb-2 flex items-center gap-2 font-bold text-gray-900">
        <XCircle size={19} className="text-red-600" />
        Pembatalan Pesanan
      </h3>

      <p className="mb-4 text-sm text-gray-500">
        Pesanan dapat dibatalkan selama belum
        dikonfirmasi penjual.
      </p>

      {tombol}
      {modal}
    </section>
  );
}
