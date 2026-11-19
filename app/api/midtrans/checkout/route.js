
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleFromUser } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIDTRANS_URL =
  "https://app.sandbox.midtrans.com/snap/v1/transactions";

function sendError(message, status = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

function getAdmin() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request) {
  try {
    // 1. Pastikan hanya menggunakan Sandbox
    if (process.env.MIDTRANS_IS_PRODUCTION === "true") {
      return sendError(
        "Endpoint ini hanya untuk Midtrans Sandbox.",
        403
      );
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      return sendError(
        "Server Key Midtrans belum tersedia.",
        500
      );
    }

    const admin = getAdmin();

    if (!admin) {
      return sendError(
        "Konfigurasi Supabase belum lengkap.",
        500
      );
    }

    // 2. Memeriksa login pengguna
    const authorization =
      request.headers.get("authorization") || "";

    const token = authorization.replace(
      /^Bearer\s+/i,
      ""
    );

    if (!token || token === authorization) {
      return sendError(
        "Silakan login sebagai Buyer terlebih dahulu.",
        401
      );
    }

    const { data: authData, error: authError } =
      await admin.auth.getUser(token);

    if (authError || !authData?.user) {
      return sendError(
        "Sesi login tidak valid.",
        401
      );
    }

    const user = authData.user;

    if (roleFromUser(user) !== "buyer") {
      return sendError(
        "Pembayaran hanya dapat dilakukan oleh Buyer.",
        403
      );
    }

    // 3. Membaca ID pesanan
    const body = await request
      .json()
      .catch(() => null);

    const idPesanan = body?.id_pesanan;

    if (
      !Number.isSafeInteger(idPesanan) ||
      idPesanan <= 0
    ) {
      return sendError("ID pesanan tidak valid.");
    }

    // 4. Mencari profil Buyer
    const { data: buyer, error: buyerError } =
      await admin
        .from("pembeli")
        .select("id_buyer")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (buyerError) {
      return sendError(
        "Gagal membaca profil Buyer.",
        500
      );
    }

    if (!buyer) {
      return sendError(
        "Profil Buyer tidak ditemukan.",
        404
      );
    }

    // 5. Mengambil pesanan asli dari Supabase
    const { data: pesanan, error: pesananError } =
      await admin
        .from("pesanan")
        .select(
          "id_pesanan,id_buyer,total_estimasi,status_pesanan"
        )
        .eq("id_pesanan", idPesanan)
        .maybeSingle();

    if (pesananError) {
      return sendError(
        "Gagal membaca data pesanan.",
        500
      );
    }

    if (!pesanan) {
      return sendError(
        "Pesanan tidak ditemukan.",
        404
      );
    }

    // Buyer hanya boleh membayar pesanannya sendiri
    if (pesanan.id_buyer !== buyer.id_buyer) {
      return sendError(
        "Kamu tidak memiliki akses ke pesanan ini.",
        403
      );
    }

    // Hanya pesanan yang masih menunggu
    const statusPesanan = String(
      pesanan.status_pesanan || ""
    ).trim().toLowerCase();

    if (
      !["menunggu", "menunggu konfirmasi"].includes(
        statusPesanan
      )
    ) {
      return sendError(
        "Status pesanan tidak memungkinkan pembayaran baru.",
        409
      );
    }

    // 6. Nominal diambil dari DATABASE,
    // bukan dari harga yang dikirim browser
    const nominal = Number(pesanan.total_estimasi);

    if (
      !Number.isSafeInteger(nominal) ||
      nominal <= 0
    ) {
      return sendError(
        "Nominal pesanan harus berupa rupiah bulat dan lebih dari nol.",
        400
      );
    }

    // Satu order Midtrans untuk satu pesanan CIRCLO
    const midtransOrderId =
      `CIRCLO-ORDER-${idPesanan}`;

    // 7. Memeriksa pembayaran yang sudah dibuat
    const { data: existing, error: existingError } =
      await admin
        .from("pembayaran_midtrans")
        .select(
          "id_pembayaran,midtrans_order_id,status_pembayaran,snap_token"
        )
        .eq("midtrans_order_id", midtransOrderId)
        .maybeSingle();

    if (existingError) {
      return sendError(
        "Gagal memeriksa data pembayaran.",
        500
      );
    }

    if (existing) {
      const status = String(
        existing.status_pembayaran || ""
      ).toLowerCase();

      if (
        ["settlement", "capture", "success"].includes(
          status
        )
      ) {
        return sendError(
          "Pesanan ini sudah memiliki pembayaran berhasil.",
          409
        );
      }

      if (status === "pending" && existing.snap_token) {
        return NextResponse.json({
          success: true,
          reused: true,
          id_pesanan: idPesanan,
          midtrans_order_id: midtransOrderId,
          nominal,
          snap_token: existing.snap_token,
        });
      }

      return sendError(
        "Transaksi sudah pernah dibuat. Statusnya perlu diperiksa sebelum mencoba lagi.",
        409
      );
    }

    // 8. Menyimpan referensi transaksi ke Supabase
    const { data: pembayaran, error: insertError } =
      await admin
        .from("pembayaran_midtrans")
        .insert({
          id_pesanan: idPesanan,
          midtrans_order_id: midtransOrderId,
          nominal,
          status_pembayaran: "pending",
        })
        .select("id_pembayaran")
        .single();

    if (insertError) {
      return sendError(
        "Gagal membuat referensi pembayaran. Periksa apakah transaksi sudah ada.",
        409
      );
    }

    // 9. Membuat transaksi Midtrans Snap
    const payload = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: nominal,
      },
      item_details: [
        {
          id: `ORDER-${idPesanan}`,
          name: "Pembelian Material CIRCLO",
          price: nominal,
          quantity: 1,
        },
      ],
    };

    const encodedKey = Buffer.from(
      `${serverKey}:`
    ).toString("base64");

    let response;

    try {
      response = await fetch(MIDTRANS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${encodedKey}`,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      // Jangan hapus referensi ketika hasil
      // permintaan ke Midtrans belum pasti.
      return sendError(
        "Koneksi Midtrans terputus. Periksa transaksi sebelum mencoba lagi.",
        502
      );
    }

    const result = await response
      .json()
      .catch(() => ({}));

    if (!response.ok || !result.token) {
      // Permintaan ditolak Midtrans.
      // Hapus reservasi jika belum ada token.
      await admin
        .from("pembayaran_midtrans")
        .delete()
        .eq(
          "id_pembayaran",
          pembayaran.id_pembayaran
        )
        .is("snap_token", null);

      return sendError(
        "Midtrans gagal membuat pembayaran. Periksa konfigurasi Sandbox.",
        502
      );
    }

    // 10. Simpan Snap Token ke database
    const { error: updateError } = await admin
      .from("pembayaran_midtrans")
      .update({
        snap_token: result.token,
        updated_at: new Date().toISOString(),
      })
      .eq("id_pembayaran", pembayaran.id_pembayaran);

    if (updateError) {
      return sendError(
        "Transaksi Midtrans dibuat, tetapi token gagal disimpan. Jangan ulangi pembayaran sebelum memeriksa statusnya.",
        500
      );
    }

    // 11. Mengirim token ke frontend
    return NextResponse.json({
      success: true,
      reused: false,
      id_pesanan: idPesanan,
      midtrans_order_id: midtransOrderId,
      nominal,
      snap_token: result.token,
      redirect_url: result.redirect_url,
      status_pembayaran: "pending",
    });

  } catch (error) {
    console.error(
      "POST /api/midtrans/checkout:",
      error.message
    );

    return sendError(
      "Terjadi kesalahan pada server pembayaran.",
      500
    );
  }
}
