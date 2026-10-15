# CIRCLO | Frontend Upload Material (AI)

Bagian Aditya, Sprint 1 nomor 4: **Upload Material (Seller)**, yaitu form detail material dan hasil klasifikasi AI.
Stack mengikuti SRS: Next.js, JavaScript, Tailwind CSS.

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi GEMINI_API_KEY dari Google AI Studio
npm run dev
```

Buka http://localhost:3000 (otomatis ke /upload-material).

Tanpa API key, klasifikasi tetap jalan dalam mode demo (aturan kata kunci sederhana) dan halaman hasil menampilkan catatannya.

## Gemini

- Default: `gemini-3.8-flash`, model terbaru yang punya tier gratis (API key dari Google AI Studio, tanpa kartu kredit).
- Cadangan: `gemini-3.5-flash-lite` (`GEMINI_FALLBACK_MODEL`). Kalau model utama kena batas kuota (HTTP 429) atau ditolak, otomatis pindah ke sini, lalu ke mode demo.
- Tier gratis punya batas permintaan yang tidak dijamin Google dan angkanya terlihat di AI Studio. Konten di tier gratis juga bisa dipakai Google untuk meningkatkan produknya, jadi jangan kirim data sensitif.
- Punya akun berbayar? Isi `GEMINI_MODEL=gemini-4-argon` untuk Gemini terbaru (tidak tersedia di tier gratis).
- `GEMINI_THINKING_LEVEL` bawaan `low` (low, medium, high). Parameter `temperature`, `top_p`, `top_k` tidak dikirim karena sudah deprecated di model terbaru.
- Nama model sering diganti Google. Cek daftar terbaru di https://ai.google.dev/gemini-api/docs/changelog

## Struktur

- `app/upload-material/page.js` : form upload (Gambar 1.7 SRS)
- `app/upload-material/result/page.js` : hasil klasifikasi + Edit / Confirm (Gambar 1.8 SRS)
- `app/api/classify/route.js` : panggil Gemini (teks + foto), output JSON terstruktur
- `lib/materials.js` : tempat menyambung insert ke Supabase setelah Confirm (masih stub)
- `components/Navbar.js`, `components/Footer.js` : komponen bersama, bisa dipakai halaman teman

## Alur sesuai user story SRS 4.6

Submit data lengkap -> hasil klasifikasi -> Confirm -> "Material uploaded successfully" -> /marketplace.
Data tidak lengkap -> "Upload failed. Please check the data".

## Role (Buyer, Seller, Pemerintah)

- Menu navbar berubah sesuai role (`lib/roles.js`, diambil dari mockup SRS).
- Halaman Upload Material dan hasil klasifikasi hanya untuk Seller. Buyer dan Pemerintah melihat pesan "Halaman ini khusus Seller".
- Role dibaca dari sesi login Supabase (`app_metadata.role` atau `user_metadata.role`: buyer / seller / government). Samakan dengan teman yang mengurus Login/Register. Kalau role disimpan di tabel lain, ubah `roleFromUser()` di `lib/roles.js`.
- Tanpa login di production, pengguna dialihkan ke `/login` (ubah lewat `NEXT_PUBLIC_LOGIN_PATH`).
- Uji tampilan tanpa login (hanya `npm run dev`): tambahkan `?role=buyer`, `?role=seller`, atau `?role=government` ke URL, `?role=reset` untuk menghapusnya. Tanpa pilihan itu, mode dev dianggap Seller.
- Pembatasan di sisi browser hanya soal tampilan. Keamanan sebenarnya ada di aturan RLS Supabase (lihat `supabase/materials.sql`).
