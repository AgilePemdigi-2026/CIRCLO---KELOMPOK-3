# Upload Material CIRCLO (React/Next.js + Gemini)

Halaman Upload Material (Gambar 1.7) dan AI Classification Result (Gambar 1.8) pada SRS CIRCLO.

## Isi

- `app/upload-material/page.jsx`: halaman (form, hasil klasifikasi, navbar, footer)
- `app/api/classify-material/route.js`: pemanggil Gemini di sisi server
- `public/images/`: logo dan foto gudang yang dipotong dari rancangan di laporan
- `.env.local.example`: contoh konfigurasi

## Pemasangan

1. Salin folder `app/` dan `public/images/` ke proyek Next.js (App Router, Tailwind CSS).
2. Pasang ikon: `npm i lucide-react`
3. Salin `.env.local.example` menjadi `.env.local`, isi `GEMINI_API_KEY` dari Google AI Studio.
4. Jalankan `npm run dev`, buka `/upload-material`.

Jika navbar dan footer sudah ada di `layout.jsx`, hapus komponen `Navbar` dan `Footer` di `page.jsx`.

## Yang masih perlu disambungkan

- `saveMaterial()` di `page.jsx`: isi dengan insert ke Supabase (dan unggah foto ke Supabase Storage).
- `route.js`: tambahkan pengecekan sesi dan role Seller (ada penanda TODO).
- Nama model Gemini bisa diganti lewat `GEMINI_MODEL`.
