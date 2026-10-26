"""
Cek konsistensi berkas seed SQL TANPA database: batas kolom, duplikat, dan setiap resep punya material cocok.

    python dataset/check_seed.py step2_seed_data.sql seed_tambahan.sql
"""
import re
import sys
from collections import Counter

sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from seed_to_snapshot import parse_sql_files  # noqa: E402

KATEGORI_OK = {"Spanduk", "Plastik", "Tekstil", "Kulit", "Kayu", "Logam", "Kaca", "Karet", "Organik", "Kertas"}


def main(paths):
    mats, resep = parse_sql_files(paths)
    errs, warns = [], []

    seen = Counter((m["nama_material"].lower()) for m in mats)
    for n, c in seen.items():
        if c > 1:
            warns.append(f"nama material kembar di berkas berbeda (boleh jika penjual beda): {n} x{c}")
    for m in mats:
        if len(m["nama_material"]) > 100: errs.append(f"nama_material >100: {m['nama_material']}")
        if len(m["kategori"]) > 20: errs.append(f"kategori >20: {m['kategori']}")
        if len(m["satuan"]) > 10: errs.append(f"satuan >10: {m['satuan']}")
        if m["kategori"] not in KATEGORI_OK: warns.append(f"kategori baru (cek filter UI): {m['kategori']}")
        if m["stok"] < 0 or m["harga"] < 0: errs.append(f"stok/harga negatif: {m['nama_material']}")
        if not m["kota"] or not m["provinsi"]: errs.append(f"kota/provinsi kosong: {m['nama_material']}")

    names = Counter(r["nama_produk"] for r in resep)
    for n, c in names.items():
        if c > 1: errs.append(f"nama resep kembar: {n}")
    for r in resep:
        if len(r["nama_produk"]) > 100: errs.append(f"nama_produk >100: {r['nama_produk']}")
        if not 0 <= r["persen_susut"] < 1: errs.append(f"susut di luar 0..1: {r['nama_produk']}")
        if r["bahan_per_unit"] <= 0: errs.append(f"bahan_per_unit <= 0: {r['nama_produk']}")
        try:
            pat = re.compile(r["kata_kunci_material"], re.I)
        except re.error as e:
            errs.append(f"regex rusak di {r['nama_produk']}: {e}")
            continue
        cocok = [m for m in mats if m["kategori"] == r["kategori_material"]
                 and m["satuan"] == r["satuan"] and pat.search(m["nama_material"])]
        if not cocok:
            errs.append(f"TIDAK ADA material cocok untuk resep: {r['nama_produk']} "
                        f"({r['kategori_material']}, {r['satuan']}, /{r['kata_kunci_material']}/)")
        elif len(cocok) == 1:
            warns.append(f"hanya 1 material cocok: {r['nama_produk']} -> {cocok[0]['nama_material']}")

    pakai = set()
    for r in resep:
        pat = re.compile(r["kata_kunci_material"], re.I)
        for m in mats:
            if m["kategori"] == r["kategori_material"] and m["satuan"] == r["satuan"] and pat.search(m["nama_material"]):
                pakai.add(m["nama_material"])
    yatim = [m["nama_material"] for m in mats if m["nama_material"] not in pakai]

    print(f"{len(mats)} material, {len(resep)} resep dari {len(paths)} berkas")
    print("material per kota    :", dict(Counter(m["kota"] for m in mats).most_common()))
    print("material per kategori:", dict(Counter(m["kategori"] for m in mats).most_common()))
    print("resep per kategori   :", dict(Counter(r["kategori_material"] for r in resep).most_common()))
    print(f"material belum dipakai resep manapun: {len(yatim)}")
    for n in yatim: print("   -", n)
    for w in warns[:15]: print("  PERINGATAN:", w)
    for e in errs: print("  ERROR:", e)
    print("\nHASIL:", "LOLOS" if not errs else f"{len(errs)} ERROR")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
