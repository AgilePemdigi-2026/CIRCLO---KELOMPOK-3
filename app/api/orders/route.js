
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleFromUser } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================

function adminClient() {
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

// ==========================================
// 2. AUTENTIKASI PENGGUNA
// ==========================================

async function authUser(admin, request) {
  const token = (
    request.headers.get("authorization") || ""
  ).replace(/^Bearer\s+/i, "");

  if (!token) {
    return {
      error: "Tidak ada sesi login.",
      status: 401,
    };
  }

  const { data, error } =
    await admin.auth.getUser(token);

  if (error || !data?.user) {
    return {
      error: "Sesi login tidak valid.",
      status: 401,
    };
  }

  return { user: data.user };
}

// ==========================================
// 3. PROFIL BUYER
// ==========================================

async function buyerFor(admin, user, alamat = "") {
  const found = await admin
    .from("pembeli")
    .select("id_buyer,alamat_buyer")
    .eq("auth_user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (found.error) {
    throw new Error(
      `Gagal membaca data pembeli: ${found.error.message}`
    );
  }

  if (found.data) {
    if (
      alamat &&
      alamat !== found.data.alamat_buyer
    ) {
      const { error: updateError } = await admin
        .from("pembeli")
        .update({
          alamat_buyer: alamat,
        })
        .eq("id_buyer", found.data.id_buyer);

      if (updateError) {
        throw new Error(
          `Gagal memperbarui alamat Buyer: ${updateError.message}`
        );
      }
    }

    return {
      ...found.data,
      alamat_buyer:
        alamat || found.data.alamat_buyer,
    };
  }

  const created = await admin
    .from("pembeli")
    .insert({
      auth_user_id: user.id,
      nama_buyer:
        user.user_metadata?.nama ||
        user.user_metadata?.full_name ||
        user.email ||
        "Pembeli CIRCLO",
      email_buyer:
        user.email || `${user.id}@circlo.local`,
      password_buyer: crypto.randomUUID(),
      status_buyer: true,
      alamat_buyer: alamat,
    })
    .select("id_buyer,alamat_buyer")
    .single();

  if (created.error) {
    throw new Error(
      `Gagal membuat data pembeli: ${created.error.message}`
    );
  }

  return created.data;
}

// ==========================================
// 4. PROFIL SELLER
// ==========================================

async function sellerFor(
  admin,
  user,
  { create = false } = {}
) {
  const found = await admin
    .from("penjual")
    .select(
      "id_seller,nama_seller,email_seller,alamat_seller"
    )
    .eq("auth_user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (found.error) {
    throw new Error(
      `Gagal membaca data penjual: ${found.error.message}`
    );
  }

  if (found.data) return found.data;

  if (!create) return null;

  const created = await admin
    .from("penjual")
    .insert({
      auth_user_id: user.id,
      nama_seller:
        user.user_metadata?.nama ||
        user.user_metadata?.full_name ||
        user.email ||
        "Penjual CIRCLO",
      email_seller:
        user.email || `${user.id}@circlo.local`,
      password_seller: crypto.randomUUID(),
      status_seller: true,
      alamat_seller: "",
    })
    .select(
      "id_seller,nama_seller,email_seller,alamat_seller"
    )
    .single();

  if (created.error) {
    throw new Error(
      `Gagal membuat data penjual: ${created.error.message}`
    );
  }

  return created.data;
}

// ==========================================
// 5. HELPER MATERIAL
// ==========================================

function isMissingColumn(error) {
  return (
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    /Could not find the '.*' column|column .* does not exist/i.test(
      error?.message || ""
    )
  );
}

const MATERIAL_COLUMNS =
  "id_material,id_seller,nama_material,kategori,kota,provinsi,satuan,harga,stok,status_material";

const MATERIAL_EXTRA_COLUMNS =
  ",foto_url,kondisi_seller,kategori_ai,skor_ai";

async function materialsById(admin, ids) {
  if (!ids.length) return new Map();

  let result = await admin
    .from("material")
    .select(
      `${MATERIAL_COLUMNS}${MATERIAL_EXTRA_COLUMNS}`
    )
    .in("id_material", ids);

  if (
    result.error &&
    isMissingColumn(result.error)
  ) {
    result = await admin
      .from("material")
      .select(MATERIAL_COLUMNS)
      .in("id_material", ids);
  }

  if (result.error) {
    throw new Error(result.error.message);
  }

  return new Map(
    (result.data || []).map((row) => [
      row.id_material,
      row,
    ])
  );
}

async function buyersById(admin, ids) {
  if (!ids.length) return new Map();

  const { data, error } = await admin
    .from("pembeli")
    .select(
      "id_buyer,nama_buyer,email_buyer"
    )
    .in("id_buyer", ids);

  if (error) {
    throw new Error(
      `Gagal membaca data pembeli: ${error.message}`
    );
  }

  return new Map(
    (data || []).map((row) => [
      row.id_buyer,
      row,
    ])
  );
}

// ==========================================
// 6. HELPER STATUS PESANAN
// ==========================================

function statusKey(value) {
  const status = String(
    value || ""
  ).toLowerCase();

  if (/tolak|batal/.test(status)) {
    return "rejected";
  }

  if (/selesai|diterima/.test(status)) {
    return "completed";
  }

  if (/salur|kirim|siap/.test(status)) {
    return "distributed";
  }

  if (
    /proses/.test(status) ||
    (
      /konfirmasi/.test(status) &&
      !/menunggu/.test(status)
    )
  ) {
    return "confirmed";
  }

  return "pending";
}

// ==========================================
// 7. RINGKASAN PESANAN
// ==========================================

function buildSummary(orders) {
  const completedOrders = orders.filter(
    (order) =>
      statusKey(order.status_pesanan) ===
      "completed"
  );

  const impactKg = completedOrders.reduce(
    (sum, order) =>
      sum +
      (order.items || [])
        .filter(
          (item) =>
            String(
              item.satuan || ""
            ).toLowerCase() === "kg"
        )
        .reduce(
          (itemSum, item) =>
            itemSum +
            Number(
              item.kuantitas_pesan || 0
            ),
          0
        ),
    0
  );

<<<<<<< Updated upstream
  const completedUnits =
    completedOrders.reduce(
      (sum, order) =>
        sum +
        (order.items || []).reduce(
          (itemSum, item) =>
            itemSum +
            Number(
              item.kuantitas_pesan || 0
            ),
          0
        ),
      0
    );
=======
  const materialDialihkanKg = Math.round(impactKg * 100) / 100;
>>>>>>> Stashed changes

  return {
    pending: orders.filter(
      (order) =>
        statusKey(
          order.status_pesanan
        ) === "pending"
    ).length,

    ready: orders.filter(
      (order) =>
        ["confirmed", "distributed"].includes(
          statusKey(
            order.status_pesanan
          )
        )
    ).length,

    completed: completedOrders.length,
<<<<<<< Updated upstream

    impact_kg:
      Math.round(impactKg * 100) / 100,

    completed_units:
      Math.round(completedUnits * 100) /
      100,
=======
    // Nama lama dipertahankan agar klien lama tetap berjalan. Nilainya adalah
    // volume material (kg) dari pesanan selesai, bukan klaim dampak lingkungan.
    impact_kg: materialDialihkanKg,
    material_dialihkan_kg: materialDialihkanKg,
    completed_units: Math.round(completedUnits * 100) / 100,
>>>>>>> Stashed changes
  };
}

// ==========================================
// 8. PERINGKAT DAMPAK SELLER
// ==========================================

async function impactRank(admin, sellerId) {
  try {
    const done = await admin
      .from("pesanan")
      .select("id_pesanan")
      .eq("status_pesanan", "Selesai")
      .limit(1000);

    if (done.error) return null;

    const orderIds = (
      done.data || []
    ).map(
      (row) => row.id_pesanan
    );

    if (!orderIds.length) return null;

    const details = await admin
      .from("detail_pesanan")
      .select(
        "id_material,kuantitas_pesan"
      )
      .in("id_pesanan", orderIds)
      .limit(5000);

    if (
      details.error ||
      !details.data?.length
    ) {
      return null;
    }

    const materialIds = [
      ...new Set(
        details.data.map(
          (row) => row.id_material
        )
      ),
    ];

    const materials = await admin
      .from("material")
      .select(
        "id_material,id_seller,satuan"
      )
      .in("id_material", materialIds);

    if (materials.error) return null;

    const materialMap = new Map(
      (materials.data || []).map(
        (row) => [
          row.id_material,
          row,
        ]
      )
    );

    const totals = new Map();

    for (const detail of details.data) {
      const material = materialMap.get(
        detail.id_material
      );

      if (
        !material ||
        String(
          material.satuan || ""
        ).toLowerCase() !== "kg"
      ) {
        continue;
      }

      const current =
        totals.get(
          material.id_seller
        ) || 0;

      totals.set(
        material.id_seller,
        current +
          Number(
            detail.kuantitas_pesan || 0
          )
      );
    }

    if (!totals.size) return null;

    const sorted = [
      ...totals.entries(),
    ].sort(
      (a, b) => b[1] - a[1]
    );

    const index = sorted.findIndex(
      ([id]) => id === sellerId
    );

    if (index < 0) return null;

    return {
      rank: index + 1,
      total_sellers: sorted.length,
      top_kg:
        Math.round(
          sorted[0][1] * 100
        ) / 100,
    };
  } catch {
    return null;
  }
}

// ==========================================
// 9. POST - ATOMIC CHECKOUT BUYER
// ==========================================

export async function POST(request) {
  const admin = adminClient();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Supabase belum dikonfigurasi di server.",
      },
      { status: 500 }
    );
  }

  // 9.1 Memeriksa login
  const auth = await authUser(
    admin,
    request
  );

  if (auth.error) {
    return NextResponse.json(
      {
        error: auth.error,
      },
      { status: auth.status }
    );
  }

  // 9.2 Hanya Buyer yang dapat Checkout
  if (
    roleFromUser(auth.user) !== "buyer"
  ) {
    return NextResponse.json(
      {
        error:
          "Hanya Buyer yang dapat membuat pesanan.",
      },
      { status: 403 }
    );
  }

  // 9.3 Membaca request
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Request tidak valid.",
      },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      {
        error: "Data pesanan tidak valid.",
      },
      { status: 400 }
    );
  }

  // 9.4 Mengambil data Checkout
  const idMaterial = Number(
    body.id_material
  );

  const kuantitas = Number(
    body.kuantitas
  );

  const metodeKirim = String(
    body.metode_kirim ||
      "Ambil di tempat"
  ).trim();

  const alamat = String(
    body.alamat || ""
  ).trim();

  const checkoutRequestId =
    body.checkout_request_id == null
      ? null
      : String(
          body.checkout_request_id
        ).trim();

  // 9.5 Validasi UUID Checkout
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (
    !checkoutRequestId ||
    !uuidRegex.test(
      checkoutRequestId
    )
  ) {
    return NextResponse.json(
      {
        error:
          "ID Checkout wajib diisi dan harus berupa UUID valid.",
      },
      { status: 400 }
    );
  }

  // 9.6 Validasi material
  if (
    !Number.isSafeInteger(
      idMaterial
    ) ||
    idMaterial <= 0 ||
    idMaterial > 2147483647
  ) {
    return NextResponse.json(
      {
        error: "Material tidak valid.",
      },
      { status: 400 }
    );
  }

  // 9.7 Validasi jumlah
  if (
    !Number.isSafeInteger(
      kuantitas
    ) ||
    kuantitas <= 0 ||
    kuantitas > 2147483647
  ) {
    return NextResponse.json(
      {
        error:
          "Jumlah pesanan harus berupa bilangan bulat positif.",
      },
      { status: 400 }
    );
  }

  // 9.8 Validasi metode pengiriman
  if (
    ![
      "Ambil di tempat",
      "Dikirim",
    ].includes(metodeKirim)
  ) {
    return NextResponse.json(
      {
        error:
          "Metode pengiriman tidak valid.",
      },
      { status: 400 }
    );
  }

  if (
    metodeKirim === "Dikirim" &&
    !alamat
  ) {
    return NextResponse.json(
      {
        error:
          "Alamat pengiriman wajib diisi.",
      },
      { status: 400 }
    );
  }

  // 9.9 Mencari profil Buyer
  let buyer;

  try {
    buyer = await buyerFor(
      admin,
      auth.user,
      alamat
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err.message ||
          "Gagal membaca profil Buyer.",
      },
      { status: 500 }
    );
  }

  // 9.10 MEMANGGIL ATOMIC CHECKOUT
  // Proses database:
  // - cek ID Checkout
  // - validasi stok
  // - buat pesanan
  // - simpan detail
  // - kurangi stok
  // - catat riwayat
  //
  // Semuanya dilakukan dalam
  // satu transaksi PostgreSQL.

  
  // Memanggil Atomic Checkout versi baru
  // dengan alamat pengiriman per pesanan.
  const {
    data: hasilCheckout,
    error: checkoutError,
  } = await admin.rpc(
    "create_single_checkout_order",
    {
      p_buyer_id: buyer.id_buyer,
      p_material_id: idMaterial,
      p_quantity: kuantitas,
      p_shipping_method: metodeKirim,
      p_checkout_request_id: checkoutRequestId,
      p_shipping_address: alamat,
    }
  );


  // 9.11 Menangani error Atomic Checkout
  if (checkoutError) {
    console.error(
      "Atomic Checkout CIRCLO gagal:",
      checkoutError.message
    );

    // Pesanan lama yang sudah tidak aktif
    // harus dikenali frontend agar ID lokal
    // dapat dibersihkan dengan aman.
    if (
      /Checkout sudah tidak aktif/i.test(
        checkoutError.message || ""
      )
    ) {
      const {
        data: oldOrder,
        error: oldError,
      } = await admin
        .from("pesanan")
        .select(
          "id_pesanan,id_buyer,status_pesanan"
        )
        .eq(
          "checkout_request_id",
          checkoutRequestId
        )
        .maybeSingle();

      if (
        !oldError &&
        oldOrder &&
        oldOrder.id_buyer ===
          buyer.id_buyer
      ) {
        return NextResponse.json(
          {
            error:
              "Checkout ini sudah tidak aktif. Periksa Pesanan Saya.",
            id_pesanan:
              oldOrder.id_pesanan,
            status_pesanan:
              oldOrder.status_pesanan,
          },
          { status: 409 }
        );
      }
    }

    const knownErrors = [
      "Material tidak ditemukan.",
      "Material tidak aktif.",
      "Stok material tidak mencukupi.",
      "Harga material tidak valid.",
      "Total pembayaran harus berupa rupiah bulat.",
      "Checkout sudah tidak aktif.",
      "Detail Checkout berbeda",
      "ID Checkout digunakan Buyer lain.",
      "Data Checkout tidak valid.",
      "Metode pengiriman tidak valid.",
    ];

    const knownError =
      knownErrors.find(
        (message) =>
          String(
            checkoutError.message || ""
          ).includes(message)
      );

    return NextResponse.json(
      {
        error:
          knownError ||
          "Checkout gagal diproses. Periksa Pesanan Saya sebelum mencoba kembali.",
      },
      {
        status: knownError ? 409 : 500,
      }
    );
  }

  // 9.12 Validasi hasil RPC
  const idPesanan = Number(
    hasilCheckout?.id_pesanan
  );

  if (
    !hasilCheckout?.ok ||
    !Number.isSafeInteger(
      idPesanan
    ) ||
    idPesanan <= 0
  ) {
    return NextResponse.json(
      {
        error:
          "Hasil Checkout tidak valid. Periksa Pesanan Saya sebelum mencoba kembali.",
      },
      { status: 500 }
    );
  }

  // 9.13 Mengirim hasil Checkout
  return NextResponse.json({
    ...hasilCheckout,
    id_pesanan: idPesanan,
  });
}

// ==========================================
// 10. PAYLOAD SELLER
// ==========================================

async function sellerPayload(
  admin,
  seller,
  orders
) {
  const summary = buildSummary(
    orders
  );

  summary.rank = await impactRank(
    admin,
    seller.id_seller
  );

  return {
    role: "seller",
    seller,
    summary,
    orders,
  };
}

// ==========================================
// 11. GET - DATA PESANAN BUYER & SELLER
// ==========================================

export async function GET(request) {
  const admin = adminClient();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Supabase belum dikonfigurasi di server.",
      },
      { status: 500 }
    );
  }

  const auth = await authUser(
    admin,
    request
  );

  if (auth.error) {
    return NextResponse.json(
      {
        error: auth.error,
      },
      { status: auth.status }
    );
  }

  const scope = new URL(
    request.url
  ).searchParams.get("scope");

  try {
    // 11.1 Cari akun Buyer
    const buyer = await admin
      .from("pembeli")
      .select("id_buyer")
      .eq(
        "auth_user_id",
        auth.user.id
      )
      .limit(1)
      .maybeSingle();

    if (buyer.error) {
      throw new Error(
        buyer.error.message
      );
    }

    const wantsSeller =
      scope === "seller";

    let orders = [];
    let role = "buyer";
    let seller = null;
    let ownIds = null;

    // 11.2 Ambil pesanan Buyer
    if (
      buyer.data &&
      !wantsSeller
    ) {
      const result = await admin
        .from("pesanan")
        .select(
          "id_pesanan,id_buyer,total_estimasi,metode_kirim,status_pesanan,tgl_pesan"
        )
        .eq(
          "id_buyer",
          buyer.data.id_buyer
        )
        .order(
          "tgl_pesan",
          {
            ascending: false,
          }
        )
        .limit(50);

      if (result.error) {
        throw new Error(
          result.error.message
        );
      }

      orders = result.data || [];
    } else {
      // 11.3 Ambil pesanan Seller
      const canCreate =
        roleFromUser(
          auth.user
        ) === "seller";

      seller = await sellerFor(
        admin,
        auth.user,
        {
          create: canCreate,
        }
      );

      if (!seller) {
        if (wantsSeller) {
          return NextResponse.json(
            {
              error:
                "Akun ini bukan akun penjual.",
            },
            { status: 403 }
          );
        }

        return NextResponse.json({
          role: "buyer",
          orders: [],
        });
      }

      role = "seller";

      const ownMaterials = await admin
        .from("material")
        .select("id_material")
        .eq(
          "id_seller",
          seller.id_seller
        );

      if (ownMaterials.error) {
        throw new Error(
          ownMaterials.error.message
        );
      }

      const ids = (
        ownMaterials.data || []
      ).map(
        (row) => row.id_material
      );

      ownIds = new Set(ids);

      if (!ids.length) {
        return NextResponse.json(
          await sellerPayload(
            admin,
            seller,
            []
          )
        );
      }

      const details = await admin
        .from("detail_pesanan")
        .select("id_pesanan")
        .in(
          "id_material",
          ids
        );

      if (details.error) {
        throw new Error(
          details.error.message
        );
      }

      const orderIds = [
        ...new Set(
          (
            details.data || []
          ).map(
            (row) =>
              row.id_pesanan
          )
        ),
      ];

      if (!orderIds.length) {
        return NextResponse.json(
          await sellerPayload(
            admin,
            seller,
            []
          )
        );
      }

      const result = await admin
        .from("pesanan")
        .select(
          "id_pesanan,id_buyer,total_estimasi,metode_kirim,status_pesanan,tgl_pesan"
        )
        .in(
          "id_pesanan",
          orderIds
        )
        .order(
          "tgl_pesan",
          {
            ascending: false,
          }
        )
        .limit(100);

      if (result.error) {
        throw new Error(
          result.error.message
        );
      }

      orders = result.data || [];
    }

    // 11.4 Jika tidak ada pesanan
    if (!orders.length) {
      if (
        role === "seller" &&
        seller
      ) {
        return NextResponse.json(
          await sellerPayload(
            admin,
            seller,
            []
          )
        );
      }

      return NextResponse.json({
        role,
        orders: [],
      });
    }

    // 11.5 Ambil detail pesanan
    const orderIds = orders.map(
      (order) =>
        order.id_pesanan
    );

    const {
      data: details,
      error: detailError,
    } = await admin
      .from("detail_pesanan")
      .select(
        "id_detail,id_pesanan,id_material,kuantitas_pesan,subtotal"
      )
      .in(
        "id_pesanan",
        orderIds
      );

    if (detailError) {
      throw new Error(
        detailError.message
      );
    }

    const visibleDetails = (
      details || []
    ).filter(
      (row) =>
        !ownIds ||
        ownIds.has(
          row.id_material
        )
    );

    // 11.6 Baca data material
    const materials =
      await materialsById(
        admin,
        [
          ...new Set(
            visibleDetails.map(
              (row) =>
                row.id_material
            )
          ),
        ]
      );

    // 11.7 Baca data Buyer
    const buyers =
      await buyersById(
        admin,
        [
          ...new Set(
            orders
              .map(
                (order) =>
                  order.id_buyer
              )
              .filter(Boolean)
          ),
        ]
      );

    // 11.8 Gabungkan detail dan material
    const itemsByOrder = new Map();

    for (
      const detail of visibleDetails
    ) {
      const material =
        materials.get(
          detail.id_material
        ) || {};

      const items =
        itemsByOrder.get(
          detail.id_pesanan
        ) || [];

      items.push({
        id_detail:
          detail.id_detail,
        id_material:
          detail.id_material,
        id_seller:
          material.id_seller ?? null,
        nama_material:
          material.nama_material ||
          `Material #${detail.id_material}`,
        kategori:
          material.kategori || null,
        label:
          material.kategori_ai ||
          material.kondisi_seller ||
          material.kategori ||
          null,
        kota:
          material.kota || null,
        provinsi:
          material.provinsi || null,
        satuan:
          material.satuan || "unit",
        harga:
          Number(
            detail.subtotal || 0
          ) /
          (
            Number(
              detail.kuantitas_pesan
            ) || 1
          ),
        kuantitas_pesan:
          Number(
            detail.kuantitas_pesan || 0
          ),
        subtotal:
          Number(
            detail.subtotal || 0
          ),
        foto_url:
          material.foto_url || null,
        stok:
          Number(
            material.stok || 0
          ),
        status_material:
          material.status_material !==
          false,
      });

      itemsByOrder.set(
        detail.id_pesanan,
        items
      );
    }

    // 11.9 Susun hasil API
    const payloadOrders =
      orders.map(
        (order) => {
          const items =
            itemsByOrder.get(
              order.id_pesanan
            ) || [];

          return {
            ...order,
            total_estimasi:
              Number(
                order.total_estimasi ||
                  0
              ),
            seller_total:
              items.reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item.subtotal ||
                      0
                  ),
                0
              ),
            buyer:
              buyers.get(
                order.id_buyer
              ) || null,
            items,
          };
        }
      );

    // 11.10 Respons Seller
    if (
      role === "seller" &&
      seller
    ) {
      return NextResponse.json(
        await sellerPayload(
          admin,
          seller,
          payloadOrders
        )
      );
    }

    // 11.11 Respons Buyer
    return NextResponse.json({
      role,
      orders: payloadOrders,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err.message ||
          "Gagal membaca pesanan.",
      },
      { status: 500 }
    );
  }
}
