import json
import shutil
from pathlib import Path

path = Path("dataset/answers.jsonl")
if not path.exists():
    raise SystemExit(
        "File dataset/answers.jsonl tidak ditemukan. "
        "Jalankan script ini dari folder root proyek CIRCLO---KELOMPOK-3."
    )

revisions = {
    "s00000": (
        "Estimasi modal awal untuk usaha scrub dan lilin aromaterapi dari ampas kopi "
        "sekitar Rp 2.000.000. Modal kamu Rp 2.000.000, jadi sesuai dengan estimasi awal. "
        "Sisihkan dana untuk uji coba produk, kemasan, dan kebutuhan tak terduga. "
        "Karena scrub termasuk produk kosmetik, gunakan bahan yang aman untuk kulit, "
        "uji kecocokan pada area kecil, dan perhatikan persyaratan izin edar sebelum dijual."
    ),
    "s00001": (
        "Untuk membuat patchwork pouch, pilah perca kain berdasarkan warna atau motif, "
        "lalu cuci dan keringkan agar tidak luntur. Potong kain menjadi bentuk persegi "
        "dengan ukuran seragam, jahit potongan hingga membentuk lembaran patchwork, "
        "kemudian tambahkan lapisan dalam dan jahit menjadi pouch. Gunakan gunting dan "
        "mesin jahit dengan hati-hati, jauhkan jari dari jarum, dan rapikan sisa benang. "
        "Bahan yang tersedia antara lain perca katun konveksi campur dan satin polyester "
        "dari Sidoarjo."
    ),
    "s00003": (
        "Maaf, aku belum bisa memberikan prakiraan cuaca langsung. CIRCLO berfokus pada "
        "ide usaha berbahan material sisa, rekomendasi produk, serta perhitungan bahan "
        "dan modal usaha."
    ),
    "s00007": (
        "Kamu ingin membuat yang mana: sapu dari botol PET bekas, scrub dan lilin "
        "aromaterapi dari ampas kopi, atau organizer dan kotak dari karton sisa? "
        "Pilih satu produk, ya."
    ),
    "s00014": (
        "Estimasi kebutuhan bahan untuk 1.000 unit adalah sekitar 470,6 kg, termasuk "
        "susut 15%. Stok yang tersedia 200 kg, sehingga masih kurang 270,6 kg. "
        "Rencana pembelian 200 kg dengan harga Rp 6.000/kg membutuhkan total biaya "
        "Rp 1.200.000. Biaya tersebut hanya mencakup pembelian yang direncanakan dan "
        "belum memenuhi seluruh kebutuhan bahan."
    ),
    "s00015": (
        "Untuk membuat patchwork pouch, pilah perca kain berdasarkan warna atau motif, "
        "lalu cuci dan keringkan agar tidak luntur. Potong kain menjadi persegi dengan "
        "ukuran seragam, jahit menjadi satu lembar patchwork, tambahkan lapisan dalam, "
        "lalu jahit sisi pouch dan pasang ritsleting. Gunakan gunting dan mesin jahit "
        "dengan hati-hati, jauhkan jari dari jarum, dan rapikan sisa benang. "
        "Bahan yang tersedia adalah perca katun konveksi campur dan satin polyester "
        "di Sidoarjo."
    ),
    "s00016": (
        "Untuk memulai usaha material sisa, tentukan produk dan buat prototipe kecil. "
        "Lakukan uji pasar melalui pre-order atau titip jual sebelum produksi besar. "
        "Hitung HPP dari bahan, tenaga, alat, kemasan, dan ongkir, lalu tentukan harga "
        "jual serta margin. Urus NIB melalui OSS karena izin tambahan bergantung pada "
        "jenis produk dan kegiatan usaha. Bangun brand yang menonjolkan pemanfaatan "
        "material sisa, lalu mulai pemasaran melalui marketplace atau media sosial "
        "dan tingkatkan produksi secara bertahap."
    ),
    "s00018": (
        "Estimasi modal awal untuk membuat sapu dari botol PET bekas sekitar "
        "Rp 2.000.000. Dengan modal Rp 3.000.000, anggaran tersebut cukup menurut "
        "estimasi awal dan masih tersisa sekitar Rp 1.000.000. Bahan yang tercatat "
        "adalah botol PET bening bekas bersih seharga Rp 4.500/kg di Surabaya. "
        "Sisihkan sisa anggaran untuk alat, gagang sapu, kemasan, dan biaya operasional "
        "yang belum tercakup."
    ),
    "s00019": (
        "Kamu memilih patchwork pouch dan tas dari perca kain. Estimasi modal awalnya "
        "sekitar Rp 3.500.000. Bahan yang tersedia adalah perca kain katun konveksi "
        "campur seharga Rp 8.000/kg dan perca kain satin polyester seharga Rp 9.000/kg "
        "di Sidoarjo. Cuci dan keringkan perca agar tidak luntur sebelum dijahit. "
        "Gunakan gunting dan mesin jahit dengan hati-hati, jauhkan jari dari jarum, "
        "dan rapikan sisa benang."
    ),
}

rows = []
with path.open("r", encoding="utf-8") as f:
    for line in f:
        if line.strip():
            rows.append(json.loads(line))

found = {r.get("id") for r in rows}
missing = set(revisions) - found
if missing:
    raise SystemExit(f"ID berikut tidak ditemukan: {', '.join(sorted(missing))}")

backup = path.with_suffix(".jsonl.bak")
if not backup.exists():
    shutil.copy2(path, backup)

for row in rows:
    if row.get("id") in revisions:
        row["answer"] = revisions[row["id"]]
        # Remove stale validation fields so the next validation recalculates them.
        row.pop("status", None)
        row.pop("reasons", None)

with path.open("w", encoding="utf-8", newline="\n") as f:
    for row in rows:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")

print(f"Berhasil memperbarui {len(revisions)} jawaban di {path}.")
print(f"Cadangan asli: {backup}")
print("Selanjutnya jalankan: python dataset/validate.py dataset/answers.jsonl")
