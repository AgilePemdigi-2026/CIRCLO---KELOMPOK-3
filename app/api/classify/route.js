
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Default memakai model terbaru yang masih punya tier GRATIS (Gemini 3.8 Flash), cadangan Flash-Lite yang jatah
// hariannya lebih besar. Kalau kena batas kuota (429) atau ditolak, otomatis pindah ke model berikutnya, lalu mode demo.
// Punya akun berbayar? Isi GEMINI_MODEL=gemini-4-argon di .env.local untuk model paling baru.
const BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const MODELS = [...new Set([process.env.GEMINI_MODEL || 'gemini-3.8-flash', process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite'])];
// Klasifikasi material tugas ringan, jadi "low" cukup dan paling hemat. Naikkan ke medium/high kalau hasilnya kurang akurat.
const THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || 'low';
const TIMEOUT_MS = 60000;

const JENIS = ['Kayu', 'Plastik', 'Kaca', 'Logam', 'Tekstil', 'Kertas', 'Karet', 'Batu Bata', 'Keramik', 'Elektronik', 'Lainnya'];
const KATEGORI = ['Struktural', 'Dekoratif', 'Bahan Baku', 'Kemasan', 'Komponen', 'Lainnya'];
const KONDISI = ['Sangat Baik', 'Baik', 'Cukup', 'Perlu Perbaikan'];

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    dapatDiklasifikasikan: { type: 'BOOLEAN' },
    nama: { type: 'STRING' },
    jenisMaterial: { type: 'STRING', enum: JENIS },
    kategori: { type: 'STRING', enum: KATEGORI },
    kondisi: { type: 'STRING', enum: KONDISI },
    dimensi: { type: 'STRING' },
    skor: { type: 'INTEGER' },
  },
  required: ['dapatDiklasifikasikan', 'nama', 'jenisMaterial', 'kategori', 'kondisi', 'dimensi', 'skor'],
};

const SYSTEM_PROMPT = `Kamu adalah modul AI Material Classification pada platform ekonomi sirkular CIRCLO di Indonesia.
Tugasmu: mengklasifikasikan sisa material yang diunggah Seller berdasarkan deskripsi dan foto.
Aturan:
- Jawab hanya sesuai skema JSON yang diminta.
- "nama" adalah nama singkat material dalam bahasa Indonesia (contoh: "Palet Kayu", "Sisa Kain Katun Hitam").
- "kondisi" dinilai dari foto dan deskripsi. Jika tidak ada petunjuk sama sekali, pilih "Cukup" dan turunkan skor.
- "dimensi" berupa perkiraan ukuran, contoh "1200 × 800 mm". Jika tidak bisa diperkirakan, isi "Tidak terdeteksi". Jangan mengarang angka yang tidak ada dasarnya.
- "skor" 0 sampai 100 adalah tingkat keyakinan klasifikasi sekaligus kelengkapan informasi.
- Jika deskripsi terlalu umum atau foto dan deskripsi tidak menunjukkan material yang jelas, set dapatDiklasifikasikan = false dan skor di bawah 40.`;

// Cadangan sederhana kalau Gemini belum dikonfigurasi atau sedang error (mode demo).
const RULES = [
  { re: /kayu|palet|pallet|papan|triplek|bambu/i, jenis: 'Kayu', kategori: 'Struktural' },
  { re: /plastik|botol|hdpe|pet\b|galon/i, jenis: 'Plastik', kategori: 'Bahan Baku' },
  { re: /kaca|gelas|jendela/i, jenis: 'Kaca', kategori: 'Dekoratif' },
  { re: /besi|baja|logam|aluminium|seng|tembaga|kaleng/i, jenis: 'Logam', kategori: 'Struktural' },
  { re: /kain|katun|tekstil|perca|benang|kulit|baju|konveksi/i, jenis: 'Tekstil', kategori: 'Bahan Baku' },
  { re: /kertas|kardus|karton|koran/i, jenis: 'Kertas', kategori: 'Kemasan' },
  { re: /karet|ban\b/i, jenis: 'Karet', kategori: 'Bahan Baku' },
  { re: /bata|batu bata/i, jenis: 'Batu Bata', kategori: 'Struktural' },
  { re: /keramik|genteng|ubin/i, jenis: 'Keramik', kategori: 'Dekoratif' },
  { re: /kabel|elektronik|komponen|baterai/i, jenis: 'Elektronik', kategori: 'Komponen' },
];

function fallbackClassify(description) {
  const hit = RULES.find((r) => r.re.test(description));
  const cond = /baru|bersih|kering|mulus|bagus/i.test(description) ? 'Baik' : /rusak|retak|karat|patah/i.test(description) ? 'Perlu Perbaikan' : 'Cukup';
  if (!hit) {
    return { dapatDiklasifikasikan: false, nama: description.slice(0, 40), jenisMaterial: 'Lainnya', kategori: 'Lainnya', kondisi: 'Cukup', dimensi: 'Tidak terdeteksi', skor: 25, source: 'fallback' };
  }
  const nama = description.split(/[,.;\n]/)[0].trim().replace(/^sisa\s+/i, '').split(/\s+/).slice(0, 3).join(' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { dapatDiklasifikasikan: true, nama, jenisMaterial: hit.jenis, kategori: hit.kategori, kondisi: cond, dimensi: 'Tidak terdeteksi', skor: 60, source: 'fallback' };
}

function sanitize(raw) {
  const pick = (v, list, def) => (list.includes(v) ? v : def);
  return {
    dapatDiklasifikasikan: Boolean(raw.dapatDiklasifikasikan),
    nama: String(raw.nama || 'Material').slice(0, 60),
    jenisMaterial: pick(raw.jenisMaterial, JENIS, 'Lainnya'),
    kategori: pick(raw.kategori, KATEGORI, 'Lainnya'),
    kondisi: pick(raw.kondisi, KONDISI, 'Cukup'),
    dimensi: String(raw.dimensi || 'Tidak terdeteksi').slice(0, 40),
    skor: Math.max(0, Math.min(100, Math.round(Number(raw.skor) || 0))),
    source: 'gemini',
  };
}

function buildParts({ description, quantity, price, location, image }) {
  const parts = [
    {
      text: `Deskripsi Seller: "${description}"\nJumlah: ${quantity}\nHarga: Rp${price}\nLokasi: ${location}\nKlasifikasikan material ini.`,
    },
  ];
  const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(image || '');
  if (m) parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
  return parts;
}

async function callModel(model, parts, withThinking) {
  const res = await fetch(`${BASE}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    // temperature/top_p/top_k sengaja tidak dikirim: sudah deprecated dan diabaikan di model terbaru.
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        ...(withThinking ? { thinkingConfig: { thinkingLevel: THINKING_LEVEL } } : {}),
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw Object.assign(new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`), { status: res.status });
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  return sanitize(JSON.parse(text));
}

// Coba model satu per satu. Kalau parameter thinking ditolak (HTTP 400), ulangi tanpa parameter itu.
async function classifyWithGemini(input) {
  const parts = buildParts(input);
  let lastErr;
  for (const model of MODELS) {
    try {
      try {
        return { ...(await callModel(model, parts, true)), model };
      } catch (e) {
        if (e.status === 400) return { ...(await callModel(model, parts, false)), model };
        throw e;
      }
    } catch (e) {
      lastErr = e;
      console.error(`[classify] ${model} gagal: ${e.message}`);
    }
  }
  throw lastErr;
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request tidak valid' }, { status: 400 });
  }

  const { description, quantity, price, location } = body;
  if (!description?.trim() || !(Number(quantity) > 0) || price === '' || price == null || !location?.trim()) {
    return NextResponse.json({ error: 'Upload failed. Please check the data' }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(fallbackClassify(description));
  }

  try {
    return NextResponse.json(await classifyWithGemini(body));
  } catch (err) {
    console.error('[classify]', err.message);
    return NextResponse.json(fallbackClassify(description));
  }
}
