"""Akses data katalog (Supabase) + logika wilayah. Fungsi murni mudah dites tanpa database."""
from __future__ import annotations

import math
import re
from collections import Counter

from .slots import KOTA_PROVINSI

CATEGORY_SYNONYMS = {
    "Spanduk": ("spanduk", "banner", "baliho", "terpal", "mesh", "roll-up", "rollup"),
    "Plastik": ("plastik", "pet", "hdpe", "pp", "pvc", "botol", "galon", "jerigen",
                "ember", "karung", "sachet", "bubble", "pelet", "busa"),
    "Tekstil": ("tekstil", "kain", "perca", "denim", "katun", "kanvas", "satin",
                "fleece", "jersey", "benang", "goni", "batik", "lurik", "brokat", "tali"),
    "Kulit": ("kulit", "domba", "sapi", "sintetis", "pu"),
    "Kayu": ("kayu", "pallet", "palet", "papan", "balok", "bambu", "mdf", "triplek",
             "serbuk", "serutan", "slab", "sengon"),
    "Logam": ("logam", "besi", "plat", "siku", "hollow", "kaleng", "aluminium", "drum",
              "seng", "stainless", "velg", "roda", "kastor"),
    "Kaca": ("kaca", "gelas", "botol", "toples"),
    "Karet": ("karet", "ban", "sol", "eva", "poliuretan"),
    "Organik": ("organik", "kompos", "ampas", "kopi", "sekam", "jerami", "sabut",
                "tempurung", "kulit buah", "kulit jeruk", "cangkang", "eceng", "pelepah",
                "bonggol", "daun", "kotoran", "ampas tahu", "cascara"),
    "Kertas": ("kertas", "kardus", "karton", "hvs", "koran", "majalah", "kraft",
               "egg tray", "tube core", "tetra pak"),
}

SEARCH_STOPWORDS = {
    "aku", "saya", "mau", "ingin", "pengen", "cari", "carikan", "butuh", "butuhkan",
    "material", "materials", "produk", "produknya", "item", "katalog", "katalognya",
    "daftar", "tampilkan", "lihat", "kasih", "beri", "minta", "semua", "seluruh",
    "yang", "dan", "atau", "untuk", "buat", "membuat", "dengan", "di", "dari",
    "kota", "kabupaten", "kab", "provinsi", "wilayah", "daerah", "sekitar", "hanya",
    "saja", "bukan", "cuma", "jangan", "lain", "lainnya", "lagi", "dong", "ya",
    "min", "kak", "tolong", "ada", "apakah", "apa", "berapa", "jumlah", "total",
    "tersedia", "aktif", "stok", "harga", "anggaran", "budget", "modal", "rp",
    "tadi", "kok", "cuma", "sedikit", "banyak", "lebih", "lain", "lainnya",
    "cuman", "hanya", "sebenarnya", "sih", "deh", "nih", "tuh", "itu", "ini",
    "maksudku", "maksud", "mauku", "maunya", "tampilkan", "lihat", "kasih",
    "beri", "carikan", "cari", "mencari", "pesan", "beli", "pilih", "nomor",
    "murah", "termurah", "terjangkau", "mahal", "berkualitas", "kualitas",
    "bagus", "baik", "terbaik", "bawah", "dibawah", "maks", "maksimal",
    "sampai", "sampai dengan", "harga", "rp", "juta", "ribu", "rb",
}

def normalize_text(text: str) -> str:
    """Normalisasi teks untuk pencocokan fleksibel."""
    if not text:
        return ""
    return re.sub(r"[^\w\s]", " ", text.lower()).strip()


_LOCATION_WORDS = {
    word
    for name in KOTA_PROVINSI
    for word in normalize_text(name).split()
} | {
    word
    for prov in KOTA_PROVINSI.values()
    for word in normalize_text(prov).split()
}


def keyword_overlap(query: str, target: str) -> float:
    """Hitung overlap kata kunci antara query dan target (0-1)."""
    q_words = set(normalize_text(query).split())
    t_words = set(normalize_text(target).split())
    if not q_words or not t_words:
        return 0.0
    return len(q_words & t_words) / len(q_words | t_words)


def query_tokens(text: str) -> list[str]:
    return [w for w in normalize_text(text).split()
            if len(w) >= 2 and w not in SEARCH_STOPWORDS
            and w not in _LOCATION_WORDS
            and not re.fullmatch(r"\d+(?:[.,]\d+)?(?:rb|ribu|k|jt|juta)?", w)]


def categories_for_query(text: str) -> set[str]:
    tokens = set(normalize_text(text).split())
    found = set()
    for category, words in CATEGORY_SYNONYMS.items():
        if category.lower() in tokens:
            found.add(category)
            continue
        if any(w in tokens for w in words):
            found.add(category)
    return found


def catalog_stats(all_rows: list[dict], eligible: list[dict] | None = None) -> dict:
    eligible = eligible if eligible is not None else [
        r for r in all_rows
        if r.get("status_material", True) and float(r.get("stok") or 0) > 0
    ]
    return {
        "total_katalog": len(all_rows),
        "total_aktif": sum(1 for r in all_rows if r.get("status_material", True)),
        "total_tersedia": len(eligible),
        "kota": dict(Counter(r.get("kota") or "Tidak diketahui" for r in eligible)),
        "kategori": dict(Counter(r.get("kategori") or "Lainnya" for r in eligible)),
        "satuan": dict(Counter(r.get("satuan") or "-" for r in eligible)),
    }


def material_search(
    materials: list[dict],
    query: str = "",
    kota: str | None = None,
    provinsi: str | None = None,
    scope: str = "all",
    kategori: str | None = None,
    max_harga: float | None = None,
    limit: int = 12,
) -> dict:
    tokens = query_tokens(query)
    wanted_categories = categories_for_query(query)
    if kategori:
        wanted_categories.add(kategori)

    rows = []
    for m in materials:
        if not m.get("status_material", True):
            continue
        stok = float(m.get("stok") or 0)
        harga = float(m.get("harga") or 0)
        if stok <= 0:
            continue
        if scope == "kota" and kota and not _same(m.get("kota"), kota):
            continue
        if scope == "provinsi" and provinsi and not _same(m.get("provinsi"), provinsi):
            continue
        if wanted_categories and m.get("kategori") not in wanted_categories:
            continue
        if max_harga is not None and harga > max_harga:
            continue

        name = normalize_text(m.get("nama_material", ""))
        desc = normalize_text(m.get("deskripsi_material", ""))
        cat = normalize_text(m.get("kategori", ""))
        name_tokens = set(name.split())
        desc_tokens = set(desc.split())
        cat_tokens = set(cat.split())

        score = 0.0
        matched = 0
        for tok in tokens:
            hit = 0.0
            if tok in name_tokens:
                hit += 3.0
            if tok in desc_tokens:
                hit += 1.0
            if tok in cat_tokens:
                hit += 1.5
            if hit:
                matched += 1
            score += hit
        if tokens and matched == 0:
            continue
        if wanted_categories and m.get("kategori") in wanted_categories:
            score += 2.0

        item = dict(m)
        item["_search_score"] = score
        item["_matched_tokens"] = matched
        if max_harga is not None and harga > 0:
            item["_affordable_qty"] = math.floor(max_harga / harga)
            item["_budget_limited_by"] = "anggaran"
        rows.append(item)

    rows.sort(key=lambda m: (-m["_search_score"], float(m["harga"]), m["nama_material"]))
    total = len(rows)
    return {
        "items": rows[:max(0, limit)],
        "total": total,
        "limit": max(0, limit),
        "query": query,
        "kategori": sorted(wanted_categories) if wanted_categories else [],
        "scope": scope,
        "kota": kota,
        "provinsi": provinsi,
        "max_harga": max_harga,
    }


def alternative_search(
    materials: list[dict],
    kategori: str | None = None,
    kota: str | None = None,
    provinsi: str | None = None,
    limit: int = 4,
) -> list[dict]:
    scope = "kota" if kota else ("provinsi" if provinsi else "all")
    related = []
    if kategori:
        for cat, words in CATEGORY_SYNONYMS.items():
            if cat == kategori:
                related = [cat]
                break
    if not related:
        cities = set()
        for m in materials:
            if kota and _same(m.get("kota"), kota):
                cities.add(m["kategori"])
        related = [c for c in cities][:2]
    if not related:
        common = Counter(m["kategori"] for m in materials).most_common(3)
        related = [c for c, _ in common]
    out = []
    for cat in related:
        found = material_search(materials, kota=kota, provinsi=provinsi, scope=scope,
                                kategori=cat, limit=limit)
        for m in found["items"]:
            if all(m["id_material"] != x["id_material"] for x in out):
                m = dict(m)
                m["_match_type"] = "alternatif"
                out.append(m)
            if len(out) >= limit:
                break
        if len(out) >= limit:
            break
    if len(out) < limit:
        found = material_search(materials, kota=kota, provinsi=provinsi, scope=scope,
                                limit=limit * 2)
        for m in found["items"]:
            if all(m["id_material"] != x["id_material"] for x in out):
                m = dict(m)
                m["_match_type"] = "alternatif"
                out.append(m)
            if len(out) >= limit:
                break
    return out[:limit]


class SupabaseCatalog:
    """Ambil material & resep dari Supabase.
    Catatan 3a: seluruh material aktif diambil lalu difilter di Python (katalog dummy kecil).
    Saat katalog besar, pindahkan filter ke SQL/RPC."""

    MAT_COLS = ("id_material,id_seller,nama_material,kategori,stok,harga,"
                "kota,provinsi,satuan,lokasi,deskripsi_material,status_material")

    def __init__(self, sb):
        self.sb = sb

    def _fetch_all(self) -> list[dict]:
        rows = (self.sb.table("material").select(self.MAT_COLS)
                .order("id_material").limit(5000).execute().data)
        for r in rows:
            r["harga"] = float(r["harga"])
            r["stok"] = float(r["stok"])
        return rows

    def load(self) -> dict:
        all_rows = self._fetch_all()
        eligible = [
            r for r in all_rows
            if r.get("status_material", True) and float(r.get("stok") or 0) > 0
        ]
        return {
            "all": all_rows,
            "materials": eligible,
            "stats": catalog_stats(all_rows, eligible),
        }

    def materials(self) -> list[dict]:
        return self.load()["materials"]

    def get_material(self, material_id) -> dict | None:
        rows = (self.sb.table("material").select(self.MAT_COLS)
                .eq("id_material", material_id).limit(1).execute().data)
        if not rows:
            return None
        r = rows[0]
        r["harga"] = float(r["harga"])
        r["stok"] = float(r["stok"])
        return r

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


def find_alternative_materials(
    recipe: dict,
    materials: list[dict],
    kota: str | None,
    provinsi: str | None,
    top_n: int = 5,
) -> list[dict]:
    """
    Cari material alternatif saat pencocokan ketat (kategori + satuan + keyword) gagal.
    Gunakan pencocokan fuzzy pada nama material dan kategori yang relevan.
    """
    kw = recipe.get("kata_kunci_material", "")
    kat = recipe["kategori_material"]
    sat = recipe["satuan"]
    
    # Kategori yang relevan (fallback ke kategori yang sama atau mirip)
    related_categories = {
        "Spanduk": ["Spanduk", "Plastik"],
        "Plastik": ["Plastik", "Spanduk"],
        "Tekstil": ["Tekstil", "Kulit"],
        "Kulit": ["Kulit", "Tekstil"],
        "Kayu": ["Kayu"],
        "Logam": ["Logam"],
        "Kaca": ["Kaca"],
        "Karet": ["Karet", "Plastik"],
        "Organik": ["Organik"],
        "Kertas": ["Kertas"],
    }.get(kat, [kat])
    
    # Satuan yang setara (kg/m2/meter/pcs)
    unit_groups = {
        "kg": ["kg"],
        "m2": ["m2", "meter"],
        "meter": ["meter", "m2"],
        "pcs": ["pcs", "unit"],
        "unit": ["unit", "pcs"],
    }.get(sat, [sat])
    
    candidates = []
    for m in materials:
        # Prioritas 1: wilayah
        loc_score = 0
        if kota and _same(m.get("kota"), kota):
            loc_score = 1.0
        elif provinsi and _same(m.get("provinsi"), provinsi):
            loc_score = 0.5
        
        # Prioritas 2: kategori
        cat_score = 1.0 if m["kategori"] in related_categories else 0
        
        # Prioritas 3: satuan
        unit_score = 1.0 if m["satuan"] in unit_groups else 0
        
        # Prioritas 4: keyword overlap pada nama material
        name_score = keyword_overlap(kw, m["nama_material"])
        
        # Prioritas 5: deskripsi
        desc_score = keyword_overlap(kw, m.get("deskripsi_material", ""))
        
        if cat_score > 0 and unit_score > 0 and (name_score > 0 or desc_score > 0):
            total_score = (
                0.3 * loc_score +
                0.2 * cat_score +
                0.2 * unit_score +
                0.2 * name_score +
                0.1 * desc_score
            )
            candidates.append({
                **m,
                "_alt_score": total_score,
                "_match_type": "alternatif",
            })
    
    candidates.sort(key=lambda x: (-x["_alt_score"], x["harga"]))
    return candidates[:top_n]


def search_materials_semantic(
    query: str,
    materials: list[dict],
    kota: str | None = None,
    provinsi: str | None = None,
    top_n: int = 10,
) -> list[dict]:
    """Pencarian material berbasis kata kunci dan filter katalog yang sama dengan chat."""
    if not normalize_text(query):
        return []
    scope = "kota" if kota else ("provinsi" if provinsi else "all")
    found = material_search(
        materials, query=query, kota=kota, provinsi=provinsi,
        scope=scope, limit=top_n,
    )
    return found["items"]
