"""Klasifikasi intent percakapan sebelum memilih tool katalog atau Knowledge Graph.

Prinsip: pertanyaan penjelasan (proses, pemanfaatan, ide, ekonomi sirkular) diarahkan
ke Knowledge Graph. Katalog hanya dipilih saat pengguna secara eksplisit mencari
material/harga/stok ATAU menunjukkan niat membeli.
"""
from __future__ import annotations

import re

from .catalog import categories_for_query

PURCHASE_INTENT = "purchase_intent"
MARKETPLACE_SEARCH = "marketplace_search"
MATERIAL_DISCOVERY = "material_discovery"
ALTERNATIVE_DISCOVERY = "alternative_discovery"
PROCESS_EXPLANATION = "process_explanation"
PRODUCT_DEVELOPMENT = "product_development"
MATERIAL_UTILIZATION = "material_utilization"
CIRCULAR_ECONOMY = "circular_economy"
EXPLORATION = "exploration"

KG_INTENTS = {
    EXPLORATION,
    MATERIAL_UTILIZATION,
    PRODUCT_DEVELOPMENT,
    PROCESS_EXPLANATION,
    ALTERNATIVE_DISCOVERY,
    CIRCULAR_ECONOMY,
}

PRODUCT_HINTS = {
    "pouch", "dompet", "tas", "tote", "bag", "paving", "conblock", "bata",
    "meja", "rak", "kursi", "sapu", "planter", "pot", "baglog", "jamur",
    "kertas", "boneka", "bantal", "kasur", "lampu", "hiasan", "souvenir",
    "sepatu", "sandal", "jaket", "kaos", "topi", "gelas", "piring", "talenan",
    "briket", "kompos", "pupuk", "papan", "vas", "mainan", "aksesori",
    "aksesoris", "mug", "tas belanja", "alas duduk", "sapu botol",
}

DOMAIN_HINTS = {
    "limbah", "sampah", "material", "bahan", "produk", "kain", "perca",
    "plastik", "kayu", "kertas", "kardus", "logam", "kaca", "karet", "kulit",
    "tekstil", "organik", "spanduk", "botol", "pallet", "palet", "denim",
    "jersey", "katun", "paving", "baglog", "kompos", "briket", "daur",
    "upcycle", "kerajinan", "sirkular", "siklus",
}

RE_PURCHASE = re.compile(
    r"\b(pesan|beli|membeli|order|checkout|mau\s+ambil|ambil\s+material)\b"
)
# Pencarian katalog harus eksplisit: kata harga/stok/ketersediaan, ATAU kata kerja
# mencari yang diikuti objek material/bahan/produk. Kata lokasi saja TIDAK memicu katalog.
RE_MARKETPLACE = re.compile(
    r"\b(harga|stok|tersedia|penjual|seller|listing|murah|termurah|diskon)\b"
    r"|\b(carikan|cari|tampilkan|lihat|kasih|butuh|perlu)\s+(material|bahan|produk|listing)\b"
)
RE_MATERIAL_DISCOVERY = re.compile(
    r"\b(material|bahan|produk)\s+(apa\s+saja|yang\s+tersedia|yang\s+ada)\b"
    r"|\bapa\s+saja\s+(material|bahan|produk)\b"
)
RE_MATERIAL_NEED = re.compile(
    r"\b(butuh|butuhkan|perlu|cari|carikan)\b.*\b(material|bahan|kain|plastik|"
    r"kayu|kertas|kulit|logam|kaca|karet|tekstil|organik|spanduk|botol)\b"
)
RE_ALTERNATIVE = re.compile(
    r"\b(alternatif\w*|pengganti\w*|penggantian|selain\s+itu|material\s+lain|bahan\s+lain)\b"
    r"|\b(kalau|jika)\b.*\btidak\b.*\b(ada|tersedia)\b"
)
RE_PROCESS = re.compile(
    r"\b(proses|tahapan|langkah|mengolah|pengolahan|diolah|"
    r"cara\s+(membuat|bikin|buat|mengolah|olah)|"
    r"(bagaimana|gimana|gmn)\s+(cara|proses|membuat|bikin|mengolah|buat|olah))\b"
)
RE_PRODUCT_DEV = re.compile(
    r"\b(ingin|mau|pengen|pengin|tertarik|rencana|berencana)\s+"
    r"(membuat|bikin|produksi|mengembangkan)\b"
    r"|\b(membuat|bikin|produksi)\s+(produk|kerajinan|pouch|tas|dompet|tote|"
    r"paving|meja|rak|kursi|sapu|planter|baglog|boneka|kertas|briket|kompos)\b"
    r"|\b(material|bahan)\s+apa\b.*\b(cocok|untuk|bisa|dapat)\b"
)
# "Material apa yang cocok/bisa/dapat dipakai untuk <produk>" = pengembangan produk,
# walau memuat "dapat digunakan" (pola pemanfaatan). Harus dicek lebih dulu.
RE_MATERIAL_FOR_PRODUCT = re.compile(
    r"\b(material|bahan)\s+apa\b.*\b(cocok|untuk|bisa|dapat)\b"
)
RE_UTILIZATION = re.compile(
    r"\b(potensi|pemanfaatan|dimanfaatkan|memanfaatkan|bisa\s+jadi|dapat\s+jadi|"
    r"bisa\s+diolah|dapat\s+diolah|bisa\s+digunakan|dapat\s+digunakan|"
    r"diolah\s+menjadi|jadi\s+apa|produk\s+apa|bikin\s+apa|buat\s+apa|untuk\s+apa)\b"
)
RE_EXPLORATION = re.compile(
    r"\b(ide|inspirasi|bingung|pilihan|rekomendasi|saran|kerajinan|"
    r"ramah\s+lingkungan|dari\s+limbah|material\s+sisa|barang\s+bekas|produk\s+baru)\b"
)
RE_CIRCULAR = re.compile(
    r"\b(ekonomi\s+sirkular|circular\s+economy|"
    r"siklus\s+(?:material|limbah|sampah|produk|hidup)|"
    r"perjalanan\s+(?:material|limbah|sampah)|alur\s+(?:material|limbah|sampah)|"
    r"zero\s+waste|pengelolaan\s+(?:sampah|limbah)|mengurangi\s+(?:sampah|limbah)|"
    r"apa\s+itu\s+sirkular|prinsip\s+sirkular)\b"
)
RE_BUSINESS = re.compile(r"\b(mulai\s+usaha|usaha|bisnis|umkm|wirausaha)\b")


def _words(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def _has_domain(text: str) -> bool:
    words = _words(text)
    return bool(words & DOMAIN_HINTS) or bool(categories_for_query(text))


def _has_product_focus(text: str) -> bool:
    words = _words(text)
    if words & PRODUCT_HINTS:
        return True
    return bool(categories_for_query(text))


def classify_intent(text: str) -> str | None:
    """Return intent percakapan; None berarti lanjutkan alur dialog yang sudah ada.

    Urutan penting: penjelasan (KG) didahulukan dibanding pencarian katalog, supaya
    pertanyaan "bagaimana/cara/kenapa/bisa jadi apa" tidak berubah menjadi daftar produk.
    """
    tl = text.lower()
    domain = _has_domain(tl)
    product_focus = _has_product_focus(tl)

    # 1. Niat membeli eksplisit (harus menyebut objek/domain, bukan "beli" telanjang).
    if RE_PURCHASE.search(tl) and (domain or product_focus):
        return PURCHASE_INTENT

    # 2. Pertanyaan konsep ekonomi sirkular -> penjelasan, bukan katalog.
    if RE_CIRCULAR.search(tl):
        return CIRCULAR_ECONOMY

    # 3. Penjelasan/eksplorasi berbasis Knowledge Graph didahulukan.
    if RE_ALTERNATIVE.search(tl) and domain:
        return ALTERNATIVE_DISCOVERY
    if RE_PROCESS.search(tl) and domain:
        return PROCESS_EXPLANATION
    if RE_MATERIAL_FOR_PRODUCT.search(tl) and domain and product_focus:
        return PRODUCT_DEVELOPMENT
    if RE_UTILIZATION.search(tl) and domain:
        return MATERIAL_UTILIZATION
    if RE_PRODUCT_DEV.search(tl) and domain:
        if RE_BUSINESS.search(tl) and not product_focus:
            return None
        return PRODUCT_DEVELOPMENT if product_focus else EXPLORATION
    if (RE_EXPLORATION.search(tl) and not RE_BUSINESS.search(tl)
            and (domain or product_focus)):
        return EXPLORATION

    # 4. Pencarian katalog hanya bila eksplisit (harga/stok/cari material).
    if RE_MARKETPLACE.search(tl) and domain:
        return MARKETPLACE_SEARCH
    if RE_MATERIAL_DISCOVERY.search(tl) and domain:
        return MATERIAL_DISCOVERY
    if RE_MATERIAL_NEED.search(tl) and domain:
        return MATERIAL_DISCOVERY

    return None
