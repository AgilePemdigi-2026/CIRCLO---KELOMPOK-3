import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  pathwaysForCategory,
  rankPathwaysForMaterial,
  toPathway,
} from '@/lib/knowledgeGraph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const clean = (value) => String(value || '').replace(/[,()%*]/g, ' ').trim();

// GET /api/knowledge-graph?material_id=12
// GET /api/knowledge-graph?kategori=Tekstil
// GET /api/knowledge-graph?q=perca kain
// Sumber jalur: tabel resep_produk. Tidak ada klaim dampak lingkungan.
export async function GET(request) {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Supabase belum dikonfigurasi di server.' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const materialId = Number(searchParams.get('material_id'));
  const kategori = clean(searchParams.get('kategori'));
  const q = clean(searchParams.get('q'));
  const limit = Math.min(12, Math.max(1, Number(searchParams.get('limit')) || 4));

  let material = null;
  let targetKategori = kategori;

  if (Number.isSafeInteger(materialId) && materialId > 0) {
    const found = await admin
      .from('material')
      .select('id_material,nama_material,kategori,deskripsi_material,kondisi_seller,kota,provinsi,satuan,stok,harga')
      .eq('id_material', materialId)
      .maybeSingle();

    if (found.error) {
      return NextResponse.json(
        { error: `Gagal memuat material: ${found.error.message}` },
        { status: 500 },
      );
    }
    if (!found.data) {
      return NextResponse.json({ error: 'Material tidak ditemukan.' }, { status: 404 });
    }
    material = found.data;
    targetKategori = material.kategori || targetKategori;
  }

  let resepQuery = admin.from('resep_produk').select('*').limit(200);
  if (targetKategori) resepQuery = resepQuery.ilike('kategori_material', targetKategori);

  const { data: resepRows, error: resepError } = await resepQuery;
  if (resepError) {
    return NextResponse.json(
      { error: `Gagal memuat jalur pemanfaatan: ${resepError.message}` },
      { status: 500 },
    );
  }

  let pathways = [];
  if (material) {
    pathways = rankPathwaysForMaterial(resepRows || [], material, limit);
  } else if (targetKategori) {
    pathways = pathwaysForCategory(resepRows || [], targetKategori, limit);
  } else if (q) {
    const words = q
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length >= 3);
    pathways = (resepRows || [])
      .filter((row) => {
        const haystack = [
          row.nama_produk,
          row.kategori_material,
          row.kata_kunci_material,
          row.langkah_singkat,
        ]
          .join(' ')
          .toLowerCase();
        return words.some((word) => haystack.includes(word));
      })
      .slice(0, limit)
      .map(toPathway);
  }

  return NextResponse.json(
    {
      material,
      kategori: targetKategori || null,
      pathways,
      sumber: 'resep_produk',
      catatan:
        'Jalur pemanfaatan berasal dari data resep referensi. Bukan jaminan hasil produksi atau klaim dampak lingkungan.',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
