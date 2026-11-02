
const text = (value, fallback = 'Belum diketahui') => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return fallback;
  }
  return String(value).trim();
};

const list = (value) =>
  Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

export function normalizeAi(raw = {}) {
  const specifications = Array.isArray(raw.specifications)
    ? raw.specifications
        .map((item) => ({
          label: text(item?.label, ''),
          value: text(item?.value, ''),
        }))
        .filter((item) => item.label && item.value)
    : [];

  const category = text(
    raw.category || raw.kategori,
    'Lainnya'
  );

  const name = text(
    raw.name || raw.nama_material || raw.nama,
    'Material'
  );

  const condition = text(
    raw.condition || raw.kondisi,
    'Belum diketahui'
  );

  const confidence = text(raw.confidence, 'sedang').toLowerCase();

  const scoreMap = {
    tinggi: 90,
    sedang: 75,
    rendah: 55,
  };

  return {
    nama: name,
    jenis: category,
    kategori: category,
    subkategori: text(raw.subcategory),
    komposisi: text(raw.composition),
    kondisi: condition,

    dimensi: text(
      raw.dimensi_perkiraan ||
      specifications.find((item) =>
        /ukuran|dimensi/i.test(item.label)
      )?.value
    ),

    spesifikasi: specifications,
    potensi_pemanfaatan: list(raw.potential_uses),
    catatan_buyer: list(raw.buyer_notes),
    tags: list(raw.tags),

    perlu_konfirmasi: list(raw.perlu_konfirmasi),
    confidence,

    skor: Math.max(
      0,
      Math.min(
        100,
        Number(raw.skor_kelayakan) ||
          Number(raw.score) ||
          scoreMap[confidence] ||
          0
      )
    ),
  };
}

export function jenisInEnglish(jenis) {
  const mapping = {
    Tekstil: 'Textile',
    Plastik: 'Plastic',
    Kayu: 'Wood',
    Logam: 'Metal',
    Kaca: 'Glass',
    Karet: 'Rubber',
    Organik: 'Organic',
    Kertas: 'Paper',
    Kulit: 'Leather',
    Spanduk: 'Banner',
    Lainnya: 'Other',
  };

  return mapping[jenis] || jenis || 'Unknown';
}
