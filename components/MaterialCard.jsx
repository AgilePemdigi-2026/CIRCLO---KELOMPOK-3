// components/MaterialCard.jsx
import Link from 'next/link';
import MaterialImage from '@/components/MaterialImage';

// Helper to resolve category fallback image (same logic as other pages)
function gambarKategori(kategori) {
  const KATEGORI_GAMBAR = [
    'kaca', 'karet', 'kayu', 'kertas', 'kulit', 'logam',
    'organik', 'plastik', 'spanduk', 'tekstil',
  ];
  const slug = String(kategori || '').toLowerCase();
  return `/images/materials/${KATEGORI_GAMBAR.includes(slug) ? slug : 'lainnya'}.svg`;
}

export function MaterialCard({ material, large = false }) {
  const {
    id_material,
    nama_material,
    kategori,
    harga,
    satuan,
    stok,
    foto_url,
    tersedia,
  } = material;

  const imgSrc = foto_url ?? gambarKategori(kategori);
  const price = harga != null ? `Rp${Number(harga).toLocaleString('id-ID')}` : '-';
  const stock = stok != null ? `${Number(stok).toLocaleString('id-ID')} ${satuan}` : '-';

  return (
    <Link
      href={`/katalog/${id_material}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-[#26301a] shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3f6a0b] ${
        large ? 'min-h-[320px] sm:col-span-2 sm:row-span-2' : 'min-h-[200px]'
      }`}
    >
      {/* Image */}
      <div className="relative flex-1 overflow-hidden bg-[#e8efdc]">
        <MaterialImage
          materialId={id_material}
          materialName={nama_material}
          category={kategori}
          imageUrl={imgSrc}
          imageAlt={nama_material}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {kategori && (
          <span className="absolute right-3 top-3 rounded-full bg-[#d9f99d] px-3 py-1 text-xs font-bold text-[#3f6212]">
            {kategori}
          </span>
        )}
      </div>

      {/* Text strip */}
      <div className="flex items-end justify-between gap-3 p-4 text-white">
        <div className="min-w-0">
          <p className={`mt-2 truncate font-display font-semibold ${large ? 'text-2xl' : 'text-base'}`}>
            {nama_material}
          </p>
          <p className="mt-1 text-xs text-white/80">{stock}</p>
        </div>
        <p className="text-sm font-medium">{price}/{satuan}</p>
      </div>
    </Link>
  );
}
