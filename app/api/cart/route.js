
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
    const jumlah = Number(body.jumlah ?? body.kuantitas ?? 1);

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

export async function GET(request) {
  try {
    const admin = adminClient();

    const authorization =
      request.headers.get("authorization") || "";

    const token = authorization.replace(/^Bearer\s+/i, "");

    if (!token || token === authorization) {
      return NextResponse.json(
        { error: "Silakan login sebagai Buyer." },
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

    if (roleFromUser(authData.user) !== "buyer") {
      return NextResponse.json(
        { error: "Keranjang hanya tersedia untuk Buyer." },
        { status: 403 }
      );
    }

    const { data: buyer, error: buyerError } = await admin
      .from("pembeli")
      .select("id_buyer")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();

    if (buyerError) throw buyerError;

    if (!buyer) {
      return NextResponse.json(
        { error: "Profil Buyer belum ditemukan." },
        { status: 404 }
      );
    }

    // Ambil keranjang milik Buyer
    const { data: links, error: linkError } = await admin
      .from("keranjang_pembeli")
      .select("id_keranjang")
      .eq("id_buyer", buyer.id_buyer);

    if (linkError) throw linkError;

    const ids = (links || []).map((x) => x.id_keranjang);

    if (ids.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Ambil kuantitas
    const { data: carts, error: cartError } = await admin
      .from("keranjang")
      .select("id_keranjang, kuantitas")
      .in("id_keranjang", ids);

    if (cartError) throw cartError;

    // Ambil hubungan keranjang dan material
    const { data: items, error: itemError } = await admin
      .from("item")
      .select("id_keranjang, id_material")
      .in("id_keranjang", ids);

    if (itemError) throw itemError;

    const materialIds = [
      ...new Set((items || []).map((x) => x.id_material)),
    ];

    if (materialIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Ambil detail barang
    const { data: materials, error: materialError } = await admin
      .from("material")
      .select(
        "id_material, nama_material, kategori, harga, stok, satuan, lokasi, status_material"
      )
      .in("id_material", materialIds);

    if (materialError) throw materialError;

    const cartMap = new Map(
      (carts || []).map((x) => [x.id_keranjang, x])
    );

    const materialMap = new Map(
      (materials || []).map((x) => [x.id_material, x])
    );

    const result = (items || []).map((item) => {
      const cart = cartMap.get(item.id_keranjang);
      const material = materialMap.get(item.id_material);

      return {
        id_keranjang: item.id_keranjang,
        id_material: item.id_material,
        kuantitas: cart?.kuantitas || 1,
        ...material,
      };
    });

    return NextResponse.json(
      { items: result },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/cart:", error);

    return NextResponse.json(
      { error: "Gagal mengambil data keranjang." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const admin = adminClient();

    // Memeriksa token login
    const authorization =
      request.headers.get("authorization") || "";

    const token = authorization.replace(/^Bearer\s+/i, "");

    if (!token || token === authorization) {
      return NextResponse.json(
        { error: "Silakan login sebagai Buyer." },
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

    if (roleFromUser(authData.user) !== "buyer") {
      return NextResponse.json(
        { error: "Fitur keranjang hanya untuk Buyer." },
        { status: 403 }
      );
    }

    // Mengambil identitas Buyer
    const { data: buyer, error: buyerError } = await admin
      .from("pembeli")
      .select("id_buyer")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();

    if (buyerError) throw buyerError;

    if (!buyer) {
      return NextResponse.json(
        { error: "Profil Buyer tidak ditemukan." },
        { status: 404 }
      );
    }

    // Mengambil ID keranjang dan jumlah baru
    const body = await request.json();

    const idKeranjang = Number(body.id_keranjang);
    const jumlah = Number(body.jumlah);

    if (
      !Number.isSafeInteger(idKeranjang) ||
      idKeranjang <= 0 ||
      !Number.isSafeInteger(jumlah) ||
      jumlah < 1 ||
      jumlah > 10000
    ) {
      return NextResponse.json(
        { error: "ID keranjang atau jumlah tidak valid." },
        { status: 400 }
      );
    }

    // Memanggil fungsi SQL yang sudah dibuat
    const { data: result, error: updateError } =
      await admin.rpc("cart_update_quantity", {
        p_buyer_id: buyer.id_buyer,
        p_cart_id: idKeranjang,
        p_quantity: jumlah,
      });

    if (updateError) {
      console.error("Update cart:", updateError);

      return NextResponse.json(
        { error: "Gagal memperbarui jumlah material." },
        { status: 500 }
      );
    }

    if (!result?.success) {
      return NextResponse.json(
        {
          error:
            result?.error ||
            "Jumlah material tidak dapat diperbarui.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Jumlah material berhasil diperbarui.",
      id_keranjang: result.id_keranjang,
      jumlah: result.jumlah,
    });
  } catch (error) {
    console.error("PATCH /api/cart:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengubah jumlah." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const admin = adminClient();

    // 1. Validasi token login
    const authorization =
      request.headers.get("authorization") || "";

    const token = authorization.replace(/^Bearer\s+/i, "");

    if (!token || token === authorization) {
      return NextResponse.json(
        { error: "Silakan login sebagai Buyer terlebih dahulu." },
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

    // 2. Pastikan akun adalah Buyer
    if (roleFromUser(authData.user) !== "buyer") {
      return NextResponse.json(
        { error: "Hanya Buyer yang dapat menghapus keranjang." },
        { status: 403 }
      );
    }

    // 3. Ambil identitas Buyer dari database
    const { data: buyer, error: buyerError } = await admin
      .from("pembeli")
      .select("id_buyer")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();

    if (buyerError) {
      throw buyerError;
    }

    if (!buyer) {
      return NextResponse.json(
        { error: "Profil Buyer tidak ditemukan." },
        { status: 404 }
      );
    }

    // 4. Validasi ID keranjang
    const body = await request.json();
    const idKeranjang = Number(body.id_keranjang);

    if (
      !Number.isSafeInteger(idKeranjang) ||
      idKeranjang <= 0
    ) {
      return NextResponse.json(
        { error: "ID keranjang tidak valid." },
        { status: 400 }
      );
    }

    // 5. Hapus lewat fungsi SQL yang aman
    const { data: result, error: deleteError } =
      await admin.rpc("cart_delete_item", {
        p_buyer_id: buyer.id_buyer,
        p_cart_id: idKeranjang,
      });

    if (deleteError) {
      console.error("DELETE cart RPC:", deleteError);

      return NextResponse.json(
        { error: "Gagal menghapus material dari keranjang." },
        { status: 500 }
      );
    }

    if (!result?.success) {
      return NextResponse.json(
        {
          error:
            result?.error ||
            "Material tidak dapat dihapus dari keranjang.",
        },
        { status: 400 }
      );
    }

    // 6. Berhasil
    return NextResponse.json({
      success: true,
      message: "Material berhasil dihapus dari keranjang.",
      id_keranjang: result.id_keranjang,
    });
  } catch (error) {
    console.error("DELETE /api/cart:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus material." },
      { status: 500 }
    );
  }
}
