"""Akses data katalog (Supabase) + logika wilayah. Fungsi murni mudah dites tanpa database."""
from __future__ import annotations

import re
from collections import Counter

from .slots import KOTA_PROVINSI


class SupabaseCatalog:
    """Ambil material & resep dari Supabase.
    Catatan 3a: seluruh material aktif diambil lalu difilter di Python (katalog dummy kecil).
    Saat katalog besar, pindahkan filter ke SQL/RPC."""

    MAT_COLS = ("id_material,id_seller,nama_material,kategori,stok,harga,"
                "kota,provinsi,satuan,deskripsi_material")

    def __init__(self, sb):
        self.sb = sb

    def materials(self) -> list[dict]:
        rows = (self.sb.table("material").select(self.MAT_COLS)
                .eq("status_material", True).gt("stok", 0).limit(5000).execute().data)
        for r in rows:
            r["harga"] = float(r["harga"])
            r["stok"] = float(r["stok"])
        return rows

    def resep(self) -> list[dict]:
        rows = self.sb.table("resep_produk").select("*").execute().data
        for r in rows:
            for k in ("bahan_per_unit", "persen_susut", "estimasi_modal"):
                if r.get(k) is not None:
                    r[k] = float(r[k])
        return rows


def _same(a, b) -> bool:
    return bool(a) and bool(b) and a.strip().lower() == b.strip().lower()


def resolve_provinsi(kota: str | None, materials: list[dict]) -> str | None:
    if not kota:
        return None
    for m in materials:
        if _same(m.get("kota"), kota) and m.get("provinsi"):
            return m["provinsi"]
    return KOTA_PROVINSI.get(kota)


def region_candidates(recipe: dict, materials: list[dict], kota, provinsi):
    """Material yang cocok untuk resep, diurutkan dari termurah.
    Prioritas wilayah: kota -> provinsi -> seluruh katalog.
    Return (kandidat, level) dengan level 'kota' | 'provinsi' | 'semua' | None."""
    kw = recipe.get("kata_kunci_material")
    pat = re.compile(kw, re.I) if kw else None
    matched = [
        m for m in materials
        if m["kategori"] == recipe["kategori_material"]
        and m["satuan"] == recipe["satuan"]
        and (pat is None or pat.search(m["nama_material"]))
    ]
    if not matched:
        return [], None
    for level, key, val in (("kota", "kota", kota), ("provinsi", "provinsi", provinsi)):
        if val:
            sub = [m for m in matched if _same(m.get(key), val)]
            if sub:
                return sorted(sub, key=lambda m: m["harga"]), level
    return sorted(matched, key=lambda m: m["harga"]), "semua"


def regional_summary(materials: list[dict], kota, provinsi, top_n: int = 2):
    """Kategori material paling banyak (jumlah listing) di wilayah user.
    Return (label_wilayah, level, [(kategori, jumlah), ...])."""
    for level, key, val in (("kota", "kota", kota), ("provinsi", "provinsi", provinsi)):
        if val:
            sub = [m for m in materials if _same(m.get(key), val)]
            if sub:
                c = Counter(m["kategori"] for m in sub)
                return val, level, c.most_common(top_n)
    c = Counter(m["kategori"] for m in materials)
    return "seluruh katalog", "semua", c.most_common(top_n)
