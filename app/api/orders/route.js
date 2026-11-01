import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleFromUser } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authUser(admin, request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Tidak ada sesi login.", status: 401 };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return { error: "Sesi login tidak valid.", status: 401 };
  return { user: data.user };
}

async function buyerFor(admin, user, alamat = "") {
  const found = await admin
    .from("pembeli")
    .select("id_buyer,alamat_buyer")
    .eq("auth_user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (found.error) throw new Error(`Gagal membaca data pembeli: ${found.error.message}`);
  if (found.data) {
    if (alamat && alamat !== found.data.alamat_buyer) {
      await admin.from("pembeli").update({ alamat_buyer: alamat }).eq("id_buyer", found.data.id_buyer);
    }
    return { ...found.data, alamat_buyer: alamat || found.data.alamat_buyer };
  }

  const created = await admin
    .from("pembeli")
    .insert({
      auth_user_id: user.id,
      nama_buyer:
        user.user_metadata?.nama || user.user_metadata?.full_name || user.email || "Pembeli CIRCLO",
      email_buyer: user.email || `${user.id}@circlo.local`,
      password_buyer: crypto.randomUUID(),
      status_buyer: true,
      alamat_buyer: alamat,
    })
    .select("id_buyer,alamat_buyer")
    .single();

  if (created.error) throw new Error(`Gagal membuat data pembeli: ${created.error.message}`);
  return created.data;
}

async function sellerFor(admin, user, { create = false } = {}) {
  const found = await admin
    .from("penjual")
    .select("id_seller,nama_seller,email_seller,alamat_seller")
    .eq("auth_user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (found.error) throw new Error(`Gagal membaca data penjual: ${found.error.message}`);
  if (found.data) return found.data;
  if (!create) return null;

  const created = await admin
    .from("penjual")
    .insert({
      auth_user_id: user.id,
      nama_seller:
        user.user_metadata?.nama || user.user_metadata?.full_name || user.email || "Penjual CIRCLO",
      email_seller: user.email || `${user.id}@circlo.local`,
      password_seller: crypto.randomUUID(),
      status_seller: true,
      alamat_seller: "",
    })
    .select("id_seller,nama_seller,email_seller,alamat_seller")
    .single();

  if (created.error) throw new Error(`Gagal membuat data penjual: ${created.error.message}`);
  return created.data;
}

function isMissingColumn(error) {
  return (
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    /Could not find the '.*' column|column .* does not exist/i.test(error?.message || "")
  );
}

const MATERIAL_COLUMNS =
  "id_material,id_seller,nama_material,kategori,kota,provinsi,satuan,harga,stok,status_material";
const MATERIAL_EXTRA_COLUMNS = ",foto_url,kondisi_seller,kategori_ai,skor_ai";

async function materialsById(admin, ids) {
  if (!ids.length) return new Map();

  let result = await admin
    .from("material")
    .select(`${MATERIAL_COLUMNS}${MATERIAL_EXTRA_COLUMNS}`)
    .in("id_material", ids);

  if (result.error && isMissingColumn(result.error)) {
    result = await admin.from("material").select(MATERIAL_COLUMNS).in("id_material", ids);
  }
  if (result.error) throw new Error(result.error.message);

  return new Map((result.data || []).map((row) => [row.id_material, row]));
}

async function buyersById(admin, ids) {
  if (!ids.length) return new Map();
  const { data, error } = await admin
    .from("pembeli")
    .select("id_buyer,nama_buyer,email_buyer")
    .in("id_buyer", ids);
  if (error) throw new Error(`Gagal membaca data pembeli: ${error.message}`);
  return new Map((data || []).map((row) => [row.id_buyer, row]));
}

function statusKey(value) {
  const status = String(value || "").toLowerCase();
  if (/tolak|batal/.test(status)) return "rejected";
  if (/selesai|diterima/.test(status)) return "completed";
  if (/salur|kirim|siap/.test(status)) return "distributed";
  if (/proses/.test(status) || (/konfirmasi/.test(status) && !/menunggu/.test(status))) {
    return "confirmed";
  }
  return "pending";
}

function buildSummary(orders) {
  const completedOrders = orders.filter((order) => statusKey(order.status_pesanan) === "completed");
  const impactKg = completedOrders.reduce(
    (sum, order) =>
      sum +
      (order.items || [])
        .filter((item) => String(item.satuan || "").toLowerCase() === "kg")
        .reduce((itemSum, item) => itemSum + Number(item.kuantitas_pesan || 0), 0),
    0,
  );
  const completedUnits = completedOrders.reduce(
    (sum, order) =>
      sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.kuantitas_pesan || 0), 0),
    0,
  );

  return {
    pending: orders.filter((order) => statusKey(order.status_pesanan) === "pending").length,
    ready: orders.filter((order) => ["confirmed", "distributed"].includes(statusKey(order.status_pesanan)))
      .length,
    completed: completedOrders.length,
    impact_kg: Math.round(impactKg * 100) / 100,
    completed_units: Math.round(completedUnits * 100) / 100,
  };
}

async function impactRank(admin, sellerId) {
  try {
    const done = await admin
      .from("pesanan")
      .select("id_pesanan")
      .eq("status_pesanan", "Selesai")
      .limit(1000);
    if (done.error) return null;

    const orderIds = (done.data || []).map((row) => row.id_pesanan);
    if (!orderIds.length) return null;

    const details = await admin
      .from("detail_pesanan")
      .select("id_material,kuantitas_pesan")
      .in("id_pesanan", orderIds)
      .limit(5000);
    if (details.error || !details.data?.length) return null;

    const materialIds = [...new Set(details.data.map((row) => row.id_material))];
    const materials = await admin
      .from("material")
      .select("id_material,id_seller,satuan")
      .in("id_material", materialIds);
    if (materials.error) return null;

    const materialMap = new Map((materials.data || []).map((row) => [row.id_material, row]));
    const totals = new Map();

    for (const detail of details.data) {
      const material = materialMap.get(detail.id_material);
      if (!material || String(material.satuan || "").toLowerCase() !== "kg") continue;
      const current = totals.get(material.id_seller) || 0;
      totals.set(material.id_seller, current + Number(detail.kuantitas_pesan || 0));
    }

    if (!totals.size) return null;
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const index = sorted.findIndex(([id]) => id === sellerId);
    if (index < 0) return null;

    return {
      rank: index + 1,
      total_sellers: sorted.length,
      top_kg: Math.round(sorted[0][1] * 100) / 100,
    };
  } catch {
    return null;
  }
}

export async function POST(request) {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi di server." }, { status: 500 });
  }

  const auth = await authUser(admin, request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid." }, { status: 400 });
  }

  const idMaterial = Number(body.id_material);
  const kuantitas = Number(body.kuantitas);
  const metodeKirim = String(body.metode_kirim || "Ambil di tempat").trim();
  const alamat = String(body.alamat || "").trim();

  if (!Number.isInteger(idMaterial) || idMaterial <= 0) {
    return NextResponse.json({ error: "Material tidak valid." }, { status: 400 });
  }
  if (!Number.isFinite(kuantitas) || kuantitas <= 0) {
    return NextResponse.json({ error: "Jumlah pesanan harus lebih dari 0." }, { status: 400 });
  }
  if (!["Ambil di tempat", "Dikirim"].includes(metodeKirim)) {
    return NextResponse.json({ error: "Metode pengiriman tidak valid." }, { status: 400 });
  }
  if (metodeKirim === "Dikirim" && !alamat) {
    return NextResponse.json({ error: "Alamat pengiriman wajib diisi." }, { status: 400 });
  }

  const { data: material, error: materialError } = await admin
    .from("material")
    .select("id_material,id_seller,nama_material,harga,stok,satuan,status_material")
    .eq("id_material", idMaterial)
    .maybeSingle();

  if (materialError) {
    return NextResponse.json({ error: materialError.message }, { status: 500 });
  }
  if (!material || material.status_material === false) {
    return NextResponse.json({ error: "Material tidak ditemukan atau sudah tidak aktif." }, { status: 404 });
  }

  const stock = Number(material.stok || 0);
  const harga = Number(material.harga || 0);
  if (kuantitas > stock) {
    return NextResponse.json(
      { error: `Stok tersedia hanya ${stock} ${material.satuan || "unit"}.` },
      { status: 409 },
    );
  }

  let buyer;
  try {
    buyer = await buyerFor(admin, auth.user, alamat);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const total = Math.round(kuantitas * harga * 100) / 100;
  const now = new Date().toISOString();

  const orderInsert = await admin
    .from("pesanan")
    .insert({
      id_buyer: buyer.id_buyer,
      total_estimasi: total,
      metode_kirim: metodeKirim,
      status_pesanan: "Menunggu Konfirmasi",
      tgl_pesan: now,
    })
    .select("id_pesanan,total_estimasi,status_pesanan,tgl_pesan")
    .single();

  if (orderInsert.error) {
    return NextResponse.json({ error: `Gagal membuat pesanan: ${orderInsert.error.message}` }, { status: 500 });
  }
  const order = orderInsert.data;

  const detailInsert = await admin.from("detail_pesanan").insert({
    id_pesanan: order.id_pesanan,
    id_material: material.id_material,
    kuantitas_pesan: kuantitas,
    subtotal: total,
  });

  if (detailInsert.error) {
    await admin.from("pesanan").delete().eq("id_pesanan", order.id_pesanan);
    return NextResponse.json({ error: `Gagal menyimpan detail pesanan: ${detailInsert.error.message}` }, { status: 500 });
  }

  const stockUpdate = await admin
    .from("material")
    .update({ stok: stock - kuantitas })
    .eq("id_material", material.id_material)
    .eq("stok", material.stok)
    .select("id_material");

  if (stockUpdate.error || !stockUpdate.data?.length) {
    await admin.from("detail_pesanan").delete().eq("id_pesanan", order.id_pesanan);
    await admin.from("pesanan").delete().eq("id_pesanan", order.id_pesanan);
    return NextResponse.json(
      { error: "Stok berubah saat pesanan dibuat. Silakan muat ulang dan coba lagi." },
      { status: 409 },
    );
  }

  await admin.from("riwayat_pesanan").insert({
    id_pesanan: order.id_pesanan,
    status_update: "Menunggu Konfirmasi",
    waktu_update: now,
  });

  return NextResponse.json({
    ok: true,
    id_pesanan: order.id_pesanan,
    total_estimasi: total,
    status_pesanan: order.status_pesanan,
    tgl_pesan: order.tgl_pesan,
    material: {
      id_material: material.id_material,
      nama_material: material.nama_material,
      satuan: material.satuan,
      kuantitas,
    },
  });
}

async function sellerPayload(admin, seller, orders) {
  const summary = buildSummary(orders);
  summary.rank = await impactRank(admin, seller.id_seller);
  return { role: "seller", seller, summary, orders };
}

export async function GET(request) {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi di server." }, { status: 500 });
  }

  const auth = await authUser(admin, request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const scope = new URL(request.url).searchParams.get("scope");

  try {
    const buyer = await admin
      .from("pembeli")
      .select("id_buyer")
      .eq("auth_user_id", auth.user.id)
      .limit(1)
      .maybeSingle();
    if (buyer.error) throw new Error(buyer.error.message);

    const wantsSeller = scope === "seller";
    let orders = [];
    let role = "buyer";
    let seller = null;
    let ownIds = null;

    if (buyer.data && !wantsSeller) {
      const result = await admin
        .from("pesanan")
        .select("id_pesanan,id_buyer,total_estimasi,metode_kirim,status_pesanan,tgl_pesan")
        .eq("id_buyer", buyer.data.id_buyer)
        .order("tgl_pesan", { ascending: false })
        .limit(50);
      if (result.error) throw new Error(result.error.message);
      orders = result.data || [];
    } else {
      const canCreate = roleFromUser(auth.user) === "seller";
      seller = await sellerFor(admin, auth.user, { create: canCreate });
      if (!seller) {
        if (wantsSeller) {
          return NextResponse.json({ error: "Akun ini bukan akun penjual." }, { status: 403 });
        }
        return NextResponse.json({ role: "buyer", orders: [] });
      }

      role = "seller";
      const ownMaterials = await admin
        .from("material")
        .select("id_material")
        .eq("id_seller", seller.id_seller);
      if (ownMaterials.error) throw new Error(ownMaterials.error.message);

      const ids = (ownMaterials.data || []).map((row) => row.id_material);
      ownIds = new Set(ids);
      if (!ids.length) {
        return NextResponse.json(await sellerPayload(admin, seller, []));
      }

      const details = await admin
        .from("detail_pesanan")
        .select("id_pesanan")
        .in("id_material", ids);
      if (details.error) throw new Error(details.error.message);

      const orderIds = [...new Set((details.data || []).map((row) => row.id_pesanan))];
      if (!orderIds.length) {
        return NextResponse.json(await sellerPayload(admin, seller, []));
      }

      const result = await admin
        .from("pesanan")
        .select("id_pesanan,id_buyer,total_estimasi,metode_kirim,status_pesanan,tgl_pesan")
        .in("id_pesanan", orderIds)
        .order("tgl_pesan", { ascending: false })
        .limit(100);
      if (result.error) throw new Error(result.error.message);
      orders = result.data || [];
    }

    if (!orders.length) {
      if (role === "seller" && seller) {
        return NextResponse.json(await sellerPayload(admin, seller, []));
      }
      return NextResponse.json({ role, orders: [] });
    }

    const orderIds = orders.map((order) => order.id_pesanan);
    const { data: details, error: detailError } = await admin
      .from("detail_pesanan")
      .select("id_detail,id_pesanan,id_material,kuantitas_pesan,subtotal")
      .in("id_pesanan", orderIds);
    if (detailError) throw new Error(detailError.message);

    const visibleDetails = (details || []).filter((row) => !ownIds || ownIds.has(row.id_material));
    const materials = await materialsById(
      admin,
      [...new Set(visibleDetails.map((row) => row.id_material))],
    );
    const buyers = await buyersById(
      admin,
      [...new Set(orders.map((order) => order.id_buyer).filter(Boolean))],
    );

    const itemsByOrder = new Map();
    for (const detail of visibleDetails) {
      const material = materials.get(detail.id_material) || {};
      const items = itemsByOrder.get(detail.id_pesanan) || [];
      items.push({
        id_detail: detail.id_detail,
        id_material: detail.id_material,
        id_seller: material.id_seller ?? null,
        nama_material: material.nama_material || `Material #${detail.id_material}`,
        kategori: material.kategori || null,
        label: material.kategori_ai || material.kondisi_seller || material.kategori || null,
        kota: material.kota || null,
        provinsi: material.provinsi || null,
        satuan: material.satuan || "unit",
        harga: Number(detail.subtotal || 0) / (Number(detail.kuantitas_pesan) || 1),
        kuantitas_pesan: Number(detail.kuantitas_pesan || 0),
        subtotal: Number(detail.subtotal || 0),
        foto_url: material.foto_url || null,
        stok: Number(material.stok || 0),
        status_material: material.status_material !== false,
      });
      itemsByOrder.set(detail.id_pesanan, items);
    }

    const payloadOrders = orders.map((order) => {
      const items = itemsByOrder.get(order.id_pesanan) || [];
      return {
        ...order,
        total_estimasi: Number(order.total_estimasi || 0),
        seller_total: items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
        buyer: buyers.get(order.id_buyer) || null,
        items,
      };
    });

    if (role === "seller" && seller) {
      return NextResponse.json(await sellerPayload(admin, seller, payloadOrders));
    }

    return NextResponse.json({ role, orders: payloadOrders });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal membaca pesanan." }, { status: 500 });
  }
}
