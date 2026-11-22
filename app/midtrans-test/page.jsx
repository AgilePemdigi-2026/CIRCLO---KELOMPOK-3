
"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { getAccessToken } from "@/lib/auth";
import {
  CreditCard,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

export default function MidtransTestPage() {
  const [snapReady, setSnapReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [orderId, setOrderId] = useState("");

  // Memuat Midtrans Snap.js Sandbox
  useEffect(() => {
    if (!CLIENT_KEY) {
      setError("Client Key Midtrans belum dikonfigurasi.");
      return;
    }

    if (window.snap?.pay) {
      setSnapReady(true);
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://app.sandbox.midtrans.com/snap/snap.js";

    script.setAttribute("data-client-key", CLIENT_KEY);
    script.async = true;

    script.onload = () => {
      if (window.snap?.pay) {
        setSnapReady(true);
      } else {
        setError("Midtrans Snap gagal diinisialisasi.");
      }
    };

    script.onerror = () => {
      setError("Gagal memuat Midtrans Snap.js.");
    };

    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
      script.remove();
    };
  }, []);

  // Memulai simulasi pembayaran
  const handleBayar = async () => {
    if (loading) return;

    setLoading(true);
    setError("");
    setStatus("");
    setOrderId("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error(
          "Silakan login menggunakan akun Buyer terlebih dahulu."
        );
      }

      if (!window.snap?.pay) {
        throw new Error("Midtrans Snap belum siap.");
      }

      // Memanggil API Sandbox yang sudah kita buat
      const response = await fetch(
        "/api/midtrans/sandbox",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal membuat transaksi Midtrans."
        );
      }

      if (!result.token) {
        throw new Error("Snap Token tidak ditemukan.");
      }

      setOrderId(result.order_id);
      setStatus("Popup pembayaran berhasil dibuka.");

      // Membuka popup Midtrans
      window.snap.pay(result.token, {
        onSuccess: () => {
          setStatus(
            "Snap melaporkan pembayaran selesai. " +
            "Status server belum diverifikasi."
          );
        },

        onPending: () => {
          setStatus("Pembayaran masih menunggu (pending).");
        },

        onError: () => {
          setStatus("Pembayaran gagal atau ditolak.");
        },

        onClose: () => {
          setStatus(
            "Popup ditutup. Transaksi mungkin masih pending."
          );
        },
      });
    } catch (err) {
      setError(
        err.message || "Terjadi kesalahan pembayaran."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

          {/* HEADER */}
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-100 p-3 text-[#3f6a0b]">
              <CreditCard size={28} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Simulasi Pembayaran
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                CIRCLO - Midtrans Sandbox
              </p>
            </div>
          </div>

          {/* INFO SANDBOX */}
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 text-[#3f6a0b]">
              <ShieldCheck size={20} />
              <span className="font-semibold">
                Mode Sandbox Aktif
              </span>
            </div>

            <p className="mt-2 text-sm text-gray-600">
              Ini adalah simulasi pembayaran untuk
              pengujian CIRCLO. Tidak menggunakan
              uang sungguhan dan tidak membuat
              pesanan di database.
            </p>
          </div>

          {/* NOMINAL */}
          <div className="mt-6 rounded-xl bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              Total Pembayaran Simulasi
            </p>

            <p className="mt-2 text-3xl font-bold text-[#3f6a0b]">
              Rp10.000
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Nominal khusus untuk uji Midtrans Sandbox.
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div
              role="alert"
              className="mt-5 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TOMBOL BAYAR */}
          <button
            type="button"
            onClick={handleBayar}
            disabled={!snapReady || loading || !CLIENT_KEY}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#3f6a0b] px-4 py-3 font-semibold text-white transition hover:bg-[#345609] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <CreditCard size={20} />
            )}

            {loading
              ? "Menghubungkan ke Midtrans..."
              : !snapReady
              ? "Menyiapkan Midtrans..."
              : "Coba Bayar (Sandbox)"}
          </button>

          {/* HASIL SIMULASI */}
          {status && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4"
            >
              <div className="flex items-center gap-2 text-[#3f6a0b]">
                <CheckCircle2 size={18} />
                <p className="font-semibold">
                  Hasil Simulasi
                </p>
              </div>

              <p className="mt-2 text-sm text-gray-700">
                {status}
              </p>

              {orderId && (
                <p className="mt-2 break-all text-xs text-gray-500">
                  ID Transaksi: {orderId}
                </p>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-xs text-gray-500">
            Status popup hanya informasi sementara.
            Konfirmasi pembayaran final harus
            diverifikasi melalui backend Midtrans.
          </p>
        </div>
      </main>
    </>
  );
}
