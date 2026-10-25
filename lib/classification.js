// Mengubah respons CIRCLO AI Service (ai-service/main.py) menjadi bentuk yang dipakai halaman.
// Nama field di sisi kiri mengikuti respons service (snake_case).
export function normalizeAi(raw = {}) {
  return {
    dapat: Boolean(raw.dapat_diklasifikasi),
    pesan: raw.pesan || '',
    nama: (raw.nama_material || '').trim() || 'Material',
    jenis: raw.jenis_material || 'Lainnya',
    kategori: raw.kategori || 'Lainnya',
    kondisi: raw.kondisi || 'Cukup',
    dimensi: (raw.dimensi_perkiraan || '').trim() || 'Tidak diketahui',
    skor: Math.max(0, Math.min(100, Math.round(Number(raw.skor_kelayakan) || 0))),
  };
}

// Skenario SRS 4.6 menulis hasil klasifikasi dalam bahasa Inggris ("AI Material Classification: Textile").
const EN_JENIS = {
  Kayu: 'Wood', Logam: 'Metal', Plastik: 'Plastic', Tekstil: 'Textile', 'Kertas & Kardus': 'Paper & Cardboard',
  Kaca: 'Glass', Karet: 'Rubber', Elektronik: 'Electronics', Organik: 'Organic', Lainnya: 'Other',
};
export const jenisInEnglish = (jenis) => EN_JENIS[jenis] || jenis;
