// Analisis per kota/kabupaten untuk Government Dashboard (read-only, fungsi murni).
// Dipisah dari lib/governmentStats.js supaya mudah digabung tanpa menimpa logika lain di sana.
//
// Cara pakai di olah() pada governmentStats.js, tepat sebelum menghitung insight:
//   tambahWilayah(hasil, materials, pesanan, detail, filter, sekarang);
//
// Data yang dibutuhkan:
//   material: id_material, id_seller, kategori, stok, satuan, kota, provinsi, status_material, created_at
//   pesanan: id_pesanan, status_pesanan, tgl_pesan
//   detail_pesanan: id_pesanan, id_material, kuantitas_pesan, subtotal

const GAGAL = /tolak|batal|gagal/i; // status pesanan yang tidak dihitung sebagai "terserap"
const HARI = 86400000;
const WIB = 7 * 3600000; // bulan dihitung menurut WIB
const UMUR_STOK_MENGENDAP = 30; // hari: listing lebih tua dari ini dan belum pernah dipesan = stok mengendap
const BULAN_TREN = 6;
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const PERIODE_HARI = { '7': 7, '30': 30, '90': 90, semua: null };

const adaKg = (satuan) => (satuan || '').toLowerCase() === 'kg';
const persen = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const rupiah = (n) => `Rp${Math.round(n).toLocaleString('id-ID')}`;

// Terima format "2026-11-02T04:58:56.869+00:00" maupun "+00" (tanpa menit).
function waktu(s) {
  let t = Date.parse(s);
  if (Number.isNaN(t) && typeof s === 'string') t = Date.parse(s.replace(/([+-]\d\d)$/, '$1:00'));
  return t;
}

function tren(sekarang, sebelum) {
  if (sebelum == null) return null; // periode "semua": tidak ada pembanding
  if (sebelum === 0) return sekarang > 0 ? { label: 'Baru', arah: 'naik' } : { label: 'Stabil', arah: 'tetap' };
  const p = ((sekarang - sebelum) / sebelum) * 100;
  if (Math.abs(p) < 1) return { label: 'Stabil', arah: 'tetap' };
  return { label: `${p > 0 ? '+' : ''}${p.toFixed(1).replace('.', ',')}%`, arah: p > 0 ? 'naik' : 'turun' };
}

function kunciBulan(t) {
  const d = new Date(t + WIB);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Status pasar satu wilayah dibandingkan rata-rata wilayah lain.
export function tentukanStatus(w, rataListing, rataPesanan) {
  if (w.pesanan === 0) return 'belum-aktif';
  if (w.listing < rataListing && w.pesanan >= rataPesanan) return 'butuh-pasokan';
  if (w.rasioSerapan >= 50) return 'sehat';
  if (w.rasioSerapan < 30 && w.listing >= rataListing) return 'surplus';
  return 'berkembang';
}

// Mengembalikan { kpi, wilayah, trenBulanan, provinsi }.
export function analisisWilayah(materials, pesanan, detail, filter = {}, sekarang = Date.now()) {
  const hari = PERIODE_HARI[filter.periode || 'semua'] ?? null;
  const kategoriPilih = filter.kategori || '';
  const kotaPilih = filter.kota || '';

  const matF = materials.filter(
    (x) => (!kategoriPilih || x.kategori === kategoriPilih) && (!kotaPilih || x.kota === kotaPilih),
  );
  const matById = new Map(matF.map((x) => [x.id_material, x]));

  const ubah = (daftar, cocok) =>
    new Map(
      daftar
        .filter((x) => cocok === GAGAL.test(x.status_pesanan || ''))
        .map((x) => [x.id_pesanan, waktu(x.tgl_pesan)])
        .filter(([, t]) => !Number.isNaN(t)),
    );
  const valid = ubah(pesanan, false);
  const gagal = ubah(pesanan, true);

  const wadah = () => ({ ids: new Set(), dipesan: new Set(), kg: 0, unitLain: 0, nilai: 0, batal: new Set() });

  function ringkas(dari, sampai) {
    const ids = new Set();
    const batal = new Set();
    let nilai = 0;
    const perKota = new Map();
    const ambil = (k) => {
      if (!perKota.has(k)) perKota.set(k, wadah());
      return perKota.get(k);
    };
    for (const dt of detail) {
      const mat = matById.get(dt.id_material);
      if (!mat) continue;
      const k = mat.kota || 'Tidak diketahui';
      const tBatal = gagal.get(dt.id_pesanan);
      if (tBatal !== undefined && tBatal >= dari && tBatal < sampai) {
        batal.add(dt.id_pesanan);
        ambil(k).batal.add(dt.id_pesanan);
        continue;
      }
      const t = valid.get(dt.id_pesanan);
      if (t === undefined || !(t >= dari && t < sampai)) continue;
      const q = Number(dt.kuantitas_pesan) || 0;
      const rp = Number(dt.subtotal) || 0;
      ids.add(dt.id_pesanan);
      nilai += rp;
      const w = ambil(k);
      w.ids.add(dt.id_pesanan);
      w.dipesan.add(dt.id_material);
      w.nilai += rp;
      if (adaKg(mat.satuan)) w.kg += q;
      else w.unitLain += q;
    }
    return { ids, batal, nilai, perKota };
  }

  const mulai = hari ? sekarang - hari * HARI : -Infinity;
  const kini = ringkas(mulai, Infinity);
  const lalu = hari ? ringkas(mulai - hari * HARI, mulai) : null;

  const aktif = (x) => x.status_material !== false && Number(x.stok) > 0;

  // Material yang pernah dipesan kapan pun (untuk stok mengendap, tidak terpengaruh periode)
  const pernahDipesan = new Set();
  for (const dt of detail) {
    if (valid.has(dt.id_pesanan) && matById.has(dt.id_material)) pernahDipesan.add(dt.id_material);
  }
  const mengendap = (x) => {
    if (!aktif(x) || pernahDipesan.has(x.id_material)) return false;
    const t = waktu(x.created_at);
    return !Number.isNaN(t) && sekarang - t > UMUR_STOK_MENGENDAP * HARI;
  };

  // Per kota/kabupaten
  const baris = new Map();
  const dapat = (k, provinsi = '') => {
    if (!baris.has(k)) {
      baris.set(k, { kota: k, provinsi, listing: 0, listingAktif: 0, sellers: new Set(), stokKg: 0, mengendap: 0, kat: new Map() });
    }
    const r = baris.get(k);
    if (!r.provinsi && provinsi) r.provinsi = provinsi;
    return r;
  };
  for (const x of matF) {
    const r = dapat(x.kota || 'Tidak diketahui', x.provinsi || '');
    r.listing += 1;
    const kat = x.kategori || 'Lainnya';
    r.kat.set(kat, (r.kat.get(kat) || 0) + 1);
    if (aktif(x)) {
      r.listingAktif += 1;
      r.sellers.add(x.id_seller);
      if (adaKg(x.satuan)) r.stokKg += Number(x.stok) || 0;
    }
    if (mengendap(x)) r.mengendap += 1;
  }
  for (const k of kini.perKota.keys()) dapat(k);

  const rows = [...baris.values()].map((r) => {
    const s = kini.perKota.get(r.kota) || wadah();
    const batal = s.batal.size;
    return {
      kota: r.kota,
      provinsi: r.provinsi,
      listing: r.listing,
      listingAktif: r.listingAktif,
      seller: r.sellers.size,
      stokKg: r.stokKg,
      terserap: s.dipesan.size,
      rasioSerapan: persen(s.dipesan.size, r.listing),
      pesanan: s.ids.size,
      kg: s.kg,
      unitLain: s.unitLain,
      nilai: s.nilai,
      batal,
      tingkatBatal: persen(batal, batal + s.ids.size),
      mengendap: r.mengendap,
      kategoriDominan: [...r.kat.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '',
    };
  });

  const rataListing = rows.length ? rows.reduce((a, r) => a + r.listing, 0) / rows.length : 0;
  const rataPesanan = rows.length ? rows.reduce((a, r) => a + r.pesanan, 0) / rows.length : 0;
  const wilayah = rows
    .map((r) => ({ ...r, status: tentukanStatus(r, rataListing, rataPesanan) }))
    .sort((a, b) => b.nilai - a.nilai || b.pesanan - a.pesanan || b.listing - a.listing);

  // Tren bulanan: 6 bulan terakhir, mengikuti filter kategori & wilayah, tidak mengikuti periode
  const bulan = [];
  const peta = new Map();
  const acuan = new Date(sekarang + WIB);
  for (let i = BULAN_TREN - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(acuan.getUTCFullYear(), acuan.getUTCMonth() - i, 1));
    const kunci = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const item = { kunci, label: `${NAMA_BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`, kg: 0, nilai: 0, _ids: new Set() };
    bulan.push(item);
    peta.set(kunci, item);
  }
  for (const dt of detail) {
    const mat = matById.get(dt.id_material);
    const t = valid.get(dt.id_pesanan);
    if (!mat || t === undefined) continue;
    const item = peta.get(kunciBulan(t));
    if (!item) continue;
    item._ids.add(dt.id_pesanan);
    item.nilai += Number(dt.subtotal) || 0;
    if (adaKg(mat.satuan)) item.kg += Number(dt.kuantitas_pesan) || 0;
  }
  const trenBulanan = bulan.map(({ _ids, ...b }) => ({ ...b, pesanan: _ids.size }));

  const totalListing = matF.length;
  const totalTerserap = wilayah.reduce((a, w) => a + w.terserap, 0);
  const totalBatal = kini.batal.size;

  return {
    kpi: {
      nilaiTransaksi: kini.nilai,
      trenNilai: lalu ? tren(kini.nilai, lalu.nilai) : null,
      rasioSerapan: persen(totalTerserap, totalListing),
      wilayahAktif: wilayah.filter((w) => w.pesanan > 0).length,
      totalWilayah: wilayah.length,
      tingkatBatal: persen(totalBatal, totalBatal + kini.ids.size),
      stokMengendap: wilayah.reduce((a, w) => a + w.mengendap, 0),
    },
    wilayah,
    trenBulanan,
    provinsi: [...new Set(materials.map((x) => x.provinsi).filter(Boolean))].sort(),
  };
}

// Menambahkan hasil analisis ke objek statistik yang sudah ada (mengubah `hasil` langsung).
export function tambahWilayah(hasil, materials, pesanan, detail, filter = {}, sekarang = Date.now()) {
  const a = analisisWilayah(materials, pesanan, detail, filter, sekarang);
  hasil.kpi = { ...hasil.kpi, ...a.kpi };
  hasil.wilayah = a.wilayah;
  hasil.trenBulanan = a.trenBulanan;
  hasil.opsi = { ...(hasil.opsi || {}), provinsi: a.provinsi };
  return hasil;
}

// Kalimat insight tambahan soal daerah. Gabungkan dengan insight yang sudah ada.
export function insightWilayah(s) {
  const w = s.wilayah || [];
  if (!w.length) return '';
  const bagian = [];
  const terbaik = w[0];
  if (terbaik.pesanan > 0) {
    bagian.push(
      `${terbaik.kota} memimpin dengan ${terbaik.pesanan} pesanan senilai ${rupiah(terbaik.nilai)} (serapan ${String(terbaik.rasioSerapan).replace('.', ',')}%).`,
    );
  }
  const nama = (st) => w.filter((x) => x.status === st).slice(0, 3).map((x) => x.kota).join(', ');
  if (nama('surplus')) bagian.push(`Pasokan menumpuk di ${nama('surplus')} sehingga perlu promosi dan pembeli industri.`);
  if (nama('butuh-pasokan')) bagian.push(`${nama('butuh-pasokan')} butuh tambahan pasokan dari seller baru.`);
  if (nama('belum-aktif')) bagian.push(`${nama('belum-aktif')} belum memiliki transaksi dan perlu pendampingan.`);
  return bagian.join(' ');
}