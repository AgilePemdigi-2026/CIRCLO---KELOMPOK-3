
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

let imageMapCache = null;

function imageMap() {
  if (imageMapCache !== null) return imageMapCache;
  try {
    const file = path.join(process.cwd(), 'public', 'data', 'material_images.json');
    imageMapCache = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    imageMapCache = {};
  }
  return imageMapCache;
}

function imageFor(material) {
  const data = imageMap();
  const entry = data.materials?.[String(material.id_material)];
  if (entry?.image_url) return entry;
  const slug = String(material.kategori || 'lainnya')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return {
    image_url: data.category_images?.[material.kategori]?.url || `/images/materials/${slug || 'lainnya'}.svg`,
    image_match_type: 'category_fallback',
    image_alt: `Ilustrasi ${material.kategori || 'material'}: ${material.nama_material}`,
  };
}
export const dynamic = 'force-dynamic';

const AI_URL = process.env.CIRCLO_AI_URL || 'http://127.0.0.1:8000';

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(
    '[Search API] Env check - url:',
    url ? 'set' : 'MISSING',
    'key:',
    key ? 'set' : 'MISSING'
  );

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cosineSim(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }

  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? 'set'
        : 'MISSING',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? 'set'
        : 'MISSING',
      CIRCLO_AI_URL: process.env.CIRCLO_AI_URL ? 'set' : 'MISSING',
    },
  });
}

export async function POST(req) {
  try {
    console.log('[Search API] Request received');

    const { query, limit = 10, threshold = 0.3 } = await req.json();

    console.log('[Search API] Query:', query);

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query wajib diisi' },
        { status: 400 }
      );
    }

    console.log('[Search API] Calling AI embed...');

    const embRes = await fetch(`${AI_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query, type: 'query' }),
    });

    console.log('[Search API] AI embed response:', embRes.status);

    if (!embRes.ok) {
      const errText = await embRes.text();
      console.error('[Search API] AI embed error:', errText);

      return NextResponse.json(
        { error: 'Gagal embedding query' },
        { status: 502 }
      );
    }

    const { embedding: qVec } = await embRes.json();

    console.log('[Search API] Got embedding, dim:', qVec?.length);

    const admin = adminClient();

    if (!admin) {
      console.error('[Search API] Supabase client failed - check env vars');

      return NextResponse.json(
        { error: 'Supabase belum dikonfigurasi' },
        { status: 500 }
      );
    }

    console.log('[Search API] Querying materials...');

    const { data: materials, error } = await admin
      .from('material')
      .select(
        'id_material,nama_material,kategori,stok,harga,kota,provinsi,satuan,deskripsi_material,embedding'
      )
      .eq('status_material', true)
      .gt('stok', 0);

    console.log(
      '[Search API] Materials query done, error:',
      error?.message,
      'count:',
      materials?.length
    );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const results = (materials || [])
      .filter((m) => m.embedding)
      .map((m) => {
        let emb;

        try {
          emb =
            typeof m.embedding === 'string'
              ? JSON.parse(m.embedding)
              : m.embedding;
        } catch (parseErr) {
          console.error(
            '[Search API] Embedding parse error for',
            m.nama_material,
            parseErr
          );
          return null;
        }

        if (!Array.isArray(emb)) return null;

        return {
          ...m,
          match: Math.round(cosineSim(qVec, emb) * 100),
        };
      })
      .filter((m) => m && m.match >= Math.round(threshold * 100))
      .sort((a, b) => b.match - a.match)
      .slice(0, limit)
      .map((m) => {
        const image = imageFor(m);
        return {
          id_material: m.id_material,
          nama: m.nama_material,
          nama_material: m.nama_material,
          match: m.match,
          kategori: m.kategori,
          harga: Number(m.harga),
          stok: Number(m.stok),
          kota: m.kota,
          provinsi: m.provinsi,
          satuan: m.satuan,
          deskripsi_material: m.deskripsi_material,
          image_url: image.image_url,
          image_match_type: image.image_match_type,
          image_alt: image.image_alt,
        };
      });

    console.log('[Search API] Results:', results.length);

    return NextResponse.json({ results });
  } catch (e) {
    console.error('[Search API] Fatal error:', e);

    return NextResponse.json(
      { error: e.message || 'Internal error' },
      { status: 500 }
    );
  }
}
