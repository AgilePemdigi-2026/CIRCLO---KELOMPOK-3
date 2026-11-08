
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleFromUser } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Koneksi Supabase khusus server
function adminClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Mengirim pesan error ke frontend
function sendError(message, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

// POST /api/orders/:id/cancel
export async function POST(request, { params }) {
  try {
    // 1. Hubungkan ke Supabase
    const admin = adminClient();

    if (!admin) {
      return sendError(
        "Konfigurasi Supabase belum lengkap.",
        500
      );
    }

    // 2. Periksa token login
    const authorization =
      request.headers.get("authorization") || "";

    const token = authorization.replace(
      /^Bearer\s+/i,
      ""
    );

    if (!token) {
      return sendError(
        "Silakan login terlebih dahulu.",
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

    // 3. Hanya Buyer yang diperbolehkan
    if (roleFromUser(user) !== "buyer") {
      return sendError(
        "Hanya Buyer yang dapat membatalkan pesanan.",
        403
      );
    }

    // 4. Ambil ID pesanan dari URL
    const routeParams = await params;
    const idPesanan = Number(routeParams?.id);

    if (
      !Number.isSafeInteger(idPesanan) ||
      idPesanan <= 0
    ) {
      return sendError(
        "ID pesanan tidak valid.",
        400
      );
    }

    // 5. Jalankan fungsi pembatalan di Supabase
    // Fungsi SQL akan:
    // - memeriksa kepemilikan pesanan
    // - memeriksa status Menunggu Konfirmasi
    // - mengembalikan stok seluruh material
    // - mengubah status menjadi Dibatalkan
    // - menyimpan riwayat pembatalan
    const { data: result, error: rpcError } =
      await admin.rpc("cancel_buyer_order", {
        p_order_id: idPesanan,
        p_auth_user_id: user.id,
      });

    if (rpcError) {
      console.error(
        "Gagal membatalkan pesanan:",
        rpcError
      );

      return sendError(
        "Gagal membatalkan pesanan. Silakan periksa kembali status pesanan.",
        500
      );
    }

    // 6. Periksa hasil pembatalan
    if (!result?.success) {
      return sendError(
        result?.error ||
          "Pesanan tidak dapat dibatalkan.",
        409
      );
    }

    // 7. Kirim hasil ke frontend
    return NextResponse.json({
      success: true,
      id_pesanan: result.id_pesanan,
      status_pesanan: result.status_pesanan,
      jumlah_material: result.jumlah_material,
      message: "Pesanan berhasil dibatalkan.",
    });

  } catch (error) {
    console.error(
      "POST /api/orders/[id]/cancel:",
      error
    );

    return sendError(
      "Terjadi kesalahan pada server.",
      500
    );
  }
}
