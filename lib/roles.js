// Peran pengguna sesuai SRS: Buyer, Seller, Government/Pemerintah.
export const ROLES = ['buyer', 'seller', 'government'];

// Menu navbar per peran, disalin dari mockup SRS.
export const NAV_BY_ROLE = {
  buyer: {
    profileLabel: 'Profil',
    links: [
      { href: '/dashboard', label: 'Beranda' },
      { href: '/marketplace', label: 'Material Catalog' },
      { href: '/search', label: 'Cari Material' },
      { href: '/orders', label: 'Pesanan' },
      { href: '/chat', label: 'Chat' },
    ],
  },
  seller: {
    profileLabel: 'Profil',
    links: [
      { href: '/dashboard', label: 'Beranda' },
      { href: '/my-materials', label: 'My Materials' },
      { href: '/upload-material', label: 'Upload Material' },
      { href: '/orders', label: 'Pesanan' },
      { href: '/chat', label: 'Chat' },
    ],
  },
  government: {
    profileLabel: 'Akun',
    links: [
      { href: '/dashboard', label: 'Beranda' },
      { href: '/monitoring', label: 'Monitoring Ekosistem' },
    ],
  },
};

// Baca role dari data user Supabase. Nilai yang dikenali: buyer, seller, government.
// TODO (samakan dengan teman yang mengurus Login/Register): kalau role disimpan di tabel
// `profiles` dan bukan di metadata auth, ubah fungsi ini.
export function roleFromUser(user) {
  const raw = user?.app_metadata?.role ?? user?.user_metadata?.role;
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : null;
  if (value === 'pemerintah' || value === 'admin') return 'government';
  return ROLES.includes(value) ? value : null;
}
