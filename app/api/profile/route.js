import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { roleFromUser } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "profile-photos";
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const PHOTO_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authUser(admin, request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Tidak ada sesi login.", status: 401 };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return { error: "Sesi login tidak valid.", status: 401 };
  return { user: data.user };
}

function parsePhoto(dataUrl) {
  const match = String(dataUrl || "").match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/
  );

  if (!match) {
    return { error: "Foto wajib berupa JPG, PNG, atau WebP." };
  }

  const mime = match[1];
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");

  if (!buffer.length) return { error: "Data foto tidak valid." };
  if (buffer.length > MAX_PHOTO_BYTES) {
    return { error: "Ukuran foto maksimal 4 MB." };
  }

  return { mime, buffer, ext: PHOTO_MIME[mime] };
}

async function ensurePhotoBucket(admin) {
  const { data } = await admin.storage.getBucket(BUCKET).catch(() => ({ data: null }));
  if (data) return null;

  const { error } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_PHOTO_BYTES,
    allowedMimeTypes: Object.keys(PHOTO_MIME),
  });

  if (error && !/already exists/i.test(error.message)) {
    return `Gagal menyiapkan penyimpanan foto: ${error.message}`;
  }

  return null;
}

function isMissingColumn(error) {
  return (
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    /Could not find the '.*' column|column .* does not exist/i.test(error?.message || "")
  );
}

// Simpan nama, alamat, dan foto ke tabel pembeli / penjual.
async function saveProfileRow(admin, user, role, { name, address, avatarUrl }) {
  const isSeller = role === "seller";
  const table = isSeller ? "penjual" : "pembeli";

  const nameColumn = isSeller ? "nama_seller" : "nama_buyer";
  const emailColumn = isSeller ? "email_seller" : "email_buyer";
  const passwordColumn = isSeller ? "password_seller" : "password_buyer";
  const statusColumn = isSeller ? "status_seller" : "status_buyer";
  const addressColumn = isSeller ? "alamat_seller" : "alamat_buyer";

  const payload = {};
  if (name) payload[nameColumn] = name;
  if (address !== undefined) payload[addressColumn] = address;
  if (avatarUrl) payload.foto_url = avatarUrl;

  if (!Object.keys(payload).length) return;

  const update = async (data) =>
    admin.from(table).update(data).eq("auth_user_id", user.id).select().maybeSingle();

  let result = await update(payload);
  if (result.error && isMissingColumn(result.error) && "foto_url" in payload) {
    const { foto_url, ...withoutPhoto } = payload;
    if (!Object.keys(withoutPhoto).length) return;
    result = await update(withoutPhoto);
  }
  if (result.error) {
    throw new Error(`Gagal menyimpan profil: ${result.error.message}`);
  }
  if (result.data) return;

  const fallbackName =
    user.user_metadata?.nama || user.user_metadata?.full_name || user.email || "Pengguna CIRCLO";

  const insertPayload = {
    auth_user_id: user.id,
    [nameColumn]: name || fallbackName,
    [emailColumn]: user.email || `${user.id}@circlo.local`,
    [passwordColumn]: crypto.randomUUID(),
    [statusColumn]: true,
    [addressColumn]: address || "",
    ...(avatarUrl ? { foto_url: avatarUrl } : {}),
  };

  const insert = async (data) => admin.from(table).insert(data).select().maybeSingle();

  let created = await insert(insertPayload);
  if (created.error && isMissingColumn(created.error) && "foto_url" in insertPayload) {
    const { foto_url, ...withoutPhoto } = insertPayload;
    created = await insert(withoutPhoto);
  }
  if (created.error) {
    throw new Error(`Gagal membuat profil: ${created.error.message}`);
  }
}

export async function PATCH(request) {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi di server." },
      { status: 500 }
    );
  }

  const auth = await authUser(admin, request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { user } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Data permintaan tidak valid." }, { status: 400 });
  }

  const hasName = typeof body.fullName === "string";
  const hasPhone = typeof body.phone === "string";
  const hasAddress = typeof body.address === "string";
  const hasAvatar = typeof body.avatarDataUrl === "string" && body.avatarDataUrl.length > 0;

  const name = hasName ? body.fullName.trim() : undefined;
  const phone = hasPhone ? body.phone.replace(/[\s-]/g, "") : undefined;
  const address = hasAddress ? body.address.trim() : undefined;

  if (hasName && !name) {
    return NextResponse.json({ error: "Nama lengkap wajib diisi." }, { status: 400 });
  }

  if (hasPhone && phone && !/^(\+62|62|0)8[0-9]{8,12}$/.test(phone)) {
    return NextResponse.json(
      { error: "Nomor HP tidak valid. Contoh: 081234567890." },
      { status: 400 }
    );
  }

  let avatarUrl;
  if (hasAvatar) {
    const photo = parsePhoto(body.avatarDataUrl);
    if (photo.error) {
      return NextResponse.json({ error: photo.error }, { status: 400 });
    }

    const bucketError = await ensurePhotoBucket(admin);
    if (bucketError) {
      return NextResponse.json({ error: bucketError }, { status: 500 });
    }

    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const path = `${user.id}/${id}.${photo.ext}`;

    const uploaded = await admin.storage
      .from(BUCKET)
      .upload(path, photo.buffer, { contentType: photo.mime, upsert: false });

    if (uploaded.error) {
      return NextResponse.json(
        { error: `Gagal menyimpan foto: ${uploaded.error.message}` },
        { status: 500 }
      );
    }

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    avatarUrl = data?.publicUrl || undefined;
  }

  const metadata = { ...(user.user_metadata || {}) };
  if (hasName) metadata.full_name = name;
  if (hasPhone) metadata.phone = phone;
  if (hasAddress) metadata.address = address;
  if (avatarUrl) metadata.avatar_url = avatarUrl;

  const role = roleFromUser(user);

  try {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: metadata,
    });

    if (error) throw new Error(error.message);

    await saveProfileRow(admin, data.user || user, role, {
      name: hasName ? name : undefined,
      address: hasAddress ? address : undefined,
      avatarUrl,
    });

    return NextResponse.json({ user: data.user || user });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gagal menyimpan profil." },
      { status: 500 }
    );
  }
}
