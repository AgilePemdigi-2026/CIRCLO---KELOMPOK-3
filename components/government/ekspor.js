import { STATUS_INFO } from "./format";

// Baris CSV tambahan untuk laporan per kota/kabupaten dan tren bulanan.
// Tambahkan ke array `baris` pada fungsi ekspor() di GovernmentDashboard.jsx.
export function barisLaporanWilayah(data) {
  if (!data.wilayah || !data.trenBulanan) return [];
  return [
    [],
    ["Laporan per Kota/Kabupaten"],
    [
      "Kota/Kabupaten", "Status", "Listing", "Listing Aktif", "Seller Aktif", "Material Terserap", "Rasio Serapan (%)",
      "Pesanan Berhasil", "Nilai Transaksi (Rp)", "Dialihkan (kg)", "Dialihkan (unit lain)", "Pesanan Batal",
      "Tingkat Batal (%)", "Stok Mengendap", "Kategori Dominan",
    ],
    ...data.wilayah.map((w) => [
      w.kota, STATUS_INFO[w.status]?.label || w.status, w.listing, w.listingAktif, w.seller, w.terserap, w.rasioSerapan,
      w.pesanan, Math.round(w.nilai), w.kg, w.unitLain, w.batal, w.tingkatBatal, w.mengendap, w.kategoriDominan,
    ]),
    [],
    ["Tren Bulanan"],
    ["Bulan", "Pesanan Berhasil", "Nilai Transaksi (Rp)", "Dialihkan (kg)"],
    ...data.trenBulanan.map((b) => [b.label, b.pesanan, Math.round(b.nilai), b.kg]),
  ];
}