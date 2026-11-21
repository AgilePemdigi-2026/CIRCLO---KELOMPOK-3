import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function sellerFor(admin, user) {
  const found = await admin
    .from("penjual")
    .select("id_seller")
    .eq("auth_user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (found.error) throw new Error(`Gagal membaca data penjual: ${found.error.message}`);
  return found.data || null;
}

async function ownedOrder(admin, idPesanan, sellerId) {
  const details = await admin
    .from("detail_pesanan")
    .select("id_detail,id_material,kuantitas_pesan")
    .eq("id_pesanan", idPesanan);
  if (details.error) throw new Error(details.error.message);

  const rows = details.data || [];
  if (!rows.length) return { details: [], materials: [], owned: [] };

  const materialIds = [...new Set(rows.map((row) => row.id_material))];
  const materials = await admin
    .from("material")
    .select("id_material,id_seller,stok")
    .in("id_material", materialIds);
  if (materials.error) throw new Error(materials.error.message);

  const owned = (materials.data || []).filter((row) => row.id_seller === sellerId);
  return { details: rows, materials: materials.data || [], owned };
}

function transitionFor(action, current, order) {
  if (action === "confirm") {
    if (current !== "pending") return { error: "Pesanan ini tidak lagi menunggu konfirmasi." };
    return { to: "Dikonfirmasi", history: "Dikonfirmasi" };
  }

  if (action === "reject") {
    if (current !== "pending") return { error: "Pesanan ini tidak lagi menunggu konfirmasi." };
    return { to: "Ditolak", history: "Ditolak penjual", restoreStock: true };
  }

  if (action === "ship") {
    if (current !== "confirmed") return { error: "Pesanan harus dikonfirmasi terlebih dahulu." };
    if (order.metode_kirim !== "Dikirim") {
      return { error: "Aksi ini hanya untuk pesanan dengan metode Dikirim." };
    }
    return { to: "Disalurkan", history: "Disalurkan" };
  }

  if (action === "complete") {
    if (current === "distributed") return { to: "Selesai", history: "Selesai" };
    if (current === "confirmed" && order.metode_kirim === "Ambil di tempat") {
      return { to: "Selesai", history: "Selesai" };
    }
    if (current === "confirmed" && order.metode_kirim === "Dikirim") {
      return { error: "Tandai pesanan sudah dikirim sebelum menyelesaikannya." };
    }
    return { error: "Status pesanan tidak dapat diselesaikan dari tahap ini." };
  }

  return { error: "Aksi pesanan tidak dikenal." };
}

export async function PATCH(request, { params }) {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi di server." }, { status: 500 });
  }

  const auth = await authUser(admin, request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const idPesanan = Number(params?.id);
  if (!Number.isInteger(idPesanan) || idPesanan <= 0) {
    return NextResponse.json({ error: "ID pesanan tidak valid." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid." }, { status: 400 });
  }

  const action = String(body.action || "").trim();
  const expectedStatus = body.expected_status ? String(body.expected_status) : null;

  try {
    const seller = await sellerFor(admin, auth.user);
    if (!seller) {
      return NextResponse.json({ error: "Akun ini bukan akun penjual." }, { status: 403 });
    }

    const orderResult = await admin
      .from("pesanan")
      .select("id_pesanan,id_buyer,status_pesanan,metode_kirim")
      .eq("id_pesanan", idPesanan)
      .maybeSingle();
    if (orderResult.error) throw new Error(orderResult.error.message);

    const order = orderResult.data;
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const ownership = await ownedOrder(admin, idPesanan, seller.id_seller);
    if (!ownership.owned.length) {
      return NextResponse.json(
        { error: "Pesanan ini tidak memuat material milik Anda." },
        { status: 403 },
      );
    }
    if (ownership.owned.length !== ownership.materials.length) {
      return NextResponse.json(
        { error: "Pesanan ini memuat material dari penjual lain dan belum dapat diubah dari dashboard ini." },
        { status: 409 },
      );
    }

    if (expectedStatus && expectedStatus !== order.status_pesanan) {
      return NextResponse.json(
        { error: "Status pesanan sudah berubah. Muat ulang data pesanan." },
        { status: 409 },
      );
    }


    // VALIDASI PEMBAYARAN MIDTRANS
    // Pesanan yang masih menunggu pembayaran
    // tidak boleh diproses Seller.
    if (order.status_pesanan === "Menunggu Pembayaran") {
      return NextResponse.json(
        {
          error: "Pesanan masih menunggu pembayaran Buyer.",
        },
        { status: 409 }
      );
    }

    const { data: pembayaran, error: pembayaranError } =
      await admin
        .from("pembayaran_midtrans")
        .select("status_pembayaran")
        .eq("id_pesanan", idPesanan)
        .maybeSingle();

    if (pembayaranError) {
      throw new Error(
        "Gagal memeriksa status pembayaran pesanan."
      );
    }

    if (pembayaran) {
      const statusBayar = String(
        pembayaran.status_pembayaran || ""
      ).toLowerCase();

      if (!["settlement", "capture"].includes(statusBayar)) {
        return NextResponse.json(
          {
            error: "Pembayaran belum berhasil diverifikasi oleh Midtrans.",
          },
          { status: 409 }
        );
      }

      // Penolakan setelah pembayaran berhasil
      // memerlukan mekanisme refund terlebih dahulu.
      if (action === "reject") {
        return NextResponse.json(
          {
            error: "Pesanan sudah dibayar. Proses refund harus ditangani sebelum pesanan dapat ditolak.",
          },
          { status: 409 }
        );
      }
    }

    const transition = transitionFor(action, statusKey(order.status_pesanan), order);
    if (transition.error) {
      return NextResponse.json({ error: transition.error }, { status: 409 });
    }

    const updated = await admin
      .from("pesanan")
      .update({ status_pesanan: transition.to })
      .eq("id_pesanan", idPesanan)
      .eq("status_pesanan", order.status_pesanan)
      .select("id_pesanan,status_pesanan")
      .maybeSingle();

    if (updated.error) throw new Error(updated.error.message);
    if (!updated.data) {
      return NextResponse.json(
        { error: "Status pesanan sudah berubah. Muat ulang data pesanan." },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const history = await admin.from("riwayat_pesanan").insert({
      id_pesanan: idPesanan,
      status_update: transition.history,
      waktu_update: now,
    });

    if (transition.restoreStock) {
      const ownedIds = new Set(ownership.owned.map((row) => row.id_material));
      for (const detail of ownership.details) {
        if (!ownedIds.has(detail.id_material)) continue;

        const latest = await admin
          .from("material")
          .select("stok")
          .eq("id_material", detail.id_material)
          .maybeSingle();
        if (latest.error || !latest.data) continue;

        await admin
          .from("material")
          .update({ stok: Number(latest.data.stok || 0) + Number(detail.kuantitas_pesan || 0) })
          .eq("id_material", detail.id_material);
      }
    }

    return NextResponse.json({
      ok: true,
      id_pesanan: idPesanan,
      status_pesanan: updated.data.status_pesanan,
      history_saved: !history.error,
      ...(history.error ? { warning: "Status tersimpan, tetapi riwayat status gagal dicatat." } : {}),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal memperbarui pesanan." }, { status: 500 });
  }
}

// Skor AI (0-100) dibuat menjadi huruf nilai untuk lencana kecil di foto material.
function gradeFromScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= 90) return "A+";
  if (value >= 80) return "A";
  if (value >= 70) return "B+";
  if (value >= 60) return "B";
  return "C";
}

// GET /api/orders/:id
// Detail satu pesanan milik buyer yang sedang login (SRS 4.12 Melihat Status Pesanan):
// status terbaru, riwayat status, material yang dipesan, ringkasan biaya, penjual, dan lokasi penjemputan.
export async function GET(request, { params }) {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi di server." }, { status: 500 });
  }

  const auth = await authUser(admin, request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const idPesanan = Number(params?.id);
  if (!Number.isInteger(idPesanan) || idPesanan <= 0) {
    return NextResponse.json({ error: "ID pesanan tidak valid." }, { status: 400 });
  }

  try {
    const buyer = await admin
      .from("pembeli")
      .select("id_buyer")
      .eq("auth_user_id", auth.user.id)
      .limit(1)
      .maybeSingle();
    if (buyer.error) throw new Error(buyer.error.message);
    if (!buyer.data) {
      return NextResponse.json({ error: "Akun ini bukan akun pembeli." }, { status: 403 });
    }

    // Filter id_buyer di query yang sama: pesanan milik buyer lain dianggap tidak ada.
    const orderResult = await admin
      .from("pesanan")
      .select("*")
      .eq("id_pesanan", idPesanan)
      .eq("id_buyer", buyer.data.id_buyer)
      .maybeSingle();
    if (orderResult.error) throw new Error(orderResult.error.message);
    const order = orderResult.data;
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const { data: details, error: detailError } = await admin
      .from("detail_pesanan")
      .select("id_detail,id_pesanan,id_material,kuantitas_pesan,subtotal")
      .eq("id_pesanan", idPesanan)
      .order("id_detail", { ascending: true });
    if (detailError) throw new Error(detailError.message);

    const materialIds = [...new Set((details || []).map((row) => row.id_material))];
    let materials = new Map();
    if (materialIds.length) {
      const { data } = await admin.from("material").select("*").in("id_material", materialIds);
      materials = new Map((data || []).map((row) => [row.id_material, row]));
    }

    const items = (details || []).map((detail) => {
      const material = materials.get(detail.id_material) || {};
      const kuantitas = Number(detail.kuantitas_pesan || 0);
      const subtotal = Number(detail.subtotal || 0);
      return {
        id_detail: detail.id_detail,
        id_material: detail.id_material,
        nama_material: material.nama_material || `Material #${detail.id_material}`,
        kategori: material.kategori || null,
        label: material.kategori_ai || material.kondisi_seller || material.kategori || null,
        grade: gradeFromScore(material.skor_ai ?? material.skor),
        foto_url: material.foto_url || material.image_url || null,
        kota: material.kota || null,
        provinsi: material.provinsi || null,
        satuan: material.satuan || "unit",
        harga: kuantitas ? subtotal / kuantitas : Number(material.harga || 0),
        kuantitas_pesan: kuantitas,
        subtotal,
      };
    });

    // Penjual diambil dari material pertama di pesanan (satu pesanan satu material pada alur saat ini).
    const firstMaterial = materials.get(details?.[0]?.id_material) || null;
    let seller = null;
    if (firstMaterial?.id_seller) {
      const sellerResult = await admin
        .from("penjual")
        .select("*")
        .eq("id_seller", firstMaterial.id_seller)
        .maybeSingle();
      const row = sellerResult.data;
      if (row) {
        const rating = Number(row.rating_seller ?? row.rating);
        seller = {
          id_seller: row.id_seller,
          nama: row.nama_seller || `Penjual #${row.id_seller}`,
          alamat: row.alamat_seller || null,
          terverifikasi: row.status_seller === true,
          rating: Number.isFinite(rating) && rating > 0 ? rating : null,
        };
      }
    }

    const riwayatResult = await admin
      .from("riwayat_pesanan")
      .select("*")
      .eq("id_pesanan", idPesanan)
      .order("waktu_update", { ascending: true });
    const riwayat = (riwayatResult.data || []).map((row) => ({
      id: row.id_riwayat ?? row.id ?? `${row.id_pesanan}-${row.waktu_update}`,
      status_update: row.status_update,
      waktu_update: row.waktu_update,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    // Biaya layanan belum punya kolom di skema pesanan. Dibaca bila nanti ditambahkan, selain itu Rp0.
    const biayaLayanan = Number(order.biaya_layanan ?? 0) || 0;

    return NextResponse.json({
      order: {
        id_pesanan: order.id_pesanan,
        tgl_pesan: order.tgl_pesan,
        status_pesanan: order.status_pesanan || "Menunggu Konfirmasi",
        metode_kirim: order.metode_kirim || "Ambil di tempat",
      },
      items,
      seller,
      lokasi: {
        nama: seller?.nama || null,
        alamat: seller?.alamat || null,
        kota: firstMaterial?.kota || null,
        provinsi: firstMaterial?.provinsi || null,
      },
      ringkasan: {
        subtotal,
        biaya_layanan: biayaLayanan,
        total: subtotal + biayaLayanan,
      },
      riwayat,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal membaca detail pesanan." }, { status: 500 });
  }
}
