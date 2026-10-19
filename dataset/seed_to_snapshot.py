"""Buat catalog_snapshot.json dari step2_seed_data.sql (tanpa perlu koneksi Supabase).

    python dataset/seed_to_snapshot.py step2_seed_data.sql dataset/catalog_snapshot.json
Kalau data di database sudah kamu ubah, pakai dump_catalog.py supaya snapshot sesuai database.
"""
import json
import re
import sys


def _tuples(block: str):
    """Parser mini untuk daftar tuple literal SQL: ('a', 1, 'b'), (...), ..."""
    block = "\n".join(l for l in block.splitlines() if not l.strip().startswith("--"))
    out, i, n = [], 0, len(block)
    while i < n:
        if block[i] != "(":
            i += 1
            continue
        i += 1
        row, tok = [], ""
        while i < n:
            c = block[i]
            if c == "'":
                s = ""
                i += 1
                while True:
                    if block[i] == "'" and i + 1 < n and block[i + 1] == "'":
                        s += "'"
                        i += 2
                    elif block[i] == "'":
                        i += 1
                        break
                    else:
                        s += block[i]
                        i += 1
                row.append(s)
                tok = ""
            elif c == ",":
                if tok.strip():
                    row.append(_lit(tok))
                tok = ""
                i += 1
            elif c == ")":
                if tok.strip():
                    row.append(_lit(tok))
                i += 1
                break
            else:
                tok += c
                i += 1
        out.append(row)
    return out


def _lit(t: str):
    t = t.strip()
    if t.lower() in ("true", "false"):
        return t.lower() == "true"
    if t.lower() == "null":
        return None
    return float(t) if "." in t else int(t)


def main(sql_path, out_path):
    sql = open(sql_path, encoding="utf-8").read()
    m = re.search(r"FROM \(VALUES(.*?)\) AS v\(", sql, re.S)
    mats = []
    for i, r in enumerate(_tuples(m.group(1)), 1):
        _, nama, kat, stok, harga, lokasi, desk, kota, prov, sat = r
        mats.append({"id_material": i, "id_seller": 1, "nama_material": nama, "kategori": kat,
                     "stok": float(stok), "harga": float(harga), "kota": kota, "provinsi": prov,
                     "satuan": sat, "deskripsi_material": desk})
    m = re.search(r"catatan_k3\)\s*VALUES(.*?)ON CONFLICT \(nama_produk\)", sql, re.S)
    resep = []
    for i, r in enumerate(_tuples(m.group(1)), 1):
        nama, kat, kw, bpu, sat, susut, modal, langkah, k3 = r
        resep.append({"id_resep": i, "nama_produk": nama, "kategori_material": kat,
                      "kata_kunci_material": kw, "bahan_per_unit": float(bpu), "satuan": sat,
                      "persen_susut": float(susut), "estimasi_modal": float(modal),
                      "langkah_singkat": langkah, "catatan_k3": k3})
    json.dump({"materials": mats, "resep": resep}, open(out_path, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"{len(mats)} material, {len(resep)} resep -> {out_path}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
