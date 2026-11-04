
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleFromUser } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sendError(message, status = 400) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

export async function POST(request) {
  try {
    // 1. Koneksi Supabase di server
    const url =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return sendError(
        "Konfigurasi Supabase belum lengkap.",
        500
      );
    }

    const admin = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 2. Memeriksa login Buyer
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

    if (roleFromUser(user) !== "buyer") {
      return sendError(
        "Hanya Buyer yang dapat membuat pesanan.",
        403
      );
    }

    // 3. Membaca data checkout
    const body = await request
      .json()
      .catch(() => null);

    if (!body || !Array.isArray(body.items)) {
      return sendError(
        "Data keranjang tidak valid."
      );
    }

    if (
      body.items.length < 2 ||
      body.items.length > 20
    ) {
      return sendError(
        "Pilih 2 sampai 20 material."
      );
    }

    const items = body.items.map((item) => ({
      id_keranjang: Number(item.id_keranjang),
      kuantitas: Number(item.kuantitas),
      harga: Number(item.harga),
    }));

    const invalid = items.some(
      (item) =>
        !Number.isSafeInteger(item.id_keranjang) ||
        item.id_keranjang <= 0 ||
        !Number.isSafeInteger(item.kuantitas) ||
        item.kuantitas <= 0 ||
        !Number.isFinite(item.harga) ||
        item.harga < 0
    );

    if (invalid) {
      return sendError(
        "Jumlah, harga, atau ID keranjang tidak valid."
      );
    }

    const ids = items.map(
      (item) => item.id_keranjang
    );

    if (new Set(ids).size !== ids.length) {
      return sendError(
        "Ada material yang dipilih dua kali."
      );
    }

    // 4. Validasi pengiriman
    const metodeKirim = String(
      body.metode_kirim || ""
    ).trim();

    const alamat = String(
      body.alamat || ""
    ).trim();

    if (
      !["Dikirim", "Ambil di tempat"].includes(
        metodeKirim
      )
    ) {
      return sendError(
        "Metode pengiriman tidak valid."
      );
    }

    if (
      metodeKirim === "Dikirim" &&
      !alamat
    ) {
      return sendError(
        "Alamat pengiriman wajib diisi."
      );
    }

    // 5. Mencari identitas Buyer
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
        "Profil Buyer belum ditemukan.",
        404
      );
    }

    // 6. Memproses checkout gabungan melalui
    // transaksi PostgreSQL yang akan kita
    // pasang pada langkah berikutnya.
    const { data: result, error: rpcError } =
      await admin.rpc("checkout_selected_cart", {
        p_buyer_id: buyer.id_buyer,
        p_cart_items: items,
        p_metode_kirim: metodeKirim,
        p_alamat: alamat,
      });

    if (rpcError) {
      console.error(
        "Gagal checkout gabungan:",
        rpcError
      );

      return sendError(
        "Checkout belum berhasil. Periksa konfigurasi database dan stok.",
        500
      );
    }

    if (!result?.success) {
      return sendError(
        result?.error ||
          "Gagal membuat pesanan.",
        409
      );
    }

    // 7. Mengirim hasil ke frontend
    return NextResponse.json({
      success: true,
      id_pesanan: result.id_pesanan,
      total_estimasi: result.total_estimasi,
      jumlah_material: result.jumlah_material,
      status_pesanan: "Menunggu Konfirmasi",
    });
  } catch (error) {
    console.error(
      "POST /api/orders/cart:",
      error
    );

    return sendError(
      "Terjadi kesalahan pada server.",
      500
    );
  }
}
