"""Slot extraction berbasis aturan: kota, modal, dan minat dari kalimat bebas."""
from __future__ import annotations

import re
from dataclasses import dataclass

KOTA_PROVINSI = {
    # Jawa Timur
    "Surabaya": "Jawa Timur", "Sidoarjo": "Jawa Timur", "Gresik": "Jawa Timur",
    "Malang": "Jawa Timur", "Mojokerto": "Jawa Timur", "Pasuruan": "Jawa Timur",
    "Probolinggo": "Jawa Timur", "Kediri": "Jawa Timur", "Blitar": "Jawa Timur",
    "Madiun": "Jawa Timur", "Jember": "Jawa Timur", "Banyuwangi": "Jawa Timur",
    "Batu": "Jawa Timur", "Lamongan": "Jawa Timur", "Tuban": "Jawa Timur",
    "Bojonegoro": "Jawa Timur", "Jombang": "Jawa Timur", "Lumajang": "Jawa Timur",
    "Tulungagung": "Jawa Timur", "Nganjuk": "Jawa Timur", "Ngawi": "Jawa Timur",
    "Ponorogo": "Jawa Timur", "Situbondo": "Jawa Timur", "Bondowoso": "Jawa Timur",
    "Bangkalan": "Jawa Timur", "Sampang": "Jawa Timur", "Pamekasan": "Jawa Timur",
    "Sumenep": "Jawa Timur",
    # Luar Jawa Timur (contoh; tambahkan sesuai kebutuhan)
    "Jakarta": "DKI Jakarta", "Bandung": "Jawa Barat", "Bogor": "Jawa Barat",
    "Depok": "Jawa Barat", "Bekasi": "Jawa Barat", "Tangerang": "Banten",
    "Semarang": "Jawa Tengah", "Solo": "Jawa Tengah", "Yogyakarta": "DI Yogyakarta",
    "Denpasar": "Bali", "Bali": "Bali", "Medan": "Sumatera Utara", "Makassar": "Sulawesi Selatan",
}

ALIAS = {"sby": "Surabaya", "sda": "Sidoarjo", "jogja": "Yogyakarta",
         "yogya": "Yogyakarta", "jkt": "Jakarta"}

MINAT_KEYWORDS = {
    "fashion": ["tas", "dompet", "fashion", "pakaian", "aksesori", "aksesoris", "sepatu"],
    "furnitur": ["meja", "kursi", "rak", "furnitur", "mebel", "furniture"],
    "pertanian": ["jamur", "tanaman", "pupuk", "kompos", "media tanam", "pertanian",
                  "berkebun", "urban farming", "pot"],
    "energi": ["briket", "arang", "bahan bakar"],
    "dapur": ["talenan", "dapur", "peralatan makan"],
    "dekorasi": ["lampu", "dekorasi", "hiasan", "lilin", "kerajinan", "souvenir"],
    "kecantikan": ["scrub", "sabun", "aromaterapi", "kecantikan", "skincare"],
    "alat tulis": ["notebook", "buku", "alat tulis", "kertas"],
    "mainan": ["mainan", "boneka", "edukatif"],
    "bangunan": ["paving", "bata", "konstruksi", "bangunan"],
}

_UNIT = {"juta": 1e6, "jt": 1e6, "ribu": 1e3, "rb": 1e3, "k": 1e3}
_NUM = r"\d+(?:[.,]\d+)*"
_UNIT_RE = r"(juta|jt|ribu|rb|k)(?:an)?\b"


@dataclass
class SlotResult:
    kota: str | None = None
    provinsi: str | None = None
    modal: float | None = None
    modal_asumsi: bool = False
    modal_skip: bool = False
    minat_text: str = ""


def _to_float(s: str) -> float:
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", s):  # 5.000.000 -> pemisah ribuan
        return float(s.replace(".", ""))
    return float(s.replace(",", "."))  # 2,5 -> 2.5


def extract_kota(text: str) -> str | None:
    t = text.lower()
    best = None
    for name in KOTA_PROVINSI:
        key = name.lower()
        if key == "batu":  # kata ambigu ("batu bata"): wajib ada kata penunjuk lokasi
            pat = r"(?:di|kota|kab\.?|kabupaten|dari)\s+batu\b"
        else:
            pat = rf"\b{re.escape(key)}\b"
        m = re.search(pat, t)
        if m and (best is None or m.start() < best[0]):
            best = (m.start(), name)
    for alias, name in ALIAS.items():
        m = re.search(rf"\b{alias}\b", t)
        if m and (best is None or m.start() < best[0]):
            best = (m.start(), name)
    return best[1] if best else None


def parse_modal(text: str, allow_bare: bool = False) -> float | None:
    """'5 juta', '5jt', '2,5 juta', '500rb', 'Rp 5.000.000', '5-10 juta' (ambil batas bawah)."""
    t = text.lower()
    # rentang: 5-10 juta
    m = re.search(rf"({_NUM})\s*(?:-|sampai|sd|s/d|hingga)\s*({_NUM})\s*{_UNIT_RE}", t)
    if m:
        return _to_float(m.group(1)) * _UNIT[m.group(3)]
    # angka + satuan
    m = re.search(rf"(?:rp\.?\s*)?({_NUM})\s*{_UNIT_RE}", t)
    if m:
        return _to_float(m.group(1)) * _UNIT[m.group(2)]
    # Rp 5.000.000 / Rp 5000000
    m = re.search(rf"rp\.?\s*({_NUM})", t)
    if m:
        v = _to_float(m.group(1))
        if v >= 10_000:
            return v
    # 5.000.000 tanpa "Rp", hanya jika konteksnya jelas soal uang
    if allow_bare or re.search(r"\b(modal|budget|dana|uang)\w*", t):
        m = re.search(r"\b(\d{1,3}(?:\.\d{3})+)\b", t)
        if m and _to_float(m.group(1)) >= 10_000:
            return _to_float(m.group(1))
    return None


def parse_modal_kualitatif(text: str) -> float | None:
    t = text.lower()
    if re.search(r"modal\w*\s+(kecil|minim|terbatas|pas-?pasan|sedikit)", t):
        return 3_000_000
    if re.search(r"modal\w*\s+(sedang|menengah|cukup)", t):
        return 10_000_000
    if re.search(r"modal\w*\s+(besar|banyak|lumayan)", t):
        return 30_000_000
    return None


_SKIP_RE = re.compile(
    r"(belum|nggak|gak|ga|tidak|tak)\s*(tau|tahu|punya|ada|yakin|menentukan|ditentukan)"
    r"|\bbebas\b|\bterserah\b|\bfleksibel\b"
)


def extract_minat(text: str) -> str:
    t = text.lower()
    found = []
    for words in MINAT_KEYWORDS.values():
        for w in words:
            if re.search(rf"\b{re.escape(w)}\b", t):
                found.append(w)
    return " ".join(dict.fromkeys(found))


def parse_quantity(text: str) -> float | None:
    """Jumlah produksi: angka pertama yang bukan nominal uang / nomor pilihan."""
    t = text.lower()
    t = re.sub(rf"(?:rp\.?\s*)?{_NUM}\s*{_UNIT_RE}", " ", t)          # buang nominal
    t = re.sub(r"rp\.?\s*\d[\d.,]*", " ", t)
    t = re.sub(r"\b(?:nomor|no\.?|opsi|ide|pilihan)\s*\d\b", " ", t)  # buang "nomor 2"
    m = re.search(r"\b(\d{1,3}(?:\.\d{3})+|\d{1,7})(?:[.,]\d+)?\b", t)
    if not m:
        return None
    raw = m.group(1)
    v = float(raw.replace(".", "")) if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", raw) else float(raw)
    return v if v > 0 else None


def extract_slots(text: str, awaiting=()) -> SlotResult:
    res = SlotResult()
    res.kota = extract_kota(text)
    if res.kota:
        res.provinsi = KOTA_PROVINSI.get(res.kota)

    modal = parse_modal(text, allow_bare="modal" in awaiting)
    if modal is None:
        kual = parse_modal_kualitatif(text)
        if kual is not None:
            modal, res.modal_asumsi = kual, True
    res.modal = modal

    if res.modal is None and "modal" in awaiting and _SKIP_RE.search(text.lower()):
        res.modal_skip = True

    res.minat_text = extract_minat(text)
    return res
