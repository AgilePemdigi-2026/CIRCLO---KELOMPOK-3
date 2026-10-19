# Dataset fine-tuning Circlo (Step 4)

Urutan kerja (jalankan dari folder induk proyek):

```powershell
# 0. Snapshot katalog (pilih salah satu)
python dataset/dump_catalog.py dataset/catalog_snapshot.json                       # dari Supabase
python dataset/seed_to_snapshot.py step2_seed_data.sql dataset/catalog_snapshot.json   # dari file SQL seed

# 1. Skenario (INPUT) - pakai embedder asli supaya rekomendasinya sama dengan aplikasi
python dataset/gen_scenarios.py --n 1100 --embedder e5

# 2. (opsional) tambah/ubah contoh emas, lalu cek
python dataset/make_gold.py

# 3. Jawaban ideal - coba kecil dulu
python dataset/gen_answers.py --dry-run
python dataset/gen_answers.py --limit 20
python dataset/validate.py dataset/answers.jsonl      # baca laporan, perbaiki prompt/contoh emas bila banyak FAIL
python dataset/gen_answers.py                         # sisanya (resume otomatis)

# 4. Validasi + kurasi manual (cek berkas *_review.jsonl dan sampel *_pass.jsonl), lalu split
python dataset/validate.py dataset/answers.jsonl --split
```

Hasil akhir: `dataset/train.jsonl`, `val.jsonl`, `test.jsonl` (format chat: system/user/assistant).
Tes offline: `python test_dataset.py` dan `python test_offline.py`.
