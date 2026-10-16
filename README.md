# Upload Material CIRCLO

Halaman Upload Material (Gambar 1.7) dan AI Classification Result (Gambar 1.8) pada SRS CIRCLO,
dengan komponen AI sesuai SRS 3.3.3 (Python, Pandas, NumPy, Scikit-learn, Random Forest Regressor, XGBoost)
ditambah integrasi LLM Gemini.

## Arsitektur

Browser -> Next.js (Vercel) -> `/api/classify-material` -> CIRCLO AI Service (Python/FastAPI, Render)

AI Service menjalankan dua hal berurutan:

1. Klasifikasi material oleh Gemini (deskripsi + foto) menjadi jenis, kategori, kondisi, dimensi, dan skor kelayakan.
2. Estimasi harga per unit oleh Random Forest Regressor dan XGBoost (rata-rata keduanya), memakai hasil klasifikasi dan jumlah material.

API key Gemini hanya ada di AI Service. Next.js dan AI Service berbagi kunci `AI_SERVICE_KEY`.

## Isi

- `app/upload-material/page.jsx`: halaman (form, hasil klasifikasi, navbar, footer)
- `app/api/classify-material/route.js`: penghubung Next.js ke AI Service
- `ai-service/main.py`: FastAPI, pemanggil Gemini, endpoint `/analyze` dan `/health`
- `ai-service/price_model.py`: model Random Forest dan XGBoost (Pandas, NumPy, Scikit-learn)
- `ai-service/train_price_model.py`: pelatihan model dari `data/materials.csv`
- `ai-service/render.yaml`: konfigurasi deploy ke Render
- `public/images/`: logo dan foto gudang yang dipotong dari rancangan di laporan

## Menjalankan di komputer

Terminal 1 (AI Service):

    cd ai-service
    pip install -r requirements.txt
    cp .env.example .env        # isi GEMINI_API_KEY dan AI_SERVICE_KEY
    python train_price_model.py
    uvicorn main:app --port 8000

Terminal 2 (Next.js, di proyek Anda):

    npm i lucide-react
    cp .env.local.example .env.local    # AI_SERVICE_KEY harus sama dengan di ai-service/.env
    npm run dev

Salin folder `app/` dan `public/images/` ke proyek Next.js (App Router, Tailwind CSS), lalu buka `/upload-material`.
Jika navbar dan footer sudah ada di `layout.jsx`, hapus komponen `Navbar` dan `Footer` di `page.jsx`.

## Deploy

- Render: buat Blueprint dari `ai-service/render.yaml`, isi `GEMINI_API_KEY` dan `AI_SERVICE_KEY`.
- Vercel: isi `AI_SERVICE_URL` (URL dari Render) dan `AI_SERVICE_KEY`.

## Catatan

- Data latih harga yang dibuat otomatis hanya data contoh sintetis agar pipeline bisa dicoba, bukan harga pasar.
  Ganti `ai-service/data/materials.csv` dengan data asli (kolom: jenis_material, kategori, kondisi, quantity, harga_per_unit), lalu latih ulang.
- Hasil estimasi harga dikirim di field `estimasi_harga` pada respons, tetapi belum ditampilkan di UI agar tampilan tetap sama dengan laporan.
- Mode Edit (SRS 3.1.7): buka `/upload-material?id=<id material>`. Tombol Edit di My Materials cukup mengarah ke URL itu.
- `saveMaterial()`, `fetchMaterial()`, dan `updateMaterial()` di `page.jsx` masih kosong, sambungkan ke Supabase. Pengecekan role Seller di `route.js` masih TODO.
- Nama model Gemini bisa diganti lewat `GEMINI_MODEL`.
