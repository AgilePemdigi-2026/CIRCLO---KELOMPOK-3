
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleFromUser } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIDTRANS_STATUS_URL =
  "https://api.sandbox.midtrans.com/v2";

function errorResponse(message, status = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

export async function POST(request) {
  try {
    // 1. Pastikan environment Sandbox
    if (process.env.MIDTRANS_IS_PRODUCTION !== "false") {
      return errorResponse(
        "Verifikasi ini hanya untuk Midtrans Sandbox.",
        403
      );
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serverKey || !supabaseUrl || !serviceKey) {
      return errorResponse(
        "Konfigurasi server belum lengkap.",
        500
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 2. Memeriksa autentikasi Buyer
    const authorization =
      request.headers.get("authorization") || "";

    if (!/^Bearer\s+\S+$/i.test(authorization)) {
      return errorResponse(
        "Silakan login terlebih dahulu.",
        401
      );
    }

    const token = authorization.replace(
      /^Bearer\s+/i,
      ""
    );

    const { data: authData, error: authError } =
      await admin.auth.getUser(token);

    if (authError || !authData?.user) {
      return errorResponse(
        "Sesi login tidak valid.",
        401
      );
    }

    if (roleFromUser(authData.user) !== "buyer") {
      return errorResponse(
        "Hanya Buyer yang dapat memeriksa pembayaran.",
        403
      );
    }

    // 3. Mengambil ID pesanan
    const body = await request.json().catch(() => null);

    const idPesanan = Number(body?.id_pesanan);

    if (
      !Number.isSafeInteger(idPesanan) ||
      idPesanan <= 0
    ) {
      return errorResponse("ID pesanan tidak valid.");
    }

    // 4. Mencari profil Buyer
    const { data: buyer, error: buyerError } =
      await admin
        .from("pembeli")
        .select("id_buyer")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

    if (buyerError) {
      return errorResponse(
        "Gagal memeriksa profil Buyer.",
        500
      );
    }

    if (!buyer) {
      return errorResponse(
        "Profil Buyer tidak ditemukan.",
        404
      );
    }

    // 5. Memastikan pesanan milik Buyer
    const { data: pesanan, error: orderError } =
      await admin
        .from("pesanan")
        .select("id_pesanan,id_buyer,total_estimasi")
        .eq("id_pesanan", idPesanan)
        .eq("id_buyer", buyer.id_buyer)
        .maybeSingle();

    if (orderError) {
      return errorResponse(
        "Gagal membaca data pesanan.",
        500
      );
    }

    if (!pesanan) {
      return errorResponse(
        "Pesanan tidak ditemukan atau bukan milikmu.",
        404
      );
    }

    // 6. Membaca pembayaran dari Supabase
    const { data: pembayaran, error: paymentError } =
      await admin
        .from("pembayaran_midtrans")
        .select(
          "id_pembayaran,midtrans_order_id,nominal,status_pembayaran"
        )
        .eq("id_pesanan", idPesanan)
        .maybeSingle();

    if (paymentError) {
      return errorResponse(
        "Gagal membaca pembayaran.",
        500
      );
    }

    if (!pembayaran) {
      return errorResponse(
        "Pembayaran Midtrans belum dibuat.",
        404
      );
    }

    const orderId = pembayaran.midtrans_order_id;

    if (orderId !== `CIRCLO-ORDER-${idPesanan}`) {
      return errorResponse(
        "Referensi pembayaran tidak sesuai.",
        409
      );
    }

    // 7. Memeriksa status langsung ke Midtrans
    const encodedKey = Buffer.from(
      `${serverKey}:`
    ).toString("base64");

    const response = await fetch(
      `${MIDTRANS_STATUS_URL}/${encodeURIComponent(orderId)}/status`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${encodedKey}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    const result = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      return errorResponse(
        "Status transaksi belum dapat diperiksa di Midtrans.",
        502
      );
    }

    // 8. Validasi identitas dan nominal transaksi
    const nominalDatabase = Number(pembayaran.nominal);
    const nominalPesanan = Number(pesanan.total_estimasi);
    const nominalMidtrans = Number(result.gross_amount);

    if (
      result.order_id !== orderId ||
      !Number.isFinite(nominalMidtrans) ||
      nominalDatabase !== nominalPesanan ||
      nominalMidtrans !== nominalDatabase
    ) {
      return errorResponse(
        "Data transaksi Midtrans tidak sesuai dengan pesanan.",
        409
      );
    }

    // 9. Menentukan status pembayaran
    const transactionStatus = String(
      result.transaction_status || ""
    ).toLowerCase();

    const fraudStatus = String(
      result.fraud_status || ""
    ).toLowerCase();

    if (!transactionStatus) {
      return errorResponse(
        "Status Midtrans tidak tersedia.",
        502
      );
    }

    let statusPembayaran = transactionStatus;

    // Capture belum dinyatakan berhasil jika
    // pemeriksaan fraud tidak diterima.
    if (
      transactionStatus === "capture" &&
      fraudStatus &&
      fraudStatus !== "accept"
    ) {
      statusPembayaran =
        fraudStatus === "challenge" ? "challenge" : "deny";
    }

    // Settlement dengan fraud tidak diterima
    // juga tidak boleh dianggap sukses.
    if (
      transactionStatus === "settlement" &&
      fraudStatus &&
      fraudStatus !== "accept"
    ) {
      statusPembayaran = "challenge";
    }

    
    // 10. Pastikan status Midtrans dikenal
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
      "challenge",
    ];

    if (!validStatuses.includes(statusPembayaran)) {
      return errorResponse(
        "Status pembayaran Midtrans tidak dikenal.",
        502
      );
    }

    // Pembayaran berhasil harus memiliki status_code 200
    if (
      ["settlement", "capture"].includes(statusPembayaran) &&
      String(result.status_code) !== "200"
    ) {
      return errorResponse(
        "Status keberhasilan Midtrans tidak valid.",
        502
      );
    }

    // 11. Sinkronkan pembayaran dan pesanan
    // melalui fungsi database yang sama dengan webhook
    const { data: hasilSinkronisasi, error: syncError } =
      await admin.rpc("sync_midtrans_payment", {
        p_order_id: idPesanan,
        p_midtrans_order_id: orderId,
        p_status: statusPembayaran,
        p_nominal: nominalMidtrans,
        p_transaction_id: result.transaction_id || null,
        p_payment_type: result.payment_type || null,
      });

    if (syncError || !hasilSinkronisasi?.success) {
      console.error(
        "Midtrans verify sync error:",
        syncError?.message || hasilSinkronisasi?.error
      );

      return errorResponse(
        "Pembayaran berhasil diperiksa tetapi gagal disinkronkan.",
        503
      );
    }

    // 12. Mengambil status akhir dari database
    const statusAkhir = String(
      hasilSinkronisasi.status_pembayaran || ""
    ).toLowerCase();

    const lunas = ["settlement", "capture"].includes(
      statusAkhir
    );

    // 13. Kembalikan stok jika pembayaran gagal final
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
          "Midtrans verify stock error:",
          stokError?.message || hasilStok?.error
        );

        return errorResponse(
          "Status pembayaran berhasil diperiksa, tetapi stok belum berhasil disinkronkan.",
          503
        );
      }

      stockReleased = hasilStok.stock_released === true;
      stockRequiresReview =
        hasilStok.requires_review === true;
    }

    // 13. Kirim hasil verifikasi ke frontend
    return NextResponse.json({
      success: true,
      id_pesanan: idPesanan,
      stock_released: stockReleased,
      requires_review:
      hasilSinkronisasi.requires_review || stockRequiresReview,
      midtrans_order_id: orderId,
      nominal: nominalMidtrans,
      status_pembayaran: statusAkhir,
      lunas,
      order_updated: hasilSinkronisasi.order_updated,
      requires_review: hasilSinkronisasi.requires_review,
      message: lunas
        ? "Pembayaran berhasil diverifikasi oleh Midtrans."
        : "Pembayaran belum dinyatakan lunas.",
    });

  } catch (error) {
    console.error(
      "Midtrans verify error:",
      error.message
    );

    return errorResponse(
      "Gagal memverifikasi pembayaran.",
      500
    );
  }
}
