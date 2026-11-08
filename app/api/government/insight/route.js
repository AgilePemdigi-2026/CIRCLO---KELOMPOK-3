import { NextResponse } from 'next/server';
import { ambilStatistik, bacaFilter } from '@/lib/governmentStats';
import { cekPemerintah } from '@/lib/governmentAuth';
 
export const dynamic = 'force-dynamic';
 
function buatPrompt(s) {
  const ringkas = {
    filter: s.filter,
    total_listing: s.ringkasan.totalListing,
    terserap: s.ringkasan.terserap,
    belum_terserap: s.ringkasan.belumTerserap,
    pesanan_berhasil: s.kpi.pesananBerhasil,
    kg_terserap: s.kpi.terserapKg,
    pengelola_aktif: s.kpi.pengelolaAktif,
    per_kategori: s.kategori.map((r) => ({ kategori: r.kategori, listing: r.listing, terserap: r.terserap })),
    titik_panas: s.hotspot.slice(0, 5).map((r) => ({ kota: r.kota, listing: r.listing, pesanan: r.pesanan })),
  };
  return (
    'Kamu analis kebijakan ekonomi sirkular untuk pemerintah. ' +
    'Berdasarkan data berikut, tulis wawasan singkat dalam bahasa Indonesia: maksimal 3 kalimat, ' +
    'sebutkan temuan utama dan satu rekomendasi tindakan. Gunakan hanya angka dari data, jangan mengarang. ' +
    'Tanpa markdown dan tanpa pembuka.\n\nDATA:\n' +
    JSON.stringify(ringkas)
  );
}
 
async function panggilOpenRouter(prompt, sinyal) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: sinyal,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const j = await res.json();
  return j?.choices?.[0]?.message?.content?.trim() || null;
}
 
async function panggilGemini(prompt, sinyal) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      signal: sinyal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const j = await res.json();
  return j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim() || null;
}
 
// GET /api/government/insight?periode=...&kategori=...&kota=...
// Selalu mengembalikan teks: jika AI gagal/tidak dikonfigurasi, dipakai ringkasan otomatis.
export async function GET(request) {
  const auth = await cekPemerintah();
  if (!auth.ok) return NextResponse.json({ error: auth.pesan }, { status: auth.status });
  let stat;
  try {
    stat = await ambilStatistik(bacaFilter(new URL(request.url).searchParams));
  } catch (e) {
    console.error('[government/insight] gagal memuat data:', e?.message);
    return NextResponse.json({ error: 'Data gagal dimuat' }, { status: 500 });
  }
 
  const ada = stat.ringkasan.totalListing > 0;
  if (ada) {
    const prompt = buatPrompt(stat);
    for (const panggil of [panggilOpenRouter, panggilGemini]) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const teks = await panggil(prompt, ctrl.signal);
        if (teks) return NextResponse.json({ teks, sumber: 'ai' });
      } catch (e) {
        console.error('[government/insight] AI gagal:', e?.message);
      } finally {
        clearTimeout(timer);
      }
    }
  }
  return NextResponse.json({ teks: stat.insightAturan, sumber: 'aturan' });
}