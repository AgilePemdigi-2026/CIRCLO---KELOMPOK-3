# Laporan Pengujian Skenario (SRS 4.3, 4.6, 4.14)

Setiap skenario dijalankan satu per satu di browser sungguhan (Chromium otomatis), dengan `ai-service` yang asli
(`main.py` tidak diubah) dan **Gemini tiruan**, karena API key dan koneksi ke Google tidak tersedia di lingkungan uji.
Supabase juga **tiruan** (menirukan aturan RLS), jadi ini membuktikan kode kita, bukan database asli.

## Mode dev, tanpa Supabase (25 dari 25 lulus)

| Skenario SRS | Pemeriksaan | Hasil |
| --- | --- | --- |
| 4.6 Upload berhasil | Isi Description, Quantity, Condition, Price, Location, lampirkan foto, Submit: terlihat "AI Material Classification: Textile" | Lulus |
| | Confirm: berada di `/marketplace` dan terlihat "Material uploaded successfully" | Lulus |
| | Material baru muncul di My Materials | Lulus |
| 4.6 @update_material | Dari `/my-materials` ikuti "Edit", isi Quantity 100 dan Price 3500, Save | Lulus |
| | Berada di `/my-materials` dan terlihat "Material updated successfully"; daftar menampilkan 100 dan Rp3.500 | Lulus |
| 4.6 @upload_incomplete | Description "Sisa kain", Quantity kosong, Submit: "Upload failed. Please check the data", tetap di `/upload-material` | Lulus |
| 4.14 deskripsi tidak jelas | Pesan meminta Seller melengkapi deskripsi (REQ-104), tetap di form | Lulus |
| 4.14 klasifikasi ulang | Setelah deskripsi diubah, Submit ulang menghasilkan klasifikasi baru (REQ-103); tombol Edit di hasil mengembalikan isian | Lulus |
| 4.14 AI gagal | Pengguna diberi tahu, tidak ada hasil palsu (SRS 5.1) | Lulus |
| Edit + klasifikasi ulang | Edit, Submit, Confirm: kembali ke `/my-materials` dengan "Material updated successfully"; foto lama tidak dikirim ulang ke AI | Lulus |
| 4.3 @view_profile | Terlihat "Full Name: Maysha Akmala" dan "Email: buyer@gmail.com"; ikuti "Back": berada di `/dashboard` | Lulus |
| 4.3 @update_profile | Isi Full Name dan Phone Number, Save: "Profile updated successfully", tetap di `/profile` | Lulus |
| 4.3 @update_profile_failed | Full Name kosong, Save: "Profile update failed. Please complete all required fields.", tetap di `/profile` | Lulus |
| Hak akses | Buyer tidak bisa membuka Upload Material dan My Materials; menu Buyer tampil | Lulus |

## Mode production, Supabase dan auth tiruan (14 dari 14 lulus)

| Pemeriksaan | Hasil |
| --- | --- |
| `/api/classify-material`: tanpa login 401, Buyer 403, token palsu 401, Seller 200 | Lulus |
| Seller login: upload, Confirm, data masuk ke Supabase (termasuk `seller_id`, `kondisi_seller`, foto di folder Seller) | Lulus |
| My Materials membaca milik Seller; Edit dan Save mengubah baris yang benar | Lulus |
| Seller lain tidak bisa membuka edit material orang lain | Lulus |
| Buyer diblokir dari halaman Seller; tanpa login ketiga halaman dialihkan ke `/login` | Lulus |
| Profil menampilkan akun yang sedang login | Lulus |

## Pemeriksaan tambahan

Field dan tombol juga dicari lewat teks label, seperti langkah skenario ("I fill in 'Description'", "attach the file ... to 'Photo'", "I press 'Submit'"):
Description, Quantity, Condition, Price, Location, Photo, Full Name, Phone Number, serta tombol Submit dan Save semuanya ditemukan.
Sebelumnya field Photo belum terhubung ke labelnya; sudah diperbaiki.

## Yang belum terbukti

- Panggilan ke Gemini yang asli (butuh API key) dan ke database Supabase yang asli.
- Halaman login temanmu: peran dibaca dari sesi Supabase, tapi belum diuji dengan halaman login yang asli.
- Tampilan di HP. Mockup SRS hanya versi desktop.
- Teks "AI Material Classification: Textile" ditulis sebagai teks tersembunyi secara visual (untuk pembaca layar dan uji otomatis)
  agar tampilan tetap sama dengan mockup yang hanya menampilkan "AI Material Classification" dan "Jenis Material: Tekstil".
- Field Condition ada di skenario SRS 4.6 tetapi tidak ada di mockup. Ditambahkan di bawah Quantity dan Price.
- Halaman My Materials dan Profil tidak punya mockup di SRS, tampilannya mengikuti gaya halaman lain.
