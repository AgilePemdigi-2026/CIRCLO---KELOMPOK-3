// Peran pengguna sesuai SRS: Buyer, Seller, Government/Pemerintah.
export const ROLES = ['buyer', 'seller', 'government'];

// Menu navbar per peran, disalin dari mockup SRS.
export const NAV_BY_ROLE = {
  buyer: {
    profileLabel: 'Profil',
    links: [
      { href: '/buyer', label: 'Beranda' },
      { href: '/marketplace', label: 'Material Catalog' },
      { href: '/cari-material', label: 'Cari Material' },
      { href: '/orders', label: 'Pesanan' },
      { href: '/chat', label: 'Chat' },
    ],
  },
  seller: {
    profileLabel: 'Profil',
    links: [
      { href: '/seller', label: 'Beranda' },
      { href: '/my-materials', label: 'My Materials' },
      { href: '/upload-material', label: 'Upload Material' },
      { href: '/orders', label: 'Pesanan' },
      { href: '/chat', label: 'Chat' },
    ],
  },
    government: {
    profileLabel: 'Akun',
    links: [
      { href: '/monitoring', label: 'Ringkasan' },
      { href: '/monitoring/material', label: 'Material' },
      { href: '/monitoring/wilayah', label: 'Wilayah' },
      { href: '/monitoring/rekomendasi', label: 'Rekomendasi' },
    ],
  },
};

// Halaman tujuan setelah login, per peran.
export const DASHBOARD_BY_ROLE = {
  buyer: '/buyer',
  seller: '/seller',
  government: '/monitoring',
};

export function dashboardPathFor(role) {
  return DASHBOARD_BY_ROLE[role] || DASHBOARD_BY_ROLE.buyer;
}

// Baca role dari data user Supabase. Nilai yang dikenali: buyer, seller, government.
// TODO (samakan dengan teman yang mengurus Login/Register): kalau role disimpan di tabel
// `profiles` dan bukan di metadata auth, ubah fungsi ini.
export function roleFromUser(user) {
  const raw = user?.app_metadata?.role ?? user?.user_metadata?.role;
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : null;
  if (value === 'pemerintah' || value === 'admin') return 'government';
  return ROLES.includes(value) ? value : null;
}

// Data profil untuk halaman /profile. Nama, telepon, alamat, dan URL foto profil disimpan
// di user_metadata (full_name, phone, address, avatar_url).
// Telepon sengaja BUKAN kolom `phone` bawaan Supabase Auth karena itu memicu verifikasi SMS.
// TODO: kalau teman memakai tabel `profiles`, ambil nama dan telepon dari tabel itu.
export function profileFromUser(user) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const email = user.email || '';
  const fallbackName = email ? email.split('@')[0] : 'Pengguna';
  return {
    fullName: (meta.full_name || meta.name || '').trim() || fallbackName,
    hasName: Boolean((meta.full_name || meta.name || '').trim()),
    email,
    phone: (meta.phone || '').trim(),
    address: (meta.address || '').trim(),
    avatarUrl: (meta.avatar_url || '').trim(),
    createdAt: user.created_at || null,
  };
}

export const ROLE_LABEL = { buyer: 'Buyer', seller: 'Seller', government: 'Pemerintah' };
