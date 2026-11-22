
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { roleFromUser } from '@/lib/roles';

export const runtime = 'nodejs';

const BUCKET = 'material-photos';
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const VALIDATION_ERROR = 'Upload failed. Please check the data';
const SATUAN_VALID = ['kg', 'm2', 'pcs'];

const PHOTO_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Peta kota ke provinsi
const KOTA_PROVINSI = {
  Surabaya: 'Jawa Timur',
  Sidoarjo: 'Jawa Timur',
  Gresik: 'Jawa Timur',
  Malang: 'Jawa Timur',
  Mojokerto: 'Jawa Timur',
  Pasuruan: 'Jawa Timur',
  Probolinggo: 'Jawa Timur',
  Kediri: 'Jawa Timur',
  Blitar: 'Jawa Timur',
  Madiun: 'Jawa Timur',
  Jember: 'Jawa Timur',
  Banyuwangi: 'Jawa Timur',
  Batu: 'Jawa Timur',
  Lamongan: 'Jawa Timur',
  Tuban: 'Jawa Timur',
  Bojonegoro: 'Jawa Timur',
  Lumajang: 'Jawa Timur',
  Tulungagung: 'Jawa Timur',
  Nganjuk: 'Jawa Timur',
  Ngawi: 'Jawa Timur',
  Ponorogo: 'Jawa Timur',
  Situbondo: 'Jawa Timur',
  Bondowoso: 'Jawa Timur',
  Bangkalan: 'Jawa Timur',
  Sampang: 'Jawa Timur',
  Pamekasan: 'Jawa Timur',
  Sumenep: 'Jawa Timur',
  Jakarta: 'DKI Jakarta',
  Bandung: 'Jawa Barat',
  Bogor: 'Jawa Barat',
  Depok: 'Jawa Barat',
  Bekasi: 'Jawa Barat',
  Tangerang: 'Banten',
  Semarang: 'Jawa Tengah',
  Solo: 'Jawa Tengah',
  Yogyakarta: 'DI Yogyakarta',
  Denpasar: 'Bali',
  Medan: 'Sumatera Utara',
  Makassar: 'Sulawesi Selatan',
};

function locateKota(lokasi) {
  const raw = lokasi.trim();

  const key = Object.keys(KOTA_PROVINSI).find(
    (k) => k.toLowerCase() === raw.toLowerCase()
  );

  return {
    kota: key || raw,
    provinsi: key ? KOTA_PROVINSI[key] : null,
  };
}

// Koneksi Supabase khusus server
function adminClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const invalid = (detail) =>
  NextResponse.json(
    { error: VALIDATION_ERROR, detail },
    { status: 400 }
  );

// Validasi foto
function parsePhoto(dataUrl) {
  const match = String(dataUrl || '').match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/
  );

  if (!match) {
    return {
      error: 'Foto wajib berupa JPG, PNG, atau WebP.',
    };
  }

  const mime = match[1];

  const buffer = Buffer.from(
    match[2].replace(/\s/g, ''),
    'base64'
  );

  if (!buffer.length) {
    return { error: 'Data foto tidak valid.' };
  }

  if (buffer.length > MAX_PHOTO_BYTES) {
    return { error: 'Ukuran foto maksimal 4 MB.' };
  }

  return {
    mime,
    buffer,
    ext: PHOTO_MIME[mime],
  };
}

// Menyiapkan bucket penyimpanan foto
async function ensurePhotoBucket(admin) {
  const { data } = await admin.storage
    .getBucket(BUCKET)
    .catch(() => ({ data: null }));

  if (data) return null;

  const { error } = await admin.storage.createBucket(
    BUCKET,
    {
      public: true,
      fileSizeLimit: MAX_PHOTO_BYTES,
      allowedMimeTypes: Object.keys(PHOTO_MIME),
    }
  );

  if (error && !/already exists/i.test(error.message)) {
    return `Gagal menyiapkan penyimpanan foto: ${error.message}`;
  }

  return null;
}

// Mencari atau membuat data Seller
async function sellerFor(admin, user) {
  const found = await admin
    .from('penjual')
    .select('id_seller')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (found.error) {
    throw new Error(
      `Gagal membaca data penjual: ${found.error.message}`
    );
  }

  if (found.data) return found.data;

  const created = await admin
    .from('penjual')
    .insert({
      auth_user_id: user.id,
      nama_seller:
        user.user_metadata?.nama ||
        user.user_metadata?.full_name ||
        user.email,
      email_seller: user.email,
      password_seller: crypto.randomUUID(),
      status_seller: true,
      alamat_seller: '',
    })
    .select('id_seller')
    .single();

  if (created.error) {
    throw new Error(
      `Gagal membuat data penjual: ${created.error.message}`
    );
  }

  return created.data;
}

function isMissingSchemaColumn(error) {
  return (
    error?.code === 'PGRST204' ||
    /Could not find the '.*' column|column .* does not exist/i.test(
      error?.message || ''
    )
  );
}

// ===================================================
// POST: UPLOAD MATERIAL
// ===================================================
export async function POST(req) {
  const admin = adminClient();

  if (!admin) {
    return NextResponse.json(
      { error: 'Supabase belum dikonfigurasi di server.' },
      { status: 500 }
    );
  }

  const token = (
    req.headers.get('authorization') || ''
  ).replace(/^Bearer\s+/i, '');

  if (!token) {
    return NextResponse.json(
      { error: 'Tidak ada sesi login.' },
      { status: 401 }
    );
  }

  const { data: userData, error: userError } =
    await admin.auth.getUser(token);

  if (userError || !userData?.user) {
    return NextResponse.json(
      { error: 'Sesi login tidak valid.' },
      { status: 401 }
    );
  }

  const user = userData.user;

  if (roleFromUser(user) !== 'seller') {
    return NextResponse.json(
      {
        error: 'Hanya Seller yang dapat mengunggah material.',
      },
      { status: 403 }
    );
  }

  let body;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Request tidak valid.' },
      { status: 400 }
    );
  }

  const nama = String(body.nama || '').trim();
  const jenis = String(
    body.jenis_material || body.kategori || ''
  ).trim();
  const kategoriAi =
    String(body.kategori_ai || '').trim() || null;
  const satuan = String(body.satuan || 'kg').trim();
  const lokasi = String(body.lokasi || '').trim();
  const deskripsi = String(body.deskripsi || '').trim();
  const kondisiSeller = String(
    body.kondisi_seller || body.kondisi || ''
  ).trim();

  const stok = Number(body.jumlah);
  const harga = Number(body.harga);

  if (!nama) return invalid('Nama material wajib diisi.');
  if (!jenis) return invalid('Jenis material belum terdeteksi.');

  if (!SATUAN_VALID.includes(satuan)) {
    return invalid('Satuan harus kg, m2, atau pcs.');
  }

  if (!lokasi) return invalid('Lokasi wajib diisi.');

  if (deskripsi.length < 5) {
    return invalid('Deskripsi minimal 5 karakter.');
  }

  if (deskripsi.length > 2000) {
    return invalid('Deskripsi maksimal 2000 karakter.');
  }

  if (!kondisiSeller) {
    return invalid('Kondisi material wajib diisi.');
  }

  if (!Number.isInteger(stok) || stok <= 0) {
    return invalid(
      'Jumlah harus berupa angka bulat lebih dari 0.'
    );
  }

  if (
    String(body.harga ?? '').trim() === '' ||
    !Number.isFinite(harga) ||
    harga < 0
  ) {
    return invalid('Harga harus berupa angka 0 atau lebih.');
  }

  if (!body.foto) {
    return invalid('Foto material wajib diunggah.');
  }

  const photo = parsePhoto(body.foto);

  if (photo.error) return invalid(photo.error);

  const uploadToken =
    String(body.upload_token || '').trim() ||
    crypto.randomUUID();

  if (!/^[A-Za-z0-9-]{8,80}$/.test(uploadToken)) {
    return invalid('Token unggah tidak valid.');
  }

  let seller;

  try {
    seller = await sellerFor(admin, user);
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }

  // Cek apakah material sudah pernah diunggah
  const existing = await admin
    .from('material')
    .select('id_material,foto_url')
    .eq('id_seller', seller.id_seller)
    .eq('upload_token', uploadToken)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    if (isMissingSchemaColumn(existing.error)) {
      return NextResponse.json(
        {
          error:
            'Database material belum mendukung foto/kondisi. Jalankan migrasi supabase/upload_material_fields.sql.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: `Gagal memeriksa duplikasi: ${existing.error.message}`,
      },
      { status: 500 }
    );
  }

  if (existing.data) {
    return NextResponse.json({
      ok: true,
      id_material: existing.data.id_material,
      foto_url: existing.data.foto_url,
      duplicate: true,
    });
  }

  const bucketError = await ensurePhotoBucket(admin);

  if (bucketError) {
    return NextResponse.json(
      { error: bucketError },
      { status: 500 }
    );
  }

  const photoPath =
    `${seller.id_seller}/${uploadToken}.${photo.ext}`;

  const uploaded = await admin.storage
    .from(BUCKET)
    .upload(photoPath, photo.buffer, {
      contentType: photo.mime,
      upsert: true,
    });

  if (uploaded.error) {
    return NextResponse.json(
      {
        error: `Gagal menyimpan foto: ${uploaded.error.message}`,
      },
      { status: 500 }
    );
  }

  const fotoUrl = admin.storage
    .from(BUCKET)
    .getPublicUrl(photoPath).data.publicUrl;

  const { kota, provinsi } = locateKota(lokasi);

  const row = {
    id_seller: seller.id_seller,
    nama_material: nama,
    kategori: jenis,
    stok,
    harga,
    lokasi,
    kota,
    provinsi,
    satuan,
    deskripsi_material: deskripsi,
    status_material: true,
    kondisi_seller: kondisiSeller,
    foto_url: fotoUrl,
    kategori_ai: kategoriAi,
    upload_token: uploadToken,
  };

  const inserted = await admin
    .from('material')
    .insert(row)
    .select('id_material,foto_url')
    .single();

  if (inserted.error) {
    await admin.storage
      .from(BUCKET)
      .remove([photoPath])
      .catch(() => {});

    if (inserted.error.code === '23505') {
      const raced = await admin
        .from('material')
        .select('id_material,foto_url')
        .eq('id_seller', seller.id_seller)
        .eq('upload_token', uploadToken)
        .limit(1)
        .maybeSingle();

      if (raced.data) {
        return NextResponse.json({
          ok: true,
          id_material: raced.data.id_material,
          foto_url: raced.data.foto_url,
          duplicate: true,
        });
      }
    }

    if (isMissingSchemaColumn(inserted.error)) {
      return NextResponse.json(
        {
          error:
            'Database material belum mendukung foto/kondisi. Jalankan migrasi supabase/upload_material_fields.sql.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: `Gagal menyimpan material: ${inserted.error.message}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id_material: inserted.data.id_material,
    foto_url: inserted.data.foto_url,
  });
}

// ===================================================
// PATCH: UPDATE MATERIAL
// ===================================================
export async function PATCH(req) {
  const admin = adminClient();

  if (!admin) {
    return NextResponse.json(
      { error: 'Supabase belum dikonfigurasi di server.' },
      { status: 500 }
    );
  }

  const token = (
    req.headers.get('authorization') || ''
  ).replace(/^Bearer\s+/i, '');

  if (!token) {
    return NextResponse.json(
      { error: 'Tidak ada sesi login.' },
      { status: 401 }
    );
  }

  const { data: userData, error: userError } =
    await admin.auth.getUser(token);

  if (userError || !userData?.user) {
    return NextResponse.json(
      { error: 'Sesi login tidak valid.' },
      { status: 401 }
    );
  }

  const user = userData.user;

  if (roleFromUser(user) !== 'seller') {
    return NextResponse.json(
      {
        error: 'Hanya Seller yang dapat mengubah material.',
      },
      { status: 403 }
    );
  }

  let body;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Request tidak valid.' },
      { status: 400 }
    );
  }

  const rawId = body.id || body.id_material;

  if (!rawId) {
    return invalid('ID material wajib disertakan.');
  }

  const idNumeric = Number(rawId);
  const idMaterial = Number.isInteger(idNumeric) ? idNumeric : rawId;

  let seller;

  try {
    seller = await sellerFor(admin, user);
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }

  // Cari material yang akan diubah
  const { data: currentMaterial, error: currentError } = await admin
    .from('material')
    .select('*')
    .eq('id_material', idMaterial)
    .limit(1)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json(
      { error: `Gagal membaca material: ${currentError.message}` },
      { status: 500 }
    );
  }

  if (!currentMaterial) {
    return NextResponse.json(
      { error: 'Material tidak ditemukan.' },
      { status: 404 }
    );
  }

  // Pastikan material milik seller yang sedang login
  if (currentMaterial.id_seller !== seller.id_seller) {
    return NextResponse.json(
      { error: 'Anda tidak memiliki akses untuk mengubah material ini.' },
      { status: 403 }
    );
  }

  const nama =
    body.nama !== undefined
      ? String(body.nama).trim()
      : body.nama_material !== undefined
      ? String(body.nama_material).trim()
      : currentMaterial.nama_material;

  if (!nama) return invalid('Nama material wajib diisi.');

  const jenis =
    body.jenis_material !== undefined
      ? String(body.jenis_material).trim()
      : body.kategori !== undefined
      ? String(body.kategori).trim()
      : currentMaterial.kategori;

  if (!jenis) return invalid('Jenis material belum terdeteksi.');

  const deskripsi =
    body.deskripsi !== undefined
      ? String(body.deskripsi).trim()
      : body.deskripsi_material !== undefined
      ? String(body.deskripsi_material).trim()
      : currentMaterial.deskripsi_material;

  if (deskripsi.length < 5) {
    return invalid('Deskripsi minimal 5 karakter.');
  }

  if (deskripsi.length > 2000) {
    return invalid('Deskripsi maksimal 2000 karakter.');
  }

  const satuan =
    body.satuan !== undefined
      ? String(body.satuan).trim()
      : currentMaterial.satuan || 'kg';

  if (!SATUAN_VALID.includes(satuan)) {
    return invalid('Satuan harus kg, m2, atau pcs.');
  }

  const lokasi =
    body.lokasi !== undefined
      ? String(body.lokasi).trim()
      : currentMaterial.lokasi;

  if (!lokasi) return invalid('Lokasi wajib diisi.');

  const kondisiSeller =
    body.kondisi_seller !== undefined
      ? String(body.kondisi_seller).trim()
      : body.kondisi !== undefined
      ? String(body.kondisi).trim()
      : currentMaterial.kondisi_seller;

  if (!kondisiSeller) {
    return invalid('Kondisi material wajib diisi.');
  }

  let stok = currentMaterial.stok;
  if (body.jumlah !== undefined || body.stok !== undefined) {
    stok = Number(body.jumlah ?? body.stok);
    if (!Number.isInteger(stok) || stok <= 0) {
      return invalid('Jumlah harus berupa angka bulat lebih dari 0.');
    }
  }

  let harga = currentMaterial.harga;
  if (body.harga !== undefined) {
    harga = Number(body.harga);
    if (
      String(body.harga).trim() === '' ||
      !Number.isFinite(harga) ||
      harga < 0
    ) {
      return invalid('Harga harus berupa angka 0 atau lebih.');
    }
  }

  let kategoriAi = currentMaterial.kategori_ai;
  if (body.kategori_ai !== undefined) {
    kategoriAi = String(body.kategori_ai || '').trim() || null;
  }

  let fotoUrl = currentMaterial.foto_url;

  // Jika ada foto baru berupa data URL (base64)
  if (body.foto && typeof body.foto === 'string' && body.foto.startsWith('data:')) {
    const photo = parsePhoto(body.foto);

    if (photo.error) return invalid(photo.error);

    const bucketError = await ensurePhotoBucket(admin);

    if (bucketError) {
      return NextResponse.json(
        { error: bucketError },
        { status: 500 }
      );
    }

    const fileToken = crypto.randomUUID();
    const photoPath = `${seller.id_seller}/${idMaterial}-${fileToken}.${photo.ext}`;

    const uploaded = await admin.storage
      .from(BUCKET)
      .upload(photoPath, photo.buffer, {
        contentType: photo.mime,
        upsert: true,
      });

    if (uploaded.error) {
      return NextResponse.json(
        {
          error: `Gagal menyimpan foto: ${uploaded.error.message}`,
        },
        { status: 500 }
      );
    }

    fotoUrl = admin.storage
      .from(BUCKET)
      .getPublicUrl(photoPath).data.publicUrl;
  } else if (body.foto_url && typeof body.foto_url === 'string') {
    fotoUrl = body.foto_url;
  }

  const { kota, provinsi } = locateKota(lokasi);

  const updateData = {
    nama_material: nama,
    kategori: jenis,
    stok,
    harga,
    lokasi,
    kota,
    provinsi,
    satuan,
    deskripsi_material: deskripsi,
    kondisi_seller: kondisiSeller,
    foto_url: fotoUrl,
    kategori_ai: kategoriAi,
  };

  const { data: updated, error: updateError } = await admin
    .from('material')
    .update(updateData)
    .eq('id_material', idMaterial)
    .select('id_material, foto_url')
    .single();

  if (updateError) {
    if (isMissingSchemaColumn(updateError)) {
      return NextResponse.json(
        {
          error:
            'Database material belum mendukung foto/kondisi. Jalankan migrasi supabase/upload_material_fields.sql.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: `Gagal memperbarui material: ${updateError.message}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id_material: updated.id_material,
    foto_url: updated.foto_url,
  });
}

// ===================================================
// GET: MENAMPILKAN MATERIAL MILIK SELLER
// ===================================================
export async function GET(request) {
  try {
    const admin = adminClient();

    if (!admin) {
      return NextResponse.json(
        {
          error: 'Supabase belum dikonfigurasi di server.',
        },
        { status: 500 }
      );
    }

    // Ambil token autentikasi
    const token = (
      request.headers.get('authorization') || ''
    ).replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    // Validasi pengguna
    const { data: authData, error: authError } =
      await admin.auth.getUser(token);

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: 'Sesi login tidak valid.' },
        { status: 401 }
      );
    }

    const user = authData.user;

    // Hanya Seller yang boleh mengakses
    if (roleFromUser(user) !== 'seller') {
      return NextResponse.json(
        {
          error:
            'Hanya Seller yang dapat melihat material ini.',
        },
        { status: 403 }
      );
    }

    // Cari identitas Seller di database
    const { data: seller, error: sellerError } =
      await admin
        .from('penjual')
        .select('id_seller')
        .eq('auth_user_id', user.id)
        .limit(1)
        .maybeSingle();

    if (sellerError) {
      return NextResponse.json(
        {
          error: `Gagal membaca Seller: ${sellerError.message}`,
        },
        { status: 500 }
      );
    }

    // Seller belum memiliki data
    if (!seller) {
      return NextResponse.json({
        rows: [],
      });
    }

    // Ambil material milik Seller yang login
    const { data: materials, error: materialError } =
      await admin
        .from('material')
        .select('*')
        .eq('id_seller', seller.id_seller)
        .order('id_material', {
          ascending: false,
        });

    if (materialError) {
      return NextResponse.json(
        {
          error: `Gagal mengambil material: ${materialError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      rows: materials || [],
    });

  } catch (error) {
    console.error('GET MATERIAL ERROR:', error);

    return NextResponse.json(
      {
        error: 'Terjadi kesalahan saat membaca material.',
      },
      { status: 500 }
    );
  }
}
