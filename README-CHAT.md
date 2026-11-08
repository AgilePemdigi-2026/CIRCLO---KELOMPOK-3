# Fitur Chat Buyer–Seller (SRS 3.1.13 dan 4.10)

## Memasang
1. Salin semua folder/file di zip ini ke root proyek CIRCLO (struktur folder sudah sama).
2. Buka `package.json`, tambahkan 3 baris ini di `"scripts"` (baris `test:bdd` yang sudah ada tetap dipakai):
   ```
   "test:unit": "node --test tests/chat/*.test.mjs",
   "test:chat": "node scripts/run-chat-bdd.js",
   "dev:chat-demo": "node scripts/dev-chat-demo.js"
   ```
3. Jalankan `supabase/chat.sql` sekali di SQL Editor Supabase (membuat tabel `percakapan` dan `pesan_chat`).
4. Tambahkan `test-results/` ke `.gitignore` (tempat screenshot saat tes gagal).
5. Perlu Node 20.19+ atau 22+ untuk `npm run test:unit`.

## Menjalankan tes
- `npm run test:unit`  : tes logika, API, dan store Supabase (tanpa browser, tanpa jaringan).
- `npm run test:chat`  : BDD (Cucumber + Playwright) untuk role Buyer lalu Seller; server demo dinyalakan otomatis di port 3100.
- Manual: terminal 1 `npm run dev:chat-demo`, terminal 2 `BASE_URL=http://localhost:3000 npx cucumber-js` (ganti role dengan `CHAT_ROLE=seller`).
- Tambahan: `BASE_URL=http://localhost:3000 node tests/e2e/chat-extra.cjs`.
- Pertama kali: `npx playwright install chromium`.

## Melihat halamannya
`npm run dev:chat-demo`, buka `http://localhost:3000/chat?role=buyer` (atau `?role=seller`). Data demo mengikuti mockup.
Tanpa `CHAT_DEMO=1` dan dengan Supabase terpasang, halaman memakai data asli dan butuh login.

## Menyambungkan dari halaman lain (opsional)
- Tombol "Hubungi Seller" (`app/orders/[id]/page.jsx`) cukup mengarah ke `/chat?material=<id_material>`.
- Tombol "Hubungi Pembeli" milik Seller memakai `POST /api/percakapan` dengan `{ buyer_auth_id, buyer_name }`.

## Catatan versi gabungan
- Tabel `percakapan` dan `pesan_chat` versi lama (kolom `id_percakapan`/`id_buyer`) otomatis dihapus oleh `supabase/chat.sql`
  sebelum tabel baru dibuat. Jalankan file ini sekali di SQL Editor Supabase, lalu muat ulang `/chat`.
- Pesan "Terjadi kesalahan pada server" paling sering berarti tabel belum dibuat atau skemanya masih versi lama.
  Sekarang API mengirim pesan yang lebih jelas (503) dan, saat development, field `detail` berisi galat aslinya
  (lihat tab Network atau terminal `npm run dev`).
- `app/dashboard/page.jsx`: `/dashboard` mengarahkan ke `/buyer` atau `/seller` (dipakai skenario 1 SRS dan tautan Profil).
- Tombol Hubungi Seller membuka `/chat?material=<id>`; tombol Hubungi Pembeli membuka `/chat?buyer=<id_buyer>`.
  Pembeli harus sudah punya `auth_user_id` di tabel `pembeli`.
- Ukuran font dan avatar disamakan dengan mockup SRS (Gambar 1.13) pada lebar layar 1440 px.
- Hubungi Seller: tautan membuka `/chat?material=<id>` dan percakapan langsung terbuka. Kalau seller material belum punya
  `auth_user_id` di tabel `penjual`, halaman chat menampilkan alasannya (hubungkan akun seller dulu). Buyer dan Seller
  harus memakai dua akun berbeda.

## Status pesan (centang) dan Coba Lagi
Berlaku untuk pesan milik pengirim sendiri, di Buyer maupun Seller.
- **1 centang** (Terkirim): pesan sudah tersimpan di server, tetapi belum diterima aplikasi lawan bicara (jaringannya buruk atau aplikasinya belum dibuka).
- **2 centang** (Diterima): aplikasi lawan bicara sudah memuat pesan itu. Status diperbarui lewat polling 5 detik yang sudah ada, jadi centang kedua bisa muncul dengan jeda sampai 5 detik.
- **Mengirim…** (ikon jam): permintaan kirim masih berjalan.
- **Pesan gagal dikirim + tombol Coba Lagi**: jaringan putus, perangkat offline, atau tidak ada respons dalam 15 detik. Pesan disimpan di perangkat sehingga tombol tetap ada setelah halaman dimuat ulang. Coba Lagi memakai `client_id` yang sama, jadi pesan tidak menjadi ganda walau sebenarnya sudah sampai di server.

Cara kerja di server: kolom baru `pesan_chat.diterima_pada` terisi saat penerima memuat daftar percakapan atau membuka ruang percakapan.
Jalankan ulang `supabase/chat.sql` sekali di SQL Editor Supabase (aman diulang; pesan lama dianggap sudah diterima).
Sebelum kolom itu dibuat, chat tetap berjalan tetapi centang tidak naik dari satu ke dua.

## Zona waktu
Server menyimpan waktu pesan sebagai UTC. Tampilan jam, label "Hari Ini"/"Kemarin", dan pengelompokan hari memakai zona waktu perangkat masing-masing, jadi Buyer di Bali melihat WITA dan Seller di Surabaya melihat WIB untuk pesan yang sama.
Arahkan kursor ke jam pesan untuk melihat singkatannya (misalnya "11:42 WITA"). Di luar Indonesia tampil seperti "GMT+8".
