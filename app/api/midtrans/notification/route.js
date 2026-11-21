
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_URL =
  "https://api.sandbox.midtrans.com/v2";

function reply(data, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(request) {
  try {
    // Hanya menerima transaksi Sandbox
    if (process.env.MIDTRANS_IS_PRODUCTION !== "false") {
      return reply({ error: "Sandbox only" }, 403);
    }


const serverKey = process.env.MIDTRANS_SERVER_KEY;
const signatureSecretKey = process.env.MIDTRANS_SIGNATURE_SECRET_KEY;
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;


if (!serverKey || !signatureSecretKey || !supabaseUrl || !serviceKey) {
      return reply({ error: "Konfigurasi belum lengkap" }, 503);
    }

    // 1. Membaca notifikasi Midtrans
    const body = await request.json().catch(() => null);

    if (!body) {
      return reply({ error: "JSON tidak valid" }, 400);
    }

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
    } = body;

    if (
      typeof order_id !== "string" ||
      typeof status_code !== "string" ||
      typeof gross_amount !== "string" ||
      typeof signature_key !== "string"
    ) {
      return reply({ error: "Notifikasi tidak lengkap" }, 400);
    }

    // 2. Verifikasi signature resmi Midtrans
const signatureInput =
  order_id + status_code + gross_amount + signatureSecretKey;


    const expected = createHash("sha512")
      .update(signatureInput)
      .digest("hex");

    if (!/^[a-f0-9]{128}$/i.test(signature_key)) {
      return reply({ error: "Signature tidak valid" }, 403);
    }

    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(signature_key, "hex");

    if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return reply({ error: "Signature tidak sesuai" }, 403);
    }

    // Abaikan transaksi dari halaman midtrans-test
    if (order_id.startsWith("CIRCLO-TEST-")) {
      return reply({
        success: true,
        ignored: true,
      });
    }

    // Hanya memproses transaksi Checkout CIRCLO
    const match = /^CIRCLO-ORDER-([1-9]\d*)$/.exec(order_id);

    if (!match) {
      return reply({ success: true, ignored: true });
    }

    const idPesanan = Number(match[1]);

    if (!Number.isSafeInteger(idPesanan)) {
      return reply({ error: "ID pesanan tidak valid" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 3. Cari pembayaran di Supabase
    const { data: pembayaran, error: paymentError } =
      await admin
        .from("pembayaran_midtrans")
        .select(
          "id_pembayaran,id_pesanan,midtrans_order_id,nominal,status_pembayaran"
        )
        .eq("midtrans_order_id", order_id)
        .maybeSingle();

    if (paymentError || !pembayaran) {
      return reply({
        error: "Referensi pembayaran belum ditemukan",
      }, 503);
    }

    if (pembayaran.id_pesanan !== idPesanan) {
      return reply({ error: "Referensi tidak sesuai" }, 409);
    }

    // 4. Baca total pesanan asli
    const { data: pesanan, error: orderError } =
      await admin
        .from("pesanan")
        .select("id_pesanan,total_estimasi")
        .eq("id_pesanan", idPesanan)
        .maybeSingle();

    if (orderError || !pesanan) {
      return reply({ error: "Pesanan tidak ditemukan" }, 503);
    }

    // 5. Ambil status TERBARU dari Midtrans
    const encodedKey = Buffer.from(
      `${serverKey}:`
    ).toString("base64");

    const midtransResponse = await fetch(
      `${STATUS_URL}/${encodeURIComponent(order_id)}/status`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${encodedKey}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!midtransResponse.ok) {
      return reply({
        error: "Gagal memeriksa status Midtrans",
      }, 503);
    }

    const result = await midtransResponse.json();

    // 6. Cocokkan identitas dan nominal
    const nominalDb = Number(pembayaran.nominal);
    const nominalOrder = Number(pesanan.total_estimasi);
    const nominalMidtrans = Number(result.gross_amount);

    if (
      result.order_id !== order_id ||
      !Number.isFinite(nominalDb) ||
      nominalDb <= 0 ||
      nominalDb !== nominalOrder ||
      nominalDb !== nominalMidtrans
    ) {
      return reply({
        error: "Data pembayaran tidak sesuai",
      }, 409);
    }

    // 7. Tentukan status pembayaran
    const transactionStatus = String(
      result.transaction_status || ""
    ).toLowerCase();

    const fraudStatus = String(
      result.fraud_status || ""
    ).toLowerCase();

    const validStatuses = [
      "pending",
      "settlement",
      "capture",
      "deny",
      "cancel",
      "expire",
      "failure",
      "refund",
      "partial_refund",
      "authorize",
    ];

    if (!validStatuses.includes(transactionStatus)) {
      return reply({ error: "Status tidak dikenal" }, 503);
    }

    let statusPembayaran = transactionStatus;

    if (
      ["settlement", "capture"].includes(transactionStatus)
    ) {
      if (String(result.status_code) !== "200") {
        return reply({
          error: "Status keberhasilan tidak valid",
        }, 503);
      }

      if (fraudStatus && fraudStatus !== "accept") {
        statusPembayaran =
          fraudStatus === "deny" ? "deny" : "challenge";
      }
    }

    
    // 8. Sinkronisasi status pembayaran dan pesanan
    // dalam satu transaksi database Supabase.
    const { data: hasilSinkronisasi, error: syncError } =
      await admin.rpc("sync_midtrans_payment", {
        p_order_id: idPesanan,
        p_midtrans_order_id: order_id,
        p_status: statusPembayaran,
        p_nominal: nominalMidtrans,
        p_transaction_id: result.transaction_id || null,
        p_payment_type: result.payment_type || null,
      });

    if (syncError || !hasilSinkronisasi?.success) {
      console.error(
        "Gagal sinkronisasi Midtrans:",
        syncError?.message || hasilSinkronisasi?.error
      );

      return reply(
        {
          error: "Gagal menyinkronkan pembayaran dan pesanan.",
        },
        503
      );
    }

    // 9. Berikan respons keberhasilan ke Midtrans
    
    // 9. Kembalikan stok jika pembayaran gagal final
    const statusAkhir = String(
      hasilSinkronisasi.status_pembayaran || ""
    ).toLowerCase();

    let stockReleased = false;
    let stockRequiresReview = false;

    const statusGagal = [
      "expire",
      "cancel",
      "deny",
      "failure",
    ];

    if (statusGagal.includes(statusAkhir)) {
      const { data: hasilStok, error: stokError } =
        await admin.rpc("release_failed_midtrans_order", {
          p_order_id: idPesanan,
        });

      if (stokError || !hasilStok?.success) {
        console.error(
          "Gagal mengembalikan stok:",
          stokError?.message || hasilStok?.error
        );

        // Midtrans dapat mengirim ulang notifikasi
        // agar proses yang gagal bisa dicoba lagi.
        return reply(
          {
            error: "Gagal memproses pengembalian stok.",
          },
          503
        );
      }

      stockReleased = hasilStok.stock_released === true;
      stockRequiresReview =
        hasilStok.requires_review === true;

      if (stockRequiresReview) {
        console.warn(
          "Pesanan perlu pemeriksaan manual:",
          idPesanan
        );
      }
    }

    // 10. Berikan respons ke Midtrans
    return reply({
      success: true,
      id_pesanan: idPesanan,
      status_pembayaran: statusAkhir,
      order_updated: hasilSinkronisasi.order_updated,
      stock_released: stockReleased,
      requires_review:
        hasilSinkronisasi.requires_review ||
        stockRequiresReview,
    });

  } catch (error) {
    console.error(
      "Midtrans webhook error:",
      error.message
    );

    return reply({
      error: "Gagal memproses notifikasi",
    }, 503);
  }
}
