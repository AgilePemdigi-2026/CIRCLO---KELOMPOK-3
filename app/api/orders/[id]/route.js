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
