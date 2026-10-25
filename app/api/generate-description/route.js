import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const TIMEOUT_MS = 45000;
const DEFAULT_OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `Kamu adalah copywriter untuk CIRCLO, marketplace material daur ulang di Indonesia.
Dari nama produk sisa material (dan deskripsi singkat bila ada), tulis SATU paragraf deskripsi produk dalam Bahasa Indonesia yang informatif dan menarik untuk calon pembeli.
Aturan:
- 2 sampai 4 kalimat, sekitar 40-80 kata.
- Sebutkan potensi pemanfaatan ulang, keunggulan, dan ajakan singkat untuk membeli.
- Jangan mengarang angka, dimensi, berat, warna, sertifikasi, atau merek yang tidak diberikan.
- Jangan memakai Markdown, emoji, tanda petik pembuka, atau kalimat pembuka seperti "Berikut adalah".
- Langsung tuliskan paragraf deskripsinya saja.`;

function clean(text) {
  return String(text || '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^(deskripsi|description)\s*:\s*/i, '')
    .replace(/\*\*/g, '')
    .trim();
}

function fallbackDescription(name, description) {
  const seed = (name || description || 'Material sisa').trim();
  const lower = seed.charAt(0).toLowerCase() + seed.slice(1);
  return `${seed} ini adalah material sisa yang masih berkualitas dan siap dimanfaatkan kembali. Cocok dijadikan bahan baku untuk usaha kreatif maupun kebutuhan sehari-hari, sehingga lebih hemat dibanding membeli material baru. Dengan memilih ${lower}, kamu ikut mengurangi limbah dan mendukung gaya hidup yang lebih berkelanjutan.`;
}

function buildPrompt(name, description) {
  return `Nama produk: ${name || '-'}\nDeskripsi singkat dari seller: ${description || '-'}`;
}

async function viaOpenRouter({ name, description }) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-Title': 'CIRCLO',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(name, description) },
      ],
      temperature: 0.7,
      max_tokens: 260,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const json = await res.json();
  return clean(json?.choices?.[0]?.message?.content);
}

async function viaGemini({ name, description }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const base = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const res = await fetch(`${base}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: buildPrompt(name, description) }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 260 },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
  return clean(text);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Format request tidak valid.' }, { status: 400 });
  }

  const name = String(body?.name || '').trim().slice(0, 200);
  const description = String(body?.description || '').trim().slice(0, 600);

  if (!name && !description) {
    return NextResponse.json({ error: 'Isi dulu nama produk atau deskripsi singkat.' }, { status: 400 });
  }

  const providers = [
    ['openrouter', viaOpenRouter],
    ['gemini', viaGemini],
  ];

  for (const [source, provider] of providers) {
    try {
      const text = await provider({ name, description });
      if (text) return NextResponse.json({ description: text, source });
    } catch (err) {
      console.error(`[generate-description] ${source} gagal:`, err.message);
    }
  }

  return NextResponse.json({ description: fallbackDescription(name, description), source: 'fallback' });
}
