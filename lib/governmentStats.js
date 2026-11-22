// Logika statistik Government Dashboard (read-only: hanya SELECT).
// Sumber data: tabel material, pesanan, detail_pesanan.

const GAGAL = /tolak|batal|gagal/i; // status pesanan yang tidak dihitung sebagai "terserap"
const HARI = 86400000;

export const PERIODE = {
  '7': 7,
  '30': 30,
  '90': 90,
  semua: null,
};

export function bacaFilter(searchParams) {
  const p = searchParams.get('periode') || 'semua';
  return {
    periode: Object.prototype.hasOwnProperty.call(PERIODE, p) ? p : 'semua',
    kategori: (searchParams.get('kategori') || '').trim(),
    kota: (searchParams.get('kota') || '').trim(),
  };
}

export async function ambilStatistik(filter = {}) {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Konfigurasi Supabase di server belum lengkap');
  const db = createClient(url, key, { auth: { persistSession: false } });

  const [m, p, d] = await Promise.all([
    db
      .from('material')
      .select('id_material,id_seller,kategori,stok,satuan,kota,provinsi,status_material')
      .limit(5000),
    db.from('pesanan').select('id_pesanan,status_pesanan,tgl_pesan').limit(10000),
    db
      .from('detail_pesanan')
      .select('id_pesanan,id_material,kuantitas_pesan,subtotal')
      .limit(20000),
  ]);
  const err = m.error || p.error || d.error;
  if (err) throw new Error(err.message);
  return olah(m.data || [], p.data || [], d.data || [], filter);
}

// Terima format "2026-11-02T04:58:56.869+00:00" maupun "+00" (tanpa menit).
function waktu(s) {
  let t = Date.parse(s);
  if (Number.isNaN(t) && typeof s === 'string') t = Date.parse(s.replace(/([+-]\d\d)$/, '$1:00'));
  return t;
}

function tren(sekarang, sebelum) {
  if (sebelum == null) return null; // periode "semua": tidak ada pembanding
  if (sebelum === 0) return sekarang > 0 ? { label: 'Baru', arah: 'naik' } : { label: 'Stabil', arah: 'tetap' };
  const persen = ((sekarang - sebelum) / sebelum) * 100;
  if (Math.abs(persen) < 1) return { label: 'Stabil', arah: 'tetap' };
  const teks = `${persen > 0 ? '+' : ''}${persen.toFixed(1).replace('.', ',')}%`;
  return { label: teks, arah: persen > 0 ? 'naik' : 'turun' };
}

// Fungsi murni (mudah dites): materi, pesanan, detail -> statistik
export function olah(materials, pesanan, detail, filter = {}, sekarang = Date.now()) {
  const periode = filter.periode || 'semua';
  const kategoriPilih = filter.kategori || '';
  const kotaPilih = filter.kota || '';
  const hari = PERIODE[periode] ?? null;

  const kategoriList = [...new Set(materials.map((x) => x.kategori).filter(Boolean))].sort();
  const kotaList = [...new Set(materials.map((x) => x.kota).filter(Boolean))].sort();

  const matF = materials.filter(
    (x) => (!kategoriPilih || x.kategori === kategoriPilih) && (!kotaPilih || x.kota === kotaPilih),
  );
  const matById = new Map(matF.map((x) => [x.id_material, x]));

  const valid = new Map(
    pesanan
      .filter((x) => !GAGAL.test(x.status_pesanan || ''))
      .map((x) => [x.id_pesanan, waktu(x.tgl_pesan)])
      .filter(([, t]) => !Number.isNaN(t)),
  );

  function ringkas(dari, sampai) {
    const ids = new Set();
    const dipesan = new Set();
    let kg = 0;
    let unitLain = 0;
    const perKota = new Map();
    const perKotaKg = new Map();
    const qtyKategori = new Map();
    for (const dt of detail) {
      const t = valid.get(dt.id_pesanan);
      const mat = matById.get(dt.id_material);
      if (t === undefined || !mat) continue;
      if (!(t >= dari && t < sampai)) continue;
      ids.add(dt.id_pesanan);
      dipesan.add(dt.id_material);
      const q = Number(dt.kuantitas_pesan) || 0;
      const satuan = (mat.satuan || 'unit').toLowerCase();
      const kategori = mat.kategori || 'Lainnya';
      const key = `${kategori}\u0000${satuan}`;
      const row = qtyKategori.get(key) || { kategori, satuan, qty: 0 };
      row.qty += q;
      qtyKategori.set(key, row);
      if (satuan === 'kg') kg += q;
      else unitLain += q;
      const k = mat.kota || 'Tidak diketahui';
      if (!perKota.has(k)) perKota.set(k, new Set());
      perKota.get(k).add(dt.id_pesanan);
      if (satuan === 'kg') perKotaKg.set(k, (perKotaKg.get(k) || 0) + q);
    }
    return { ids, dipesan, kg, unitLain, perKota, perKotaKg, qtyKategori };
  }

  const mulai = hari ? sekarang - hari * HARI : -Infinity;
  const kini = ringkas(mulai, Infinity);
  const lalu = hari ? ringkas(mulai - hari * HARI, mulai) : null;

  const aktif = (x) => x.status_material !== false && Number(x.stok) > 0;
  const aktifMat = matF.filter(aktif);
  const pengelola = new Set(aktifMat.map((x) => x.id_seller));
  const pengelolaLalu = null; // data historis seller tidak tersedia -> tampil "Stabil"

  // Neraca pasokan (stok saat ini) vs permintaan (kuantitas dipesan pada periode).
  // Satuan dipisah agar kg tidak dicampur dengan pcs/m2.
  const pasokan = new Map();
  let pasokanKg = 0;
  let pasokanUnitLain = 0;
  for (const x of aktifMat) {
    const kategori = x.kategori || 'Lainnya';
    const satuan = (x.satuan || 'unit').toLowerCase();
    const stok = Number(x.stok) || 0;
    if (satuan === 'kg') pasokanKg += stok;
    else pasokanUnitLain += stok;
    const key = `${kategori}\u0000${satuan}`;
    const row = pasokan.get(key) || { kategori, satuan, pasokan: 0, listing: 0 };
    row.pasokan += stok;
    row.listing += 1;
    pasokan.set(key, row);
  }

  const neracaMap = new Map();
  for (const [key, row] of pasokan) neracaMap.set(key, { ...row, permintaan: 0 });
  for (const [key, row] of kini.qtyKategori) {
    const base = neracaMap.get(key) || {
      kategori: row.kategori,
      satuan: row.satuan,
      pasokan: 0,
      listing: 0,
      permintaan: 0,
    };
    base.permintaan += row.qty;
    neracaMap.set(key, base);
  }
  const neraca = [...neracaMap.values()]
    .map((r) => ({ ...r, selisih: r.pasokan - r.permintaan }))
    .filter((r) => r.pasokan > 0 || r.permintaan > 0)
    .sort((a, b) => b.permintaan - a.permintaan || b.pasokan - a.pasokan);
  const peluang = neraca
    .filter((r) => r.permintaan > r.pasokan && r.permintaan > 0)
    .sort((a, b) => (b.permintaan - b.pasokan) - (a.permintaan - a.pasokan))
    .slice(0, 6);

  // Per kategori
  const perKategori = new Map();
  for (const x of matF) {
    const k = x.kategori || 'Lainnya';
    if (!perKategori.has(k)) perKategori.set(k, { kategori: k, listing: 0, terserap: 0 });
    const r = perKategori.get(k);
    r.listing += 1;
    if (kini.dipesan.has(x.id_material)) r.terserap += 1;
  }
  const kategori = [...perKategori.values()]
    .map((r) => ({ ...r, belum: r.listing - r.terserap }))
    .sort((a, b) => b.listing - a.listing);

  // Titik panas per kota
  const perKota = new Map();
  for (const x of matF) {
    const k = x.kota || 'Tidak diketahui';
    if (!perKota.has(k)) {
      perKota.set(k, {
        kota: k,
        provinsi: x.provinsi || '',
        listing: 0,
        pesanan: 0,
        pasokanKg: 0,
        permintaanKg: 0,
      });
    }
    perKota.get(k).listing += 1;
  }
  for (const x of aktifMat) {
    if ((x.satuan || '').toLowerCase() !== 'kg') continue;
    const k = x.kota || 'Tidak diketahui';
    const row = perKota.get(k);
    if (row) row.pasokanKg += Number(x.stok) || 0;
  }
  for (const [k, s] of kini.perKota) {
    if (!perKota.has(k)) {
      perKota.set(k, {
        kota: k,
        provinsi: '',
        listing: 0,
        pesanan: 0,
        pasokanKg: 0,
        permintaanKg: 0,
      });
    }
    perKota.get(k).pesanan = s.size;
  }
  for (const [k, qty] of kini.perKotaKg) {
    const row = perKota.get(k);
    if (row) row.permintaanKg += qty;
  }
  const hotspot = [...perKota.values()]
    .sort((a, b) => b.pesanan * 3 + b.listing - (a.pesanan * 3 + a.listing))
    .slice(0, 8);
  const peluangKota = [...perKota.values()]
    .filter((r) => r.permintaanKg > r.pasokanKg && r.permintaanKg > 0)
    .sort((a, b) => (b.permintaanKg - b.pasokanKg) - (a.permintaanKg - a.pasokanKg))
    .slice(0, 6);

  const totalListing = matF.length;
  const totalTerserap = kategori.reduce((s, r) => s + r.terserap, 0);

  const hasil = {
    filter: { periode, kategori: kategoriPilih, kota: kotaPilih },
    opsi: { kategori: kategoriList, kota: kotaList },
    kpi: {
      terserapKg: kini.kg,
      terserapUnitLain: kini.unitLain,
      trenKg: lalu ? tren(kini.kg, lalu.kg) : null,
      pesananBerhasil: kini.ids.size,
      trenPesanan: lalu ? tren(kini.ids.size, lalu.ids.size) : null,
      pengelolaAktif: pengelola.size,
      trenPengelola: pengelolaLalu,
      pasokanKg,
      pasokanUnitLain,
    },
    ringkasan: {
      totalListing,
      terserap: totalTerserap,
      belumTerserap: totalListing - totalTerserap,
    },
    kategori,
    hotspot,
    neraca,
    peluang,
    peluangKota,
    diperbarui: new Date(sekarang).toISOString(),
  };
  hasil.insightAturan = insightAturan(hasil);
  return hasil;
}

// Ringkasan otomatis tanpa AI (cadangan bila AI tidak tersedia)
export function insightAturan(s) {
  if (!s.ringkasan.totalListing) {
    return 'Belum ada data material untuk filter ini. Coba ubah periode, kategori, atau wilayah.';
  }
  const bagian = [];
  const atas = s.kategori[0];
  const porsi = Math.round((atas.listing / s.ringkasan.totalListing) * 100);
  bagian.push(`Kategori ${atas.kategori} mendominasi dengan ${atas.listing} listing (${porsi}% dari total).`);

  const nol = s.kategori.filter((r) => r.terserap === 0);
  if (s.kpi.pesananBerhasil === 0) {
    bagian.push('Belum ada pesanan berhasil pada periode ini, sehingga belum ada material yang terserap.');
  } else if (nol.length) {
    const nama = nol.slice(0, 3).map((r) => r.kategori).join(', ');
    bagian.push(`Kategori ${nama} belum ada yang terserap, jadi layak diprioritaskan untuk promosi atau pendampingan.`);
  } else {
    bagian.push(`${s.ringkasan.terserap} dari ${s.ringkasan.totalListing} listing sudah terserap.`);
  }
  const k = s.hotspot[0];
  if (k) bagian.push(`Aktivitas paling padat ada di ${k.kota} (${k.listing} listing, ${k.pesanan} pesanan).`);

  const p = s.peluang?.[0];
  if (p) {
    bagian.push(
      `Kebutuhan ${p.kategori} (${p.satuan}) ${p.permintaan} melebihi pasokan ${p.pasokan}, ` +
        'sehingga kategori ini layak diprioritaskan untuk penambahan pasokan atau pendampingan penjual.',
    );
  } else {
    const lebih = s.neraca
      ?.filter((r) => r.pasokan > r.permintaan && r.pasokan > 0)
      .sort((a, b) => (b.pasokan - b.permintaan) - (a.pasokan - a.permintaan))[0];
    if (lebih) {
      bagian.push(
        `Pasokan ${lebih.kategori} (${lebih.satuan}) ${lebih.pasokan} masih di atas permintaan ` +
          `${lebih.permintaan}; fokus berikutnya adalah mendorong penyerapan.`,
      );
    }
  }
  return bagian.join(' ');
}
