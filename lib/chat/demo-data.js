// Data awal mode demo (tanpa Supabase). Isinya mengikuti mockup Gambar 1.13 di SRS.

export const DEMO_USERS = {
  buyer: { id: 'demo-buyer', role: 'buyer', name: 'Pembeli Demo' },
  seller: { id: 'demo-seller', role: 'seller', name: 'EcoTextile Hub Surabaya' },
};

export const DEMO_MATERIALS = [
  { id_material: 1, id_seller: 'demo-seller', nama_material: 'Sisa Kain Katun Hitam', kategori: 'Sisa Industri', stok: 20, satuan: 'kg', status_material: true, foto_url: '/images/kain-katun-hitam.jpg' },
  { id_material: 2, id_seller: 'demo-seller-2', nama_material: 'Palet Kayu Bekas', kategori: 'Kayu', stok: 40, satuan: 'pcs', status_material: true, foto_url: '/images/palet-kayu-lebar.jpg' },
];

export const DEMO_SELLERS = {
  'demo-seller': { auth_user_id: 'demo-seller', nama: 'EcoTextile Hub Surabaya' },
  'demo-seller-2': { auth_user_id: 'demo-seller-2', nama: 'Eco Build Supplies' },
  'demo-seller-3': { auth_user_id: 'demo-seller-3', nama: 'Siti Rahma' },
};

function at(base, daysAgo, h, m) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - daysAgo, h, m, 0, 0);
  return d.toISOString();
}

export function demoSeed(now = new Date()) {
  const B = DEMO_USERS.buyer;
  const conversations = [
    { id: 'c-ecotextile', buyer_id: B.id, buyer_name: B.name, seller_id: 'demo-seller', seller_name: 'EcoTextile Hub Surabaya', seller_avatar: '/images/circlo-logo.png', id_material: 1 },
    { id: 'c-ecobuild', buyer_id: B.id, buyer_name: B.name, seller_id: 'demo-seller-2', seller_name: 'Eco Build Supplies', id_material: 2 },
    { id: 'c-siti', buyer_id: B.id, buyer_name: B.name, seller_id: 'demo-seller-3', seller_name: 'Siti Rahma', id_material: null },
  ];
  const messages = [
    ['c-ecotextile', 'seller', 'demo-seller', 'Halo! Saya melihat Anda tertarik dengan Sisa Kain Katun Hitam.', at(now, 0, 10, 30)],
    ['c-ecotextile', 'buyer', B.id, 'Ya, benar. Apakah seluruh batch 20kg masih tersedia? Saya membutuhkannya untuk lokakarya upcycling komunitas minggu depan.', at(now, 0, 10, 35)],
    ['c-ecotextile', 'seller', 'demo-seller', 'Biar saya cek di gudang sebentar. Kemarin ada yang tertarik tapi sepertinya belum diambil.', at(now, 0, 10, 40)],
    ['c-ecotextile', 'seller', 'demo-seller', 'Saya akan memeriksa gudang untuk tambahan Sisa Kain.', at(now, 0, 10, 42)],
    ['c-ecobuild', 'seller', 'demo-seller-2', 'Pesanan #492 Anda siap untuk diambil.', at(now, 1, 15, 5)],
    ['c-siti', 'buyer', B.id, 'Terima kasih atas respons cepatnya!', at(now, 3, 9, 20)],
  ].map(([cid, role, sid, text, created_at], i) => ({ id: `m-${i + 1}`, id_percakapan: cid, sender_id: sid, sender_role: role, text, client_id: null, created_at, delivered_at: created_at, read_at: created_at }));
  return { conversations, messages };
}
