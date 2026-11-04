
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleFromUser } from "@/lib/roles";

export const dynamic = "force-dynamic";

function adminClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Konfigurasi Supabase belum lengkap.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request) {
  try {
    const admin = adminClient();

    // 1. Memeriksa token login
    const authorization =
      request.headers.get("authorization") || "";

    const token = authorization.replace(/^Bearer\s+/i, "");

    if (!token || token === authorization) {
      return NextResponse.json(
        { error: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const { data: authData, error: authError } =
      await admin.auth.getUser(token);

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "Sesi login tidak valid." },
        { status: 401 }
      );
    }

    const user = authData.user;

    // 2. Hanya Buyer yang boleh menambah keranjang
    if (roleFromUser(user) !== "buyer") {
      return NextResponse.json(
        { error: "Fitur keranjang hanya untuk Buyer." },
        { status: 403 }
      );
    }

    // 3. Mengambil data yang dikirim frontend
    const body = await request.json();

    const idMaterial = Number(body.id_material);
    const jumlah = Number(body.jumlah ?? 1);

    if (
      !Number.isSafeInteger(idMaterial) ||
      idMaterial <= 0 ||
      !Number.isSafeInteger(jumlah) ||
      jumlah <= 0 ||
      jumlah > 10000
    ) {
      return NextResponse.json(
        { error: "Material atau jumlah tidak valid." },
        { status: 400 }
      );
    }

    // 4. Mengambil identitas Buyer dari database
    const { data: buyer, error: buyerError } = await admin
      .from("pembeli")
      .select("id_buyer")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (buyerError) {
      throw buyerError;
    }

    if (!buyer) {
      return NextResponse.json(
        { error: "Profil Buyer belum ditemukan." },
        { status: 404 }
      );
    }

    // 5. Menambahkan material secara atomik.
    // Fungsi SQL cart_add_item dibuat pada langkah berikutnya.
    const { data: result, error: cartError } = await admin.rpc(
      "cart_add_item",
      {
        p_buyer_id: buyer.id_buyer,
        p_material_id: idMaterial,
        p_quantity: jumlah,
      }
    );

    if (cartError) {
      console.error("Cart RPC error:", cartError);

      return NextResponse.json(
        { error: "Gagal menambahkan material ke keranjang." },
        { status: 500 }
      );
    }

    if (!result?.success) {
      return NextResponse.json(
        {
          error:
            result?.error ||
            "Material tidak dapat ditambahkan ke keranjang.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Material berhasil ditambahkan ke keranjang.",
      id_keranjang: result.id_keranjang,
      jumlah: result.jumlah,
    });
  } catch (error) {
    console.error("POST /api/cart:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
