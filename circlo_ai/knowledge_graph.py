"""Knowledge Graph pemanfaatan material dari data resep_produk.

Graph ini adalah pengetahuan proses referensi:
kategori material -> proses -> produk.

Tidak ada klaim dampak lingkungan di sini. Semua jalur berasal dari kolom
resep_produk yang sudah ada di database.
"""
from __future__ import annotations

from .catalog import categories_for_query, normalize_text

_STOP = {
    "aku", "saya", "ingin", "mau", "pengen", "pengin", "tertarik", "coba",
    "apa", "apakah", "yang", "untuk", "dari", "bekas", "sisa", "dan", "dengan",
    "atau", "dalam", "pada", "bahan", "material", "produk", "produknya",
    "membuat", "buat", "bikin", "menjadi", "jadi", "bisa", "dapat", "digunakan",
    "pakai", "kalau", "jika", "tidak", "tersedia", "ada", "di", "ke", "sebagai",
    "limbah", "ramah", "lingkungan", "kerajinan", "bagaimana", "gimana", "gmn",
    "jelaskan", "proses", "pengolahan", "diolah", "cara", "tahapan", "langkah",
    "alternatif", "alternatifnya", "pengganti", "penggantinya", "selain",
    "lain", "lainnya", "tolong", "dong", "ya", "kak", "min",
}

_PRODUCT_ALIASES = {
    "tas": ("tote", "bag", "tas", "pouch", "dompet"),
    "tote": ("tote", "bag", "tas"),
    "bag": ("bag", "tote", "tas"),
    "pouch": ("pouch", "dompet"),
    "dompet": ("dompet", "pouch"),
    "paving": ("paving", "conblock", "bata", "block"),
    "block": ("block", "paving", "conblock", "bata"),
    "bata": ("bata", "paving", "conblock"),
    "meja": ("meja", "rak", "furnitur"),
    "rak": ("rak", "meja", "furnitur"),
    "kursi": ("kursi", "alas", "duduk"),
    "sapu": ("sapu", "botol"),
    "planter": ("planter", "pot", "tanaman"),
    "pot": ("pot", "planter", "tanaman"),
    "baglog": ("baglog", "jamur"),
    "jamur": ("jamur", "baglog"),
}


def _tokens(text: str) -> list[str]:
    return [
        word
        for word in normalize_text(text).split()
        if len(word) >= 3 and word not in _STOP
    ]


def _expanded_tokens(text: str) -> set[str]:
    out = set(_tokens(text))
    for token in list(out):
        out.update(_PRODUCT_ALIASES.get(token, ()))
    return out


class KnowledgeGraph:
    def __init__(self, resep_list: list[dict] | None = None):
        self.resep_list = list(resep_list or [])
        self._by_category: dict[str, list[dict]] = {}
        self._labels: dict[str, str] = {}

        for row in self.resep_list:
            label = str(row.get("kategori_material") or "").strip()
            if not label:
                continue
            key = normalize_text(label)
            if not key:
                continue
            self._labels.setdefault(key, label)
            self._by_category.setdefault(key, []).append(row)

    @classmethod
    def from_recipes(cls, resep_list: list[dict] | None) -> "KnowledgeGraph":
        return cls(resep_list)

    @property
    def categories(self) -> list[str]:
        return sorted(self._labels.values())

    def stats(self) -> dict:
        return {
            "kategori": len(self._by_category),
            "produk": len({str(r.get("nama_produk") or "") for r in self.resep_list}),
            "resep": len(self.resep_list),
        }

    @staticmethod
    def _pathway(row: dict) -> dict:
        return {
            "id_resep": row.get("id_resep"),
            "kategori": row.get("kategori_material"),
            "produk": row.get("nama_produk"),
            "langkah": row.get("langkah_singkat"),
            "k3": row.get("catatan_k3"),
            "kata_kunci": row.get("kata_kunci_material"),
            "bahan_per_unit": row.get("bahan_per_unit"),
            "satuan": row.get("satuan"),
            "persen_susut": row.get("persen_susut"),
            "estimasi_modal": row.get("estimasi_modal"),
            "sumber": "resep_produk",
        }

    def _rows_for_category(self, kategori: str | None) -> list[dict]:
        key = normalize_text(kategori or "")
        if not key:
            return []
        rows: list[dict] = []
        for cat, items in self._by_category.items():
            if cat == key or key in cat or cat in key:
                rows.extend(items)
        return rows

    def pathways_for_category(self, kategori: str | None, limit: int = 5) -> list[dict]:
        rows = self._rows_for_category(kategori)
        return [self._pathway(row) for row in rows[: max(0, limit)]]

    def pathways_for_text(self, text: str, limit: int = 5) -> list[dict]:
        categories = set(categories_for_query(text))
        if not categories:
            lowered = normalize_text(text)
            for key, label in self._labels.items():
                if key and key in lowered:
                    categories.add(label)

        out: list[dict] = []
        seen: set[str] = set()
        for category in sorted(categories):
            for row in self._rows_for_category(category):
                product = str(row.get("nama_produk") or "")
                if product in seen:
                    continue
                seen.add(product)
                out.append(self._pathway(row))
                if len(out) >= max(0, limit):
                    return out
        return out

    def search_products(
        self, text: str, kategori: str | None = None, limit: int = 5
    ) -> list[dict]:
        query = _expanded_tokens(text)
        if not query:
            return []

        category_key = normalize_text(kategori or "")
        scored: list[tuple[float, float, str, dict]] = []
        for row in self.resep_list:
            if category_key and normalize_text(row.get("kategori_material")) != category_key:
                continue

            product_tokens = set(_tokens(row.get("nama_produk")))
            keyword_tokens: set[str] = set()
            for phrase in str(row.get("kata_kunci_material") or "").split("|"):
                keyword_tokens.update(_tokens(phrase))
            category_tokens = set(_tokens(row.get("kategori_material")))

            product_hits = query & product_tokens
            keyword_hits = query & keyword_tokens
            category_hits = query & category_tokens
            if not product_hits and not keyword_hits:
                continue

            score = 3.0 * len(product_hits) + 1.5 * len(keyword_hits) + 0.5 * len(category_hits)
            reasons: list[str] = []
            if product_hits:
                reasons.append("nama produk memuat " + ", ".join(sorted(product_hits)))
            if keyword_hits:
                reasons.append("kata kunci material memuat " + ", ".join(sorted(keyword_hits)))
            if category_hits:
                reasons.append("kategori cocok: " + str(row.get("kategori_material")))

            pathway = self._pathway(row)
            pathway["skor"] = round(score, 2)
            pathway["alasan"] = "; ".join(reasons)
            modal = float(row.get("estimasi_modal") or 0)
            scored.append((score, modal, str(row.get("nama_produk") or ""), pathway))

        scored.sort(key=lambda item: (-item[0], item[1], item[2]))
        return [item[3] for item in scored[: max(0, limit)]]

    def pathways_for_product(
        self, text: str, kategori: str | None = None, limit: int = 5
    ) -> list[dict]:
        return self.search_products(text, kategori=kategori, limit=limit)

    def ideas(self, limit: int = 5) -> list[dict]:
        out: list[dict] = []
        seen: set[str] = set()
        for row in self.resep_list:
            category = normalize_text(row.get("kategori_material"))
            if not category or category in seen:
                continue
            seen.add(category)
            pathway = self._pathway(row)
            pathway["alasan"] = (
                "Contoh jalur dari resep kategori " + str(row.get("kategori_material"))
            )
            out.append(pathway)
            if len(out) >= max(0, limit):
                break
        return out

    def alternative_keywords(
        self, text: str, kategori: str | None = None, limit: int = 6
    ) -> list[dict]:
        category_key = normalize_text(kategori or "")
        if not category_key:
            categories = categories_for_query(text)
            if categories:
                category_key = normalize_text(sorted(categories)[0])
        if not category_key:
            products = self.search_products(text, limit=1)
            if products:
                category_key = normalize_text(products[0].get("kategori"))

        if not category_key:
            return []

        query_tokens = set(_tokens(text))
        found: dict[str, dict] = {}
        for row in self.resep_list:
            if normalize_text(row.get("kategori_material")) != category_key:
                continue
            for phrase in str(row.get("kata_kunci_material") or "").split("|"):
                phrase = phrase.strip()
                tokens = set(_tokens(phrase))
                if not tokens or tokens <= query_tokens:
                    continue
                key = normalize_text(phrase)
                if not key:
                    continue
                item = found.get(key)
                if item is None:
                    item = {
                        "istilah": phrase,
                        "kategori": row.get("kategori_material"),
                        "contoh_produk": row.get("nama_produk"),
                        "jumlah_resep": 0,
                        "sumber": "resep_produk",
                    }
                    found[key] = item
                item["jumlah_resep"] += 1

        rows = sorted(found.values(), key=lambda item: (-item["jumlah_resep"], item["istilah"]))
        return rows[: max(0, limit)]

    def pathways_for_material(self, material: dict, limit: int = 5) -> list[dict]:
        rows = self._rows_for_category(material.get("kategori"))
        if not rows:
            return []

        text = " ".join(
            str(material.get(key) or "")
            for key in ("nama_material", "deskripsi_material", "kondisi_seller")
        )
        material_tokens = set(_tokens(text))

        scored: list[tuple[float, float, dict]] = []
        for row in rows:
            keywords = [
                set(_tokens(part))
                for part in str(row.get("kata_kunci_material") or "").split("|")
                if _tokens(part)
            ]
            hits = sum(1 for keyword in keywords if keyword & material_tokens)
            score = hits / max(1, len(keywords))
            modal = float(row.get("estimasi_modal") or 0)
            scored.append((score, modal, row))

        scored.sort(key=lambda item: (-item[0], item[1]))
        return [self._pathway(row) for _, _, row in scored[: max(0, limit)]]
