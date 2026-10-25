# CIRCLO (Kelompok 3): Upload Material, AI Classification, Profil

Bagian ini mencakup SRS 4.3 (Mengelola Profil), 4.6 (Upload dan Mengelola Material), dan 4.14 (AI Material Classification),
dengan komponen AI sesuai SRS 3.3.3 (Python, Pandas, NumPy, Scikit-learn, Random Forest Regressor, XGBoost) ditambah LLM Gemini.
# ♻️ CIRCLO
### AI-Powered Recycled Material Marketplace

**Menghubungkan kebutuhan material daur ulang dengan solusi yang lebih cerdas.**

CIRCLO adalah platform berbasis web yang dirancang untuk membantu pengguna menemukan, mengenali, dan mengelola kebutuhan material daur ulang secara lebih mudah. Dengan menggabungkan marketplace dan kecerdasan buatan, CIRCLO bertujuan mendukung pemanfaatan kembali material serta membuka peluang ekonomi sirkular.

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
🌱 *Turn Waste Into Worth.*

---

## 🌍 About CIRCLO

Material yang dianggap tidak terpakai masih memiliki potensi untuk diolah menjadi produk bernilai. Namun, menemukan material yang sesuai, memahami karakteristiknya, dan menghubungkan pihak yang membutuhkan dengan penyedia material dapat menjadi tantangan tersendiri.

**CIRCLO hadir untuk menjembatani kebutuhan tersebut** melalui platform digital yang mengintegrasikan pencarian material, katalog, klasifikasi material, dan asisten AI.

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔎 **Cari Material dengan AI** | Membantu pengguna menemukan material daur ulang berdasarkan kebutuhan melalui interaksi dengan asisten AI. |
| 🛍️ **Marketplace Material** | Menyediakan pengalaman menjelajahi material dan kebutuhan terkait dalam satu platform. |
| 📦 **Katalog Material** | Menampilkan informasi material melalui halaman katalog dan detail material. |
| 🧠 **AI Material Assistant** | Mendukung pencarian dan pemberian rekomendasi material berdasarkan informasi yang tersedia. |
| 🧪 **Klasifikasi Material** | Menyediakan alur klasifikasi material melalui layanan backend. |
| 🔐 **Autentikasi Pengguna** | Menyediakan halaman login dan registrasi untuk mendukung akses pengguna. |
| 📤 **Upload Material** | Menyediakan alur pengunggahan material untuk diproses lebih lanjut. |

## 🛠️ Tech Stack

**Frontend**
- Next.js
- React
- Tailwind CSS
- Lucide React

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
**Backend & AI**
- Python
- API berbasis Python
- Pemrosesan dan rekomendasi material
- Integrasi layanan AI

**Database & Authentication**
- Supabase

## 🏗️ Project Architecture

CIRCLO menggunakan arsitektur yang memisahkan antarmuka pengguna, API aplikasi, dan pemrosesan AI.

```text
CIRCLO
├── app/                 # Halaman dan API Next.js
│   ├── api/             # API routes
│   ├── buyer/           # Halaman buyer
│   ├── cari-material/   # Pencarian material dengan AI
│   ├── katalog/         # Katalog dan detail material
│   ├── login/            # Autentikasi
│   ├── register/         # Registrasi
│   └── upload-material/ # Unggah material
├── components/          # Komponen antarmuka
├── lib/                 # Helper dan integrasi layanan
├── circlo_ai/           # Modul AI dan rekomendasi
├── dataset/             # Dataset dan data pendukung AI
├── circlo_api.py        # Backend API Python
├── circlo_llm.py        # Integrasi LLM
├── requirements.txt     # Dependensi Python
├── package.json         # Dependensi frontend
└── README.md
```

*Struktur di atas merupakan gambaran komponen utama proyek. Detail direktori dapat berubah mengikuti pengembangan.*

- Data latih harga di `ai-service/data/materials.csv` adalah data contoh sintetis, bukan harga pasar. Estimasi harga
  dikirim di field `estimasi_harga` tetapi belum ditampilkan di UI agar tampilan tetap sama dengan SRS.
- Berkas `ai-service/models/price_rf.joblib` di repo dilatih dengan scikit-learn 1.9.1, sedangkan `requirements.txt`
  mengunci 1.5.2. Dimuat di versi yang berbeda, model memberi harga yang meleset. Latih ulang di lingkungan yang sama
  (`python train_price_model.py`, `render.yaml` sudah melakukannya saat build) atau samakan versinya.
- Model Gemini bawaan `ai-service` adalah `gemini-2.5-flash` (di `main.py`, `.env.example`, dan `render.yaml`).
  Nama model sering diganti Google, cek daftar terbaru di https://ai.google.dev/gemini-api/docs/changelog.
- Hasil pengujian skenario SRS ada di `LAPORAN_PENGUJIAN_SKENARIO.md`.
## 🚀 Getting Started

Ikuti langkah berikut untuk menjalankan CIRCLO secara lokal.

### Prerequisites

Pastikan perangkat telah memiliki:
- Node.js dan npm
- Python
- Git
- Akun dan konfigurasi Supabase jika ingin menggunakan fitur yang memerlukannya

### 1. Clone Repository

```bash
git clone https://github.com/AgilePemdigi-2026/CIRCLO---KELOMPOK-3.git
cd CIRCLO---KELOMPOK-3
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Buat file `.env.local` di root proyek. Sesuaikan variabel dengan layanan yang digunakan.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

CIRCLO_AI_URL=http://127.0.0.1:8000
```

Tambahkan kredensial AI di konfigurasi backend sesuai kebutuhan. Gunakan secret milikmu sendiri dan jangan pernah memasukkan API key asli ke repository.

### 4. Install Python Dependencies

```bash
python -m venv .venv
```

Aktifkan virtual environment di Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Kemudian install dependensi:

```bash
pip install -r requirements.txt
```

### 5. Run the Application

Jalankan backend Python menggunakan entry point yang tersedia di proyek:

```bash
python circlo_api.py
```

Pastikan backend berjalan pada alamat yang dikonfigurasi di `CIRCLO_AI_URL`.

Buka terminal kedua, lalu jalankan frontend:

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

> Jika backend menggunakan perintah startup atau port yang berbeda, sesuaikan dengan konfigurasi aktual di `circlo_api.py`.

## 👥 Team CIRCLO

Developed collaboratively by the CIRCLO project team.

- **Adit**: Pengembangan fitur dan integrasi aplikasi.
- **Allya**: Pengembangan antarmuka dan autentikasi.
- **Rani**: Pengembangan fitur login dan autentikasi.
- **Maysha**: Pengembangan fitur AI, pencarian material, dan rekomendasi.

*Kontribusi di atas merangkum area pengerjaan berdasarkan integrasi branch; silakan sesuaikan dengan pembagian tugas resmi tim.*

## 🌱 Our Vision

Kami percaya bahwa material yang tidak lagi digunakan bukan berarti kehilangan nilainya.

Melalui CIRCLO, kami ingin membantu menciptakan ekosistem yang menghubungkan material, manusia, dan teknologi untuk mendukung pemanfaatan sumber daya secara lebih berkelanjutan.

**CIRCLO: Discover. Reuse. Create Value.** ♻️

---

<p align="center">
  Made with 💚 by Team CIRCLO
</p>
