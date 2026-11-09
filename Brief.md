# Task: Implementasi BDD Testing CIRCLO Sprint 1–2

Kerjakan implementasi BDD Testing untuk seluruh fitur Sprint 1 dan Sprint 2 berdasarkan kondisi aplikasi CIRCLO saat ini.

## 1. Cakupan Pengujian

**Sprint 1**
- Register Buyer dan Seller.
- Login Buyer, Seller, dan Government.
- Pencarian Material oleh Buyer.
- AI Assistant: mengirim pesan, menerima respons, dan memperoleh rekomendasi.
- Upload Material oleh Seller: mengisi detail material dan klasifikasi dengan bantuan AI.

**Sprint 2**
- Dashboard Buyer: Material Catalog dan Material Detail.
- Dashboard Seller: KPI Ringkasan Penjualan, Mengelola Catalog, dan Mengelola Pesanan.
- Checkout Buyer: menentukan jumlah pesanan, mengisi alamat, dan pembayaran.
- Profile Buyer dan Seller.
- Detail Pesanan Buyer.

## 2. Instruksi Pengerjaan

1. Periksa implementasi aktual aplikasi, termasuk halaman, komponen, API, autentikasi, dan database.
2. Buat atau perbarui file `.feature` menggunakan Gherkin dengan skenario yang sesuai alur pengguna sebenarnya.
3. Implementasikan step definitions dan test setup menggunakan Cucumber serta Playwright.
4. Gunakan data pengujian yang aman dan terisolasi. Jangan mengubah data produksi.
5. Jika fitur belum berjalan atau tidak sesuai kebutuhan, perbaiki implementasi aplikasinya.
6. Jangan mengubah expected result hanya agar pengujian PASS.
7. Pertahankan 7 skenario Chat yang sudah berhasil PASS, kecuali ditemukan masalah nyata.
8. Pastikan pengujian mencakup validasi input, kondisi berhasil, dan kondisi gagal yang relevan.

## 3. Target Akhir

- Seluruh cakupan Sprint 1 dan Sprint 2 memiliki skenario BDD.
- Seluruh skenario yang ditargetkan berhasil PASS.
- Tidak ada skenario yang sengaja di-skip atau dibuat selalu PASS.
- Test dapat dijalankan melalui `npm run test:bdd`.
- Dokumentasikan file yang dibuat/diubah, hasil pengujian, dan fitur yang belum dapat diuji beserta alasannya.

**Kerjakan langsung pada project yang tersedia. Jangan hanya memberikan contoh kode atau rencana pengerjaan.**