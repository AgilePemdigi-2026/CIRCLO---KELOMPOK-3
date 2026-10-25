# CIRCLO (Kelompok 3): Upload Material, AI Classification, Profil

Bagian ini mencakup SRS 4.3 (Mengelola Profil), 4.6 (Upload dan Mengelola Material), dan 4.14 (AI Material Classification),
dengan komponen AI sesuai SRS 3.3.3 (Python, Pandas, NumPy, Scikit-learn, Random Forest Regressor, XGBoost) ditambah LLM Gemini.

## Arsitektur

Browser -> Next.js -> `/api/classify-material` -> CIRCLO AI Service (Python/FastAPI)

- Gemini hanya dipanggil dari `ai-service`, API key-nya tidak pernah ada di Next.js atau browser.
- `/api/classify-material` memeriksa sesi login: hanya Seller yang boleh memakainya (di production wajib login).
- Data material disimpan di Supabase (tabel dan bucket foto, lihat `supabase/materials.sql`).
  Tanpa konfigurasi Supabase aplikasi jalan dalam **mode demo**: data hanya di browser itu sendiri (localStorage).

## Halaman

| Alamat | Untuk | Keterangan |
| --- | --- | --- |
| `/upload-material` | Seller | Form material (Description, Quantity, Condition, Price, Location, Photo). Dengan `?id=` menjadi mode Edit. |
| `/upload-material/result` | Seller | Hasil klasifikasi AI, tombol Edit dan Confirm. |
| `/my-materials` | Seller | Daftar material milik Seller dan tombol Edit. |
| `/profile` | Semua peran | Lihat profil, Edit Profil (Full Name, Phone Number), Keluar. |

Menu navbar mengikuti peran (Buyer, Seller, Pemerintah) di `lib/roles.js`. Pesan sukses setelah redirect
(mis. "Material uploaded successfully") ditampilkan oleh `components/FlashBanner.js` yang sudah ada di Navbar,
jadi halaman milik anggota lain otomatis ikut menampilkannya.

## Menjalankan di komputer

Terminal 1 (AI Service):

    cd ai-service
    pip install -r requirements.txt
    cp .env.example .env        # isi GEMINI_API_KEY dan AI_SERVICE_KEY
    python train_price_model.py
    uvicorn main:app --port 8000

Terminal 2 (Next.js):

    npm install
    cp .env.example .env.local  # AI_SERVICE_KEY harus sama dengan di ai-service/.env
    npm run dev

Di PowerShell jika `npm` diblokir, pakai `npm.cmd`. Gunakan `npm run dev`, bukan `npm start`:
di mode production, halaman Seller menuntut login sungguhan dan akan mengalihkan ke `/login`.

Mencoba tampilan peran tanpa login (hanya `npm run dev`): tambahkan `?role=buyer`, `?role=seller`, atau
`?role=government` di URL, dan `?role=reset` untuk menghapusnya. Tanpa pilihan itu, mode dev dianggap Seller.

## Yang perlu disambungkan dengan anggota lain

- **Login/Register**: role dibaca dari `app_metadata.role` atau `user_metadata.role` (`buyer`, `seller`, `government`).
  Kalau role disimpan di tempat lain, ubah `roleFromUser()` di `lib/roles.js`. Alamat login lewat `NEXT_PUBLIC_LOGIN_PATH`.
  Role sebaiknya diisi dari server (`app_metadata`), jangan dari form Register, karena `user_metadata` bisa diubah pengguna.
- **Tabel `materials`**: nama kolom ada di satu fungsi, `toRow()` di `lib/materials.js`. Samakan dengan tabel di Supabase
  atau jalankan `supabase/materials.sql`. Ada kolom baru `kondisi_seller` (isian field Condition).
- **/dashboard dan /marketplace**: tombol Back di Profil menuju `/dashboard`, Confirm menuju `/marketplace`.
  `/marketplace` sekarang placeholder dan `/dashboard` belum ada.

## Catatan

- Data latih harga di `ai-service/data/materials.csv` adalah data contoh sintetis, bukan harga pasar. Estimasi harga
  dikirim di field `estimasi_harga` tetapi belum ditampilkan di UI agar tampilan tetap sama dengan SRS.
- Berkas `ai-service/models/price_rf.joblib` di repo dilatih dengan scikit-learn 1.9.1, sedangkan `requirements.txt`
  mengunci 1.5.2. Dimuat di versi yang berbeda, model memberi harga yang meleset. Latih ulang di lingkungan yang sama
  (`python train_price_model.py`, `render.yaml` sudah melakukannya saat build) atau samakan versinya.
- Model Gemini bawaan `ai-service` adalah `gemini-2.5-flash` (di `main.py`, `.env.example`, dan `render.yaml`).
  Nama model sering diganti Google, cek daftar terbaru di https://ai.google.dev/gemini-api/docs/changelog.
- Hasil pengujian skenario SRS ada di `LAPORAN_PENGUJIAN_SKENARIO.md`.
