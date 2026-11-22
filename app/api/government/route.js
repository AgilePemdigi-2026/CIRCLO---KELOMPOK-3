import { NextResponse } from 'next/server';
import { ambilStatistik, bacaFilter } from '@/lib/governmentStats';
import { cekPemerintah } from '@/lib/governmentAuth';
 
export const dynamic = 'force-dynamic';
 
// GET /api/government?periode=30&kategori=Plastik&kota=Surabaya
// Read-only: hanya membaca data, tidak mengubah apa pun. Hanya untuk role Pemerintah.
export async function GET(request) {
  const auth = await cekPemerintah();
  if (!auth.ok) return NextResponse.json({ error: auth.pesan }, { status: auth.status });
  try {
    const filter = bacaFilter(new URL(request.url).searchParams);
    const data = await ambilStatistik(filter);
    return NextResponse.json(data);
  } catch (e) {
    console.error('[government] gagal memuat statistik:', e?.message);
    return NextResponse.json({ error: 'Data gagal dimuat' }, { status: 500 });
  }
}
 