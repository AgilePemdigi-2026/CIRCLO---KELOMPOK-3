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

// GET /api/orders/:id
// Detail satu pesanan milik buyer yang sedang login: item, alamat, pembayaran, riwayat status, dan ringkasan biaya.
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
      .select("id_buyer,nama_buyer,alamat_buyer")
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
      const { data } = await admin
        .from("material")
        .select("id_material,nama_material,kategori,kota,provinsi,satuan,harga")
        .in("id_material", materialIds);
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
        kota: material.kota || null,
        provinsi: material.provinsi || null,
        satuan: material.satuan || "unit",
        harga: kuantitas ? subtotal / kuantitas : Number(material.harga || 0),
        kuantitas_pesan: kuantitas,
        subtotal,
      };
    });

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
    const dikirim = order.metode_kirim === "Dikirim";
    // Kolom pembayaran dan ongkir belum ada di skema pesanan; dibaca bila nanti ditambahkan.
    const ongkir = order.ongkir ?? order.biaya_kirim ?? null;

    return NextResponse.json({
      order: {
        id_pesanan: order.id_pesanan,
        tgl_pesan: order.tgl_pesan,
        status_pesanan: order.status_pesanan || "Menunggu Konfirmasi",
        metode_kirim: order.metode_kirim || "Ambil di tempat",
        total_estimasi: Number(order.total_estimasi || 0),
      },
      items,
      alamat: dikirim ? buyer.data.alamat_buyer || null : null,
      penerima: buyer.data.nama_buyer || null,
      pembayaran: {
        metode: order.metode_pembayaran || null,
        status: order.status_pembayaran || null,
      },
      ringkasan: {
        subtotal,
        ongkir: ongkir === null ? null : Number(ongkir),
        total: Number(order.total_estimasi || subtotal),
      },
      riwayat,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal membaca detail pesanan." }, { status: 500 });
  }
}
