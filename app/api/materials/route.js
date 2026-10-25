import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Peta kota -> provinsi (sama dengan circlo_ai/slots.py) untuk mengisi kolom
// kota & provinsi pada tabel `material` yang dibaca CIRCLO AI.
const KOTA_PROVINSI = {
  Surabaya: 'Jawa Timur', Sidoarjo: 'Jawa Timur', Gresik: 'Jawa Timur',
  Malang: 'Jawa Timur', Mojokerto: 'Jawa Timur', Pasuruan: 'Jawa Timur',
  Probolinggo: 'Jawa Timur', Kediri: 'Jawa Timur', Blitar: 'Jawa Timur',
  Madiun: 'Jawa Timur', Jember: 'Jawa Timur', Banyuwangi: 'Jawa Timur',
  Batu: 'Jawa Timur', Lamongan: 'Jawa Timur', Tuban: 'Jawa Timur',
  Bojonegoro: 'Jawa Timur', Jombang: 'Jawa Timur', Lumajang: 'Jawa Timur',
  Tulungagung: 'Jawa Timur', Nganjuk: 'Jawa Timur', Ngawi: 'Jawa Timur',
  Ponorogo: 'Jawa Timur', Situbondo: 'Jawa Timur', Bondowoso: 'Jawa Timur',
  Bangkalan: 'Jawa Timur', Sampang: 'Jawa Timur', Pamekasan: 'Jawa Timur',
  Sumenep: 'Jawa Timur',
  Jakarta: 'DKI Jakarta', Bandung: 'Jawa Barat', Bogor: 'Jawa Barat',
  Depok: 'Jawa Barat', Bekasi: 'Jawa Barat', Tangerang: 'Banten',
  Semarang: 'Jawa Tengah', Solo: 'Jawa Tengah', Yogyakarta: 'DI Yogyakarta',
  Denpasar: 'Bali', Medan: 'Sumatera Utara', Makassar: 'Sulawesi Selatan',
};

const SATUAN_VALID = ['kg', 'm2', 'pcs'];

function locateKota(lokasi) {
  const raw = lokasi.trim();
  const key = Object.keys(KOTA_PROVINSI).find(
    (k) => k.toLowerCase() === raw.toLowerCase()
  );
  return { kota: key || raw, provinsi: key ? KOTA_PROVINSI[key] : null };
}

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(req) {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase belum dikonfigurasi di server.' }, { status: 500 });
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'Tidak ada sesi login.' }, { status: 401 });
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Sesi login tidak valid.' }, { status: 401 });
  }
  const user = userData.user;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 });
  }

  const nama = String(body.nama || '').trim();
  const kategori = String(body.kategori || '').trim();
  const satuan = String(body.satuan || '').trim();
  const lokasi = String(body.lokasi || '').trim();
  const deskripsi = String(body.deskripsi || '').trim();
  const stok = Math.round(Number(body.jumlah));
  const harga = Number(body.harga);

  if (!nama) return NextResponse.json({ error: 'Nama material wajib diisi.' }, { status: 400 });
  if (!kategori) return NextResponse.json({ error: 'Kategori material belum terdeteksi.' }, { status: 400 });
  if (!SATUAN_VALID.includes(satuan)) return NextResponse.json({ error: 'Satuan tidak valid.' }, { status: 400 });
  if (!lokasi) return NextResponse.json({ error: 'Lokasi wajib diisi.' }, { status: 400 });
  if (!(stok > 0)) return NextResponse.json({ error: 'Jumlah wajib lebih dari 0.' }, { status: 400 });
  if (!(harga >= 0)) return NextResponse.json({ error: 'Harga tidak valid.' }, { status: 400 });

  // Cari baris penjual milik akun ini; buat kalau belum ada (mis. akun lama).
  let seller = null;
  const found = await admin
    .from('penjual')
    .select('id_seller')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (found.error) {
    return NextResponse.json({ error: `Gagal membaca data penjual: ${found.error.message}` }, { status: 500 });
  }
  seller = found.data;

  if (!seller) {
    const created = await admin
      .from('penjual')
      .insert({
        auth_user_id: user.id,
        nama_seller: user.user_metadata?.nama || user.email,
        email_seller: user.email,
        password_seller: crypto.randomUUID(),
        status_seller: true,
        alamat_seller: '',
      })
      .select('id_seller')
      .single();
    if (created.error) {
      return NextResponse.json({ error: `Gagal membuat data penjual: ${created.error.message}` }, { status: 500 });
    }
    seller = created.data;
  }

  const { kota, provinsi } = locateKota(lokasi);

  const inserted = await admin
    .from('material')
    .insert({
      id_seller: seller.id_seller,
      nama_material: nama,
      kategori,
      stok,
      harga,
      lokasi,
      kota,
      provinsi,
      satuan,
      deskripsi_material: deskripsi || nama,
      status_material: true,
    })
    .select('id_material')
    .single();

  if (inserted.error) {
    return NextResponse.json({ error: `Gagal menyimpan material: ${inserted.error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id_material: inserted.data.id_material });
}
