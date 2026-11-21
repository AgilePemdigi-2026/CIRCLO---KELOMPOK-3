
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sendError(message, status = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

// Memeriksa kunci khusus recovery
function validRecoverySecret(request) {
  const expected =
    process.env.MIDTRANS_RECOVERY_SECRET || "";

  const received =
    request.headers.get("x-recovery-secret") || "";

  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}

// GET: Hanya memeriksa pesanan tertahan
export async function GET(request) {
  try {
    // Recovery hanya tersedia di Sandbox
    if (process.env.MIDTRANS_IS_PRODUCTION !== "false") {
      return sendError("Sandbox only.", 403);
    }

    if (!process.env.MIDTRANS_RECOVERY_SECRET) {
      return sendError(
        "Recovery Secret belum dikonfigurasi.",
        503
      );
    }

    if (!validRecoverySecret(request)) {
      return sendError(
        "Akses recovery tidak diizinkan.",
        401
      );
    }

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return sendError(
        "Konfigurasi Supabase tidak lengkap.",
        500
      );
    }

    const admin = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Ambil pesanan yang lebih dari 30 menit
    const batasWaktu = new Date(
      Date.now() - 30 * 60 * 1000
    ).toISOString();

    const { data: pesanan, error: pesananError } =
      await admin
        .from("pesanan")
        .select(
          "id_pesanan,status_pesanan,tgl_pesan"
        )
        .eq("status_pesanan", "Menunggu Pembayaran")
        .lt("tgl_pesan", batasWaktu)
        .order("tgl_pesan", {
          ascending: true,
        })
        .limit(50);

    if (pesananError) {
      return sendError(
        "Gagal membaca pesanan.",
        500
      );
    }

    if (!pesanan?.length) {
      return NextResponse.json({
        success: true,
        mode: "read_only",
        total: 0,
        candidates: [],
      });
    }

    const daftarId = pesanan.map(
      (item) => item.id_pesanan
    );

    const { data: pembayaran, error: bayarError } =
      await admin
        .from("pembayaran_midtrans")
        .select(
          "id_pesanan,status_pembayaran,snap_token"
        )
        .in("id_pesanan", daftarId);

    if (bayarError) {
      return sendError(
        "Gagal membaca data pembayaran.",
        500
      );
    }

    const pembayaranMap = new Map(
      (pembayaran || []).map(
        (item) => [item.id_pesanan, item]
      )
    );

    const candidates = pesanan.map((item) => {
      const bayar = pembayaranMap.get(
        item.id_pesanan
      );

      let kondisi = "PERLU_VERIFIKASI_MIDTRANS";

      if (!bayar) {
        kondisi = "TANPA_REFERENSI_MIDTRANS";
      } else if (!bayar.snap_token) {
        kondisi = "SNAP_TOKEN_BELUM_TERSIMPAN";
      }

      return {
        id_pesanan: item.id_pesanan,
        tgl_pesan: item.tgl_pesan,
        status_pesanan: item.status_pesanan,
        status_pembayaran:
          bayar?.status_pembayaran || null,
        kondisi,
      };
    });

    return NextResponse.json(
      {
        success: true,
        mode: "read_only",
        total: candidates.length,
        candidates,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

  } catch (error) {
    console.error(
      "Midtrans Recovery error:",
      error.message
    );

    return sendError(
      "Gagal memeriksa transaksi tertahan.",
      500
    );
  }
}
