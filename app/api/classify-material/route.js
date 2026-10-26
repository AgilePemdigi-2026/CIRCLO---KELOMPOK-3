// app/api/generate-description/route.js
// "Bantu dengan AI" di halaman Upload Material: membaca FOTO + isian seller,
// lalu menghasilkan deskripsi dan klasifikasi material yang konkret.
// Key Gemini hanya ada di server; browser tidak pernah melihatnya.

import { NextResponse } from "next/server";
import { roleFromUser } from "@/lib/roles";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const KATEGORI = ["Spanduk", "Plastik", "Tekstil", "Kulit", "Kayu", "Logam", "Kaca", "Karet", "Organik", "Kertas", "Lainnya"];
const SATUAN = ["kg", "m2", "pcs"];
const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_CHARS = 7_000_000; // ~5 MB; foto sudah diperkecil di browser

const deny = (status, error) => NextResponse.json({ error }, { status });

// ---------- Hak akses: hanya Seller (sama seperti route classify-material) ----------
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
    if (roleFromUser(await res.json()) !== "seller") return deny(403, "Hanya Seller yang dapat memakai fitur ini.");
  } catch {
    return deny(503, "Autentikasi tidak dapat diperiksa. Coba lagi.");
  }
  return null;
}

// ---------- Prompt & skema keluaran ----------
const SYSTEM_PROMPT = `Kamu asisten katalog material daur ulang di platform Circlo. Kamu menerima FOTO material dan data dari seller. Tulis deskripsi dan klasifikasi material yang KONKRET dan JUJUR.

Aturan:
1. Sebut hanya hal yang terlihat di foto atau diberikan seller: jenis bahan, warna, tekstur atau pola, bentuk potongan, kondisi visual (bersih, lipatan, noda, sobekan, karat, dll).
2. Jangan mengarang ukuran, berat, merek, asal, atau jumlah. Bila hanya perkiraan, tulis "diperkirakan" atau "sekitar". Hal yang tidak bisa dipastikan dari foto masuk ke "perlu_konfirmasi", bukan ke deskripsi.
3. Deskripsi 2-4 kalimat, Bahasa Indonesia yang wajar, tanpa emoji dan tanpa kata promosi berlebihan. Urutan: jenis dan warna, tekstur dan kondisi, bentuk atau ukuran perkiraan, kegunaan umum.
4. "category" harus salah satu nilai yang diizinkan. Gunakan "Lainnya" jika tidak cocok.
5. "tags": 3-6 kata huruf kecil. "potential_uses": 2-4 pemanfaatan yang realistis untuk bahan itu.
6. "specifications" hanya berisi atribut yang terlihat di foto (misalnya warna, tekstur, pola, ketebalan perkiraan, bentuk). JANGAN memasukkan jumlah, harga, atau lokasi.
7. Jika foto tidak jelas atau tidak sesuai dengan data seller, isi "confidence" dengan "rendah" dan jelaskan di "perlu_konfirmasi".
8. Jika seller sudah menulis nama atau kondisi, pertahankan maknanya; rapikan saja bahasanya.
9. Berikan peringatan keselamatan di "buyer_notes" bila material berisiko (kaca pecah, logam tajam, bekas bahan kimia, dll).
Keluarkan HANYA JSON sesuai skema.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    description: { type: "STRING" },
    condition: { type: "STRING" },
    category: { type: "STRING", enum: KATEGORI },
    subcategory: { type: "STRING" },
    composition: { type: "STRING" },
    specifications: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { label: { type: "STRING" }, value: { type: "STRING" } },
        required: ["label", "value"],
      },
    },
    potential_uses: { type: "ARRAY", items: { type: "STRING" } },
    buyer_notes: { type: "ARRAY", items: { type: "STRING" } },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    satuan_saran: { type: "STRING", enum: SATUAN },
    perlu_konfirmasi: { type: "ARRAY", items: { type: "STRING" } },
    confidence: { type: "STRING", enum: ["tinggi", "sedang", "rendah"] },
  },
  required: ["name", "description", "condition", "category", "specifications", "potential_uses", "tags", "confidence"],
};

// ---------- Utilitas ----------
class AiError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

const str = (v, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v, n, max) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);
const rupiah = (n) => `Rp ${Number(n).toLocaleString("id-ID")}`;

function parseImage(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;
  if (dataUrl.length > MAX_IMAGE_CHARS) return { tooLarge: true };
  const idx = dataUrl.indexOf(";base64,");
  if (idx < 0) return null;
  const mime = dataUrl.slice(5, idx);
  if (!IMAGE_MIME.includes(mime)) return null;
  return { mime, data: dataUrl.slice(idx + 8) };
}

function buildUserText(body) {
  const rows = [
    ["Nama dari seller", str(body.name, 200)],
    ["Deskripsi awal dari seller", str(body.description, 2000)],
    ["Kondisi dari seller", str(body.condition, 200)],
    ["Jumlah", body.quantity ? `${str(String(body.quantity), 20)} ${str(body.satuan, 10)}`.trim() : ""],
    ["Lokasi", str(body.location, 200)],
  ].filter(([, v]) => v);
  return `Data dari seller:\n${rows.map(([k, v]) => `- ${k}: ${v}`).join("\n") || "- (belum ada isian)"}\n\nAnalisis FOTO terlampir dan tulis hasilnya sesuai skema.`;
}

// ---------- Panggil Gemini ----------
async function callGemini(apiKey, userText, image) {
  const parts = [{ text: userText }, { inlineData: { mimeType: image.mime, data: image.data } }];
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(28000),
    });
  } catch (err) {
    if (err?.name === "TimeoutError") throw new AiError("AI belum merespons. Coba lagi sebentar.", 504);
    throw new AiError("Layanan AI tidak dapat dihubungi.", 502);
  }

  if (res.status === 429) throw new AiError("Layanan AI sedang sibuk. Coba lagi beberapa saat lagi.", 429);
  if (res.status === 400 || res.status === 403) {
    const detail = await res.json().catch(() => ({}));
    console.error("generate-description: Gemini menolak permintaan:", detail?.error?.message || res.status);
    throw new AiError("Layanan AI menolak permintaan. Periksa konfigurasi key dan model di server.", 502);
  }
  if (!res.ok) throw new AiError("Layanan AI mengalami gangguan. Coba lagi.", 502);

  const data = await res.json().catch(() => ({}));
  if (data?.promptFeedback?.blockReason) {
    throw new AiError("Foto tidak dapat dianalisis. Coba foto lain yang lebih jelas.", 422);
  }
  const cand = data?.candidates?.[0];
  const text = (cand?.content?.parts || []).map((p) => p.text || "").join("").trim();
  if (!text) throw new AiError("AI tidak mengembalikan hasil. Coba lagi.", 502);
  return text;
}

// Rapikan & validasi keluaran model; lempar AiError bila tidak layak dipakai
function normalize(rawText, body) {
  let obj;
  try {
    obj = JSON.parse(rawText.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new AiError("Hasil AI tidak terbaca. Coba lagi.", 502);
  }

  const description = str(obj.description, 1200);
  if (description.length < 20) throw new AiError("AI belum menghasilkan deskripsi yang layak. Coba lagi.", 502);

  const category = KATEGORI.includes(obj.category) ? obj.category : "Lainnya";

  // Atribut visual dari AI; buang yang menyentuh jumlah/harga/lokasi (itu milik seller)
  const aiSpecs = (Array.isArray(obj.specifications) ? obj.specifications : [])
    .map((s) => ({ label: str(s?.label, 60), value: str(s?.value, 160) }))
    .filter((s) => s.label && s.value && !/jumlah|harga|lokasi|stok|kuantitas/i.test(s.label))
    .slice(0, 8);

  // Data pasti dari seller digabung oleh KODE, bukan ditulis AI
  const sellerSpecs = [];
  const qty = Number(body.quantity);
  if (Number.isFinite(qty) && qty > 0) {
    sellerSpecs.push({ label: "Jumlah", value: `${qty.toLocaleString("id-ID")} ${SATUAN.includes(body.satuan) ? body.satuan : ""}`.trim() });
  }
  const price = Number(body.price);
  if (String(body.price ?? "").trim() !== "" && Number.isFinite(price) && price >= 0) {
    sellerSpecs.push({ label: "Harga per satuan", value: rupiah(price) });
  }
  if (str(body.location, 200)) sellerSpecs.push({ label: "Lokasi", value: str(body.location, 200) });

  const confidence = ["tinggi", "sedang", "rendah"].includes(obj.confidence) ? obj.confidence : "sedang";

  return {
    name: str(obj.name, 120),
    description,
    condition: str(obj.condition, 200),
    category,
    subcategory: str(obj.subcategory, 80),
    composition: str(obj.composition, 200),
    specifications: [...aiSpecs, ...sellerSpecs],
    potential_uses: list(obj.potential_uses, 4, 120),
    buyer_notes: list(obj.buyer_notes, 4, 200),
    tags: list(obj.tags, 6, 30).map((t) => t.toLowerCase().replace(/^#/, "")),
    satuan_saran: SATUAN.includes(obj.satuan_saran) ? obj.satuan_saran : null,
    perlu_konfirmasi: list(obj.perlu_konfirmasi, 5, 160),
    confidence,
  };
}

// ---------- Handler ----------
export async function POST(request) {
  const denied = await requireSeller(request);
  if (denied) return denied;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return deny(500, "GEMINI_API_KEY belum diatur di server.");

  let body;
  try {
    body = await request.json();
  } catch {
    return deny(400, "Format request tidak valid.");
  }

  const image = parseImage(body.image);
  if (!image) return deny(400, "Foto wajib diunggah (JPG, PNG, atau WebP) agar AI bisa melihat materialnya.");
  if (image.tooLarge) return deny(413, "Ukuran foto terlalu besar. Pilih foto yang lebih kecil.");
  if (!str(body.name, 200) && str(body.description, 2000).length < 3) {
    return deny(400, "Isi nama material atau deskripsi singkat terlebih dahulu.");
  }

  const userText = buildUserText(body);
  let lastError = new AiError("Gagal membuat deskripsi dengan AI.", 502);

  for (let attempt = 0; attempt < 2; attempt++) {   // coba ulang sekali bila JSON rusak/deskripsi kosong
    try {
      const raw = await callGemini(apiKey, userText, image);
      return NextResponse.json(normalize(raw, body));
    } catch (err) {
      lastError = err instanceof AiError ? err : new AiError("Gagal membuat deskripsi dengan AI.", 502);
      const retryable = lastError.status === 502 && /tidak terbaca|belum menghasilkan|tidak mengembalikan/.test(lastError.message);
      if (!retryable) break;
    }
  }
  // Tidak pernah mengembalikan struktur kosong dengan status 200
  return deny(lastError.status, lastError.message);
}