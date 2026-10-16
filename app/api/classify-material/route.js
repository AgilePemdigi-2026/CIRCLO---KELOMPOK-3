// app/api/classify-material/route.js
// Penghubung Next.js ke CIRCLO AI Service (Python/FastAPI di Render).
// Gemini dan model estimasi harga berjalan di service Python, jadi key dan
// alamat service tidak pernah dikirim ke browser.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // Render paket gratis bisa lambat saat bangun dari tidur

export async function POST(request) {
  // TODO: pastikan pengguna sudah login dan berperan Seller (Supabase auth).

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
