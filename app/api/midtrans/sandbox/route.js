
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { roleFromUser } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIDTRANS_URL =
  "https://app.sandbox.midtrans.com/snap/v1/transactions";

// Nominal khusus simulasi, bukan harga pesanan asli.
const TEST_AMOUNT = 10000;

export async function POST(request) {
  try {
    // 1. Pastikan hanya Sandbox yang digunakan
    if (
      process.env.MIDTRANS_IS_PRODUCTION === "true" ||
      process.env.MIDTRANS_SANDBOX_TEST_ENABLED !== "true"
    ) {
      return NextResponse.json(
        { error: "Simulasi Sandbox belum diaktifkan." },
        { status: 403 }
      );
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      return NextResponse.json(
        { error: "Server Key Midtrans belum dikonfigurasi." },
        { status: 500 }
      );
    }

    // 2. Memeriksa login Buyer
    const authorization =
      request.headers.get("authorization") || "";

    const token = authorization.replace(/^Bearer\s+/i, "");

    if (!token || token === authorization) {
      return NextResponse.json(
        { error: "Silakan login sebagai Buyer." },
        { status: 401 }
      );
    }

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Konfigurasi Supabase belum lengkap." },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !data?.user) {
      return NextResponse.json(
        { error: "Sesi login tidak valid." },
        { status: 401 }
      );
    }

    if (roleFromUser(data.user) !== "buyer") {
      return NextResponse.json(
        { error: "Hanya Buyer yang bisa melakukan simulasi." },
        { status: 403 }
      );
    }

    // 3. Membuat ID transaksi simulasi
    const orderId =
      `CIRCLO-TEST-${randomUUID()}`;

    // 4. Data transaksi untuk Midtrans
    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: TEST_AMOUNT,
      },
      item_details: [
        {
          id: "DEMO-CIRCLO",
          name: "Simulasi Pembayaran CIRCLO",
          price: TEST_AMOUNT,
          quantity: 1,
        },
      ],
    };

    // 5. Autentikasi ke Midtrans
    const encodedKey = Buffer.from(
      `${serverKey}:`
    ).toString("base64");

    const response = await fetch(MIDTRANS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${encodedKey}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const result = await response
      .json()
      .catch(() => ({}));

    if (!response.ok || !result.token) {
      return NextResponse.json(
        {
          error:
            "Midtrans gagal membuat transaksi. Periksa Server Key Sandbox dan izin Snap Checkout.",
          status: response.status,
        },
        { status: 502 }
      );
    }

    // 6. Mengirim Snap Token ke frontend
    return NextResponse.json({
      success: true,
      order_id: orderId,
      amount: TEST_AMOUNT,
      token: result.token,
      redirect_url: result.redirect_url,
    });

  } catch (error) {
    console.error(
      "Midtrans Sandbox Error:",
      error.message
    );

    return NextResponse.json(
      { error: "Terjadi kesalahan pada koneksi Midtrans." },
      { status: 500 }
    );
  }
}
