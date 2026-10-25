// app/api/classify-material/route.js
// Penghubung Next.js ke CIRCLO AI Service (Python/FastAPI di Render).
// Gemini dan model estimasi harga berjalan di service Python, jadi key dan
// alamat service tidak pernah dikirim ke browser.

import { NextResponse } from "next/server";
import { roleFromUser } from "@/lib/roles";

export const runtime = "nodejs";
export const maxDuration = 60; // Render paket gratis bisa lambat saat bangun dari tidur

const deny = (status, error) => NextResponse.json({ error }, { status });

// Hanya Seller yang login boleh memakai klasifikasi (SRS 5.3: hak akses berdasarkan role).
// Saat npm run dev tanpa login, pemeriksaan dilewati agar halaman bisa dicoba. Di production wajib login.
async function requireSeller(request) {
  const isProd = process.env.NODE_ENV === "production";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");

  if (!supabaseUrl || !supabaseKey) return isProd ? deny(503, "Autentikasi belum dikonfigurasi di server.") : null;
  if (!token) return isProd ? deny(401, "Silakan login terlebih dahulu.") : null;

  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return deny(401, "Sesi login tidak valid. Silakan login ulang.");
    if (roleFromUser(await res.json()) !== "seller") return deny(403, "Hanya Seller yang dapat mengunggah material.");
  } catch {
    return deny(503, "Autentikasi tidak dapat diperiksa. Coba lagi.");
  }
  return null;
}

export async function POST(request) {
  const denied = await requireSeller(request);
  if (denied) return denied;

  const baseUrl = process.env.AI_SERVICE_URL;
  const apiKey = process.env.AI_SERVICE_KEY;
  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { error: "AI_SERVICE_URL dan AI_SERVICE_KEY belum diatur di server." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const description = String(body.description || "").trim();
  if (description.length < 5) {
    return NextResponse.json({ error: "Deskripsi material terlalu singkat." }, { status: 400 });
  }
  if (description.length > 2000) {
    return NextResponse.json(
      { error: "Deskripsi material terlalu panjang (maksimal 2000 karakter)." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({
        description,
        quantity: String(body.quantity || ""),
        price: String(body.price || ""),
        location: String(body.location || ""),
        condition: String(body.condition || ""), // belum dipakai ai-service (diabaikan), disiapkan untuk nanti
        image: body.image || null,
      }),
      signal: AbortSignal.timeout(55000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = typeof data.detail === "string" ? data.detail : "Layanan AI tidak dapat memproses permintaan.";
      // Kesalahan autentikasi antar-server tidak perlu dibuka ke pengguna
      const message = res.status === 401 ? "Layanan AI tidak dapat diakses." : detail;
      return NextResponse.json({ error: message }, { status: res.status === 401 ? 502 : res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("classify-material error:", err);
    const timedOut = err?.name === "TimeoutError";
    return NextResponse.json(
      { error: timedOut ? "Layanan AI belum merespons. Coba lagi sebentar." : "Layanan AI tidak dapat dihubungi." },
      { status: 504 }
    );
  }
}
