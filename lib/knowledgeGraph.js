// Helper Knowledge Graph pemanfaatan material.
// Sumber: tabel resep_produk (pengetahuan proses referensi), bukan klaim dampak.
// File ini murni (tanpa akses DB) agar bisa dipakai server component dan API route.

const STOP = new Set([
  'dari', 'bekas', 'sisa', 'dan', 'untuk', 'dengan', 'yang', 'atau', 'dalam',
  'pada', 'bahan', 'material', 'kain', 'plastik', 'kertas', 'kayu', 'logam',
  'kaca', 'karet', 'kulit', 'tekstil', 'organik', 'spanduk',
]);

function tokens(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP.has(word));
}

function samaKategori(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

export function toPathway(row) {
  if (!row) return null;
  return {
    id_resep: row.id_resep ?? null,
    kategori: row.kategori_material || null,
    produk: row.nama_produk || null,
    langkah: row.langkah_singkat || null,
    k3: row.catatan_k3 || null,
    kata_kunci: row.kata_kunci_material || null,
    bahan_per_unit:
      row.bahan_per_unit === null || row.bahan_per_unit === undefined
        ? null
        : Number(row.bahan_per_unit),
    satuan: row.satuan || null,
    persen_susut:
      row.persen_susut === null || row.persen_susut === undefined
        ? null
        : Number(row.persen_susut),
    estimasi_modal:
      row.estimasi_modal === null || row.estimasi_modal === undefined
        ? null
        : Number(row.estimasi_modal),
  };
}

export function pathwaysForCategory(rows, kategori, limit = 4) {
  const key = String(kategori || '').trim();
  if (!key) return [];
  return (rows || [])
    .filter((row) => samaKategori(row.kategori_material, key))
    .slice(0, Math.max(0, limit))
    .map(toPathway)
    .filter(Boolean);
}

export function rankPathwaysForMaterial(rows, material, limit = 4) {
  if (!material) return [];
  const kategori = material.kategori || material.kategori_material;
  const materialTokens = new Set(
    tokens(
      [
        material.nama_material,
        material.nama,
        material.deskripsi_material,
        material.deskripsi,
        kategori,
      ].join(' '),
    ),
  );

  const candidates = (rows || []).filter((row) => samaKategori(row.kategori_material, kategori));
  const scored = candidates.map((row) => {
    const keywords = String(row.kata_kunci_material || '')
      .split('|')
      .flatMap((keyword) => tokens(keyword));
    const unique = [...new Set(keywords)];
    const hits = unique.filter((keyword) => materialTokens.has(keyword)).length;
    return {
      row,
      score: hits / Math.max(1, unique.length),
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const modalA = Number(a.row.estimasi_modal || 0);
    const modalB = Number(b.row.estimasi_modal || 0);
    return modalA - modalB;
  });

  return scored
    .slice(0, Math.max(0, limit))
    .map((item) => toPathway(item.row))
    .filter(Boolean);
}
