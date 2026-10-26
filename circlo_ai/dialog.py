"""Dialog manager: state machine discovery -> rekomendasi -> pendampingan.
Alur dikendalikan KODE (bukan model) supaya konsisten; model hanya merangkai kalimat."""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import asdict, dataclass, field

from . import facts as F
from . import responder as R
from .catalog import (
    alternative_search,
    catalog_stats,
    categories_for_query,
    material_search,
    query_tokens,
    region_candidates,
    resolve_provinsi,
)
from .slots import extract_kota, extract_slots, parse_modal, parse_quantity

RE_HITUNG = re.compile(
    r"\b(hitung\w*|kebutuhan|butuh bahan|butuh berapa|beli berapa|perlu (?:beli|bahan)"
    r"|berapa (?:banyak )?(?:kg|m2|meter|bahan|pcs|lembar)"
    r"|bahan (?:yang )?(?:dibutuhkan|diperlukan|ideal))\b"
)
RE_MULAI_UMUM = re.compile(
    r"\b(mulai usaha|memulai|mulai dari mana|langkah (?:awal|memulai)|mulai dulu)\b")
RE_MULAI = re.compile(   # niat spesifik: valid kapan pun
    r"\b(izin|nib|legal|perizinan|pemasaran|marketing|promosi|jual\w*|harga jual|hpp|omzet"
    r"|untung|branding|pelanggan|strategi)\b")
RE_CARA = re.compile(
    r"\b(cara|proses|mengolah|diolah|pengolahan|olah|tutorial|teknis|tahapan"
    r"|membuatnya|bikinnya|buatnya|(?:gimana|gmn|bagaimana)\s+(?:membuat|bikin|mengolah|buat|olah))\b"
)
RE_DOMAIN = re.compile(   # kalimat 'cara ...' dianggap soal produk/usaha bila ada kata ini
    r"\b(bahan\w*|produk\w*|usaha|bisnis|material|olah\w*|jahit\w*|potong\w*|cuci\w*|daur|sisa"
    r"|bekas|limbah|kemasan|alat|\w+nya|ini|tersebut)\b")
RE_REF = re.compile(r"\b(\w+nya|ini|tersebut|tadi)\b")      # merujuk produk yang sedang dibahas
RE_MINAT = re.compile(r"\b(suka|tertarik|minat|pengen|pengin|ingin|maunya|bidang|cocok|fokus)\b")
RE_MODAL_Q = re.compile(r"\b(modal\w*|biaya|investasi|budget|anggaran)\b")
RE_IDE = re.compile(
    r"\b(usaha|bisnis|umkm|wirausaha|ide|rekomendasi|saran|bingung|green|ramah lingkungan"
    r"|daur ulang|material|limbah|bahan sisa|mulai)\b")
RE_JUMLAH_KATALOG = re.compile(
    r"\b(berapa\s+(?:jumlah\s+|banyak\s+)?(?:material|produk|item|katalog)"
    r"|jumlah\s+(?:total\s+)?(?:material|produk|item|katalog)"
    r"|total\s+(?:material|produk|item|katalog)"
    r"|ada\s+berapa\s+(?:material|produk|item))\b")
RE_KATALOG = re.compile(
    r"\b(katalog|daftar\s+(?:material|produk)|semua\s+(?:material|produk)"
    r"|material\s+apa\s+saja|produk\s+apa\s+saja|tampilkan|lihat\s+(?:semua|katalog|material)"
    r"|lebih\s+banyak\s+pilihan|pilihan\s+lain|seluruh\s+katalog|cari\s+material"
    r"|carikan\s+material|mencari\s+material)\b")
RE_SEMUA_WILAYAH = re.compile(
    r"\b(bukan\s+(?:hanya\s+|cuma\s+)?(?:di\s+)?(?:surabaya|kota\s+ini)"
    r"|jangan\s+(?:hanya\s+|cuma\s+)?(?:di\s+)?(?:surabaya|kota\s+ini)"
    r"|semua\s+(?:wilayah|kota|daerah|indonesia)|seluruh\s+(?:wilayah|indonesia|katalog)"
    r"|di\s+luar\s+(?:surabaya|kota)|luar\s+kota)\b")
RE_PILIH = re.compile(
    r"\b(pilih|pilihanku|aku\s+pilih|saya\s+pilih|ambil|pakai)\b")
RE_PESAN = re.compile(
    r"\b(pesan|langsung\s+pesan|mau\s+pesan|beli|order|checkout|mau\s+ambil"
    r"|ambil\s+material)\b")
RE_DETAIL = re.compile(
    r"\b(detail|info\s+lengkap|spesifikasi|jelaskan\s+(?:material|produk)\s+(?:ini|tersebut)"
    r"|lihat\s+detail)\b")
RE_DAPAT_BERAPA = re.compile(
    r"\b(dapat\s+berapa|bisa\s+beli\s+berapa|cukup\s+berapa"
    r"|berapa\s+(?:banyak\s+)?(?:yang\s+)?(?:bisa|dapat)\s+dibeli)\b")
RE_TAMPILKAN_LAGI = re.compile(
    r"\b(tampilkan\s+lagi|ulangi|lihat\s+lagi|mana\s+daftarnya|daftar\s+lagi)\b")
RE_BARE_PILIHAN = re.compile(r"^\s*(?:nomor|no\.?|pilihan|opsi)?\s*(\d{1,2})\s*$")
ORDINAL = {"pertama": 1, "kesatu": 1, "kedua": 2, "ketiga": 3}
STOP = {"dari", "bekas", "sisa", "dan", "untuk", "dengan", "yang", "atau", "dalam", "pada", "bahan"}


def _tokens(s: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", s.lower()) if len(w) >= 3 and w not in STOP}


def _ordinal(t: str) -> int | None:
    m = re.search(r"\b(?:nomor|no\.?|opsi|ide|pilihan|yang)\s*(\d)\b(?!\s*(?:(?:juta|jt|ribu|rb|k)\b|\d))", t)
    if m:
        return int(m.group(1))
    m = re.search(r"\b(?:pilih|pilihanku|ambil|pakai)\s*(?:nomor|no\.?|yang)?\s*(\d{1,2})\b", t)
    if m:
        return int(m.group(1))
    m = re.search(r"(?:\byang\s+|^\s*)(pertama|kesatu|kedua|ketiga)\b", t)
    return ORDINAL[m.group(1)] if m else None


def _requested_limit(text: str) -> tuple[int, bool]:
    t = text.lower()
    if re.search(r"\b(semua|seluruh)\b", t):
        return 200, True
    m = re.search(
        r"\b(?:tampilkan|lihat|kasih|beri|ambil|minta|top|sebanyak|sampai)\s+(\d{1,2})\b", t)
    if not m:
        m = re.search(r"\b(\d{1,2})\s+(?:material|produk|item|pilihan|hasil)\b", t)
    if m:
        return max(1, min(200, int(m.group(1)))), True
    if re.search(r"\b(lebih\s+banyak|pilihan\s+lain|semua|seluruh)\b", t):
        return 20, True
    return 12, False


def _catalog_query(text: str) -> str:
    toks = query_tokens(text)
    return " ".join(toks)


@dataclass
class State:
    fase: str = "discovery"           # discovery | rekomendasi | pendampingan | katalog
    kota: str | None = None
    provinsi: str | None = None
    modal: float | None = None
    modal_asumsi: bool = False
    modal_dilewati: bool = False
    minat_text: str = ""
    awaiting: list = field(default_factory=list)   # slot yang sedang ditanyakan: kota/modal/qty
    ask_count: int = 0
    last_recs: list = field(default_factory=list)  # id_resep yang terakhir direkomendasikan
    selected_resep: int | None = None
    last_material_ids: list = field(default_factory=list)
    selected_material: dict | None = None
    scope_all: bool = False
    last_result_kind: str = ""
    last_search_query: str = ""
    last_search_meta: dict = field(default_factory=dict)
    last_signature: str = ""
    last_turn: str = ""

    def to_dict(self) -> dict:   # cocok disimpan ke ai_conversation.slots (jsonb)
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "State":
        if not isinstance(d, dict):
            return cls()
        allowed = {f.name for f in cls.__dataclass_fields__.values()}
        return cls(**{k: v for k, v in d.items() if k in allowed})


@dataclass
class Reply:
    text: str
    material_ids: list = field(default_factory=list)   # untuk kartu produk di UI
    resep_ids: list = field(default_factory=list)
    intent: str | None = None
    task: str | None = None        # jenis tugas untuk LLM (lihat facts.py)
    facts: dict = field(default_factory=dict)   # fakta terstruktur untuk LLM


class DialogManager:
    def __init__(self, catalog, recommender, llm_fallback=None):
        self.catalog = catalog
        self.reco = recommender
        self.llm_fallback = llm_fallback  # hook: Step 5-6 (model LoRA) untuk pertanyaan terbuka
        df = Counter()
        for r in recommender.resep_list:
            df.update(_tokens(r["nama_produk"]))
        self._df = df

    # ---------- resolusi produk yang dimaksud user ----------
    def _resolve_resep(self, text: str, state: State):
        t = text.lower()
        n = _ordinal(t)
        if n and 1 <= n <= len(state.last_recs):
            return self.reco.by_id[state.last_recs[n - 1]], "ordinal"
        words = set(re.findall(r"[a-z0-9]+", t))
        sel = self.reco.by_id.get(state.selected_resep)
        if sel and _tokens(sel["nama_produk"]) & words:
            return sel, "lexical"      # masih membahas produk yang sama
        best, best_key = None, None
        for r in self.reco.resep_list:
            toks = _tokens(r["nama_produk"])
            hit = toks & words
            if not hit:
                continue
            score = len(hit) / len(toks)
            strong = any(self._df[w] == 1 for w in hit)   # kata khas satu resep (mis. 'paving')
            if not strong and r["id_resep"] in state.last_recs:   # khas di antara 3 rekomendasi
                strong = any(
                    sum(1 for i in state.last_recs
                        if w in _tokens(self.reco.by_id[i]["nama_produk"])) == 1 for w in hit)
            if not (strong or score >= 0.5):
                continue
            key = (strong, r["id_resep"] in state.last_recs, score)
            if best_key is None or key > best_key:
                best, best_key = r, key
        return (best, "lexical") if best else (None, None)

    def _catalog_data(self) -> tuple[list[dict], dict]:
        if hasattr(self.catalog, "load"):
            data = self.catalog.load()
            return data["materials"], data["stats"]
        materials = self.catalog.materials()
        return materials, catalog_stats(materials, materials)

    @staticmethod
    def _material_card(m: dict) -> dict:
        keys = ("id_material", "id_seller", "nama_material", "kategori", "harga",
                "satuan", "stok", "kota", "provinsi", "lokasi", "deskripsi_material")
        card = {k: m.get(k) for k in keys}
        card["harga"] = float(m.get("harga") or 0)
        card["stok"] = float(m.get("stok") or 0)
        return card

    def _last_materials(self, state: State, materials: list[dict]) -> list[dict]:
        by_id = {m["id_material"]: m for m in materials}
        return [by_id[i] for i in state.last_material_ids if i in by_id]

    def _find_material(self, text: str, state: State, materials: list[dict]) -> dict | None:
        t = text.lower()
        by_id = {m["id_material"]: m for m in materials}
        last = self._last_materials(state, materials)

        if re.search(r"\b(?:material|produk|id)\s*#?\s*(\d{1,4})\b", t):
            mid = int(re.search(r"\b(?:material|produk|id)\s*#?\s*(\d{1,4})\b", t).group(1))
            if mid in by_id:
                return by_id[mid]

        n = _ordinal(t)
        if n and 1 <= n <= len(last):
            return last[n - 1]

        m_order = re.search(
            r"\b(?:pesan|beli|order|ambil)\s+(?:nomor\s+)?(\d{1,2})\b"
            r"(?!\s*(?:kg|pcs|meter|m2|unit|buah|lembar))", t)
        if m_order:
            n = int(m_order.group(1))
            if 1 <= n <= len(last):
                return last[n - 1]

        if state.selected_material:
            sel = by_id.get(state.selected_material.get("id_material"))
            if sel and RE_REF.search(t):
                return sel
            if sel and (_tokens(sel["nama_material"]) & set(query_tokens(text))):
                return sel

        if len(last) == 1 and RE_REF.search(t):
            return last[0]

        tokens = set(query_tokens(text))
        if not tokens:
            return last[0] if len(last) == 1 else None
        best, best_key = None, None
        for m in last or materials:
            name_tokens = set(query_tokens(m["nama_material"]))
            cat_tokens = set(query_tokens(m.get("kategori", "")))
            hit = tokens & name_tokens
            cat_hit = tokens & cat_tokens
            if not hit and not cat_hit:
                continue
            coverage = len(hit) / max(1, len(name_tokens))
            score = len(hit) * 3 + len(cat_hit)
            key = (coverage, score, m["id_material"] in state.last_material_ids)
            if best_key is None or key > best_key:
                best, best_key = m, key
        if best and (best_key[0] >= 0.4 or best_key[1] >= 2):
            return best
        return None

    @staticmethod
    def _scope(state: State) -> str:
        if state.scope_all:
            return "all"
        if state.kota:
            return "kota"
        if state.provinsi:
            return "provinsi"
        return "all"

    def _search_materials(self, state: State, text: str, limit: int | None = None) -> dict:
        materials, _ = self._catalog_data()
        query = _catalog_query(text)
        if limit is None:
            limit, _ = _requested_limit(text)
        budget = parse_modal(text)
        if budget is None and state.modal and (
                not query or re.search(r"\b(budget|anggaran|modal|harga|murah|bawah|maks)\b",
                                       text.lower())):
            budget = state.modal
        found = material_search(
            materials,
            query=query,
            kota=state.kota,
            provinsi=state.provinsi,
            scope=self._scope(state),
            max_harga=budget,
            limit=limit,
        )
        found["_state_kota"] = state.kota
        found["_state_provinsi"] = state.provinsi
        return found

    def _set_material_result(self, state: State, cards: list[dict], kind: str,
                             query: str = "", meta: dict | None = None) -> None:
        state.last_material_ids = [c["id_material"] for c in cards]
        state.last_result_kind = kind
        state.last_search_query = query
        state.last_search_meta = meta or {}
        state.fase = "katalog"
        state.awaiting = []

    def _catalog_reply(self, state: State, text: str) -> Reply:
        found = self._search_materials(state, text)
        cards = [self._material_card(m) for m in found["items"]]
        if found["total"] == 0:
            query = found["query"]
            all_materials = self._catalog_data()[0]
            if found["scope"] != "all" and (query or found.get("kategori") or found.get("max_harga")):
                elsewhere = material_search(
                    all_materials,
                    query=query,
                    scope="all",
                    max_harga=found.get("max_harga"),
                    limit=min(8, found["limit"] or 8),
                )
                if elsewhere["total"] > 0:
                    alt_cards = [self._material_card(m) for m in elsewhere["items"]]
                    self._set_material_result(state, alt_cards, "material", query, elsewhere)
                    return Reply(R.katalog_luar_kota_text(state, found, elsewhere, alt_cards),
                                 [c["id_material"] for c in alt_cards],
                                 intent="katalog", task="katalog",
                                 facts=F.katalog(state, elsewhere, alt_cards, alternatif=True))

            categories = categories_for_query(text)
            alts = alternative_search(
                all_materials,
                kategori=next(iter(categories)) if len(categories) == 1 else None,
                kota=state.kota if not state.scope_all else None,
                provinsi=state.provinsi if not state.scope_all else None,
                limit=min(6, found["limit"] or 6),
            )
            if alts:
                alt_cards = [self._material_card(m) for m in alts]
                self._set_material_result(state, alt_cards, "material", query, found)
                return Reply(R.katalog_alternatif_text(state, found, alt_cards),
                             [c["id_material"] for c in alt_cards],
                             intent="katalog", task="katalog",
                             facts=F.katalog(state, found, alt_cards, alternatif=True))
            self._set_material_result(state, [], "material_kosong", query, found)
            return Reply(R.katalog_kosong_text(state, found), intent="katalog_kosong",
                         task="katalog_kosong", facts=F.katalog(state, found, [], False))

        self._set_material_result(state, cards, "material", found["query"], found)
        return Reply(R.katalog_text(state, found, cards),
                     [c["id_material"] for c in cards],
                     intent="katalog", task="katalog",
                     facts=F.katalog(state, found, cards, alternatif=False))

    def _stats_reply(self, state: State, text: str) -> Reply:
        materials, stats = self._catalog_data()
        found = self._search_materials(state, text, limit=6)
        found["_katalog_stats"] = stats
        cards = [self._material_card(m) for m in found["items"]]
        self._set_material_result(state, cards, "stats", found["query"], found)
        return Reply(R.katalog_stats_text(state, found, cards),
                     [c["id_material"] for c in cards],
                     intent="katalog_jumlah", task="katalog_jumlah",
                     facts=F.katalog(state, found, cards, alternatif=False))

    def _material_detail_reply(self, state: State, text: str) -> Reply:
        materials, _ = self._catalog_data()
        m = self._find_material(text, state, materials)
        if not m:
            last = self._last_materials(state, materials)
            return Reply(R.pilih_material_text(last), intent="detail_material",
                         task="tanya_material", facts=F.tanya_material(last))
        card = self._material_card(m)
        state.selected_material = card
        state.last_result_kind = "detail"
        state.fase = "katalog"
        state.awaiting = []
        if not state.last_material_ids:
            state.last_material_ids = [card["id_material"]]
        return Reply(R.material_detail_text(card), [card["id_material"]],
                     intent="detail_material", task="detail_material",
                     facts=F.detail_material(card))

    def _order_reply(self, state: State, text: str) -> Reply:
        materials, _ = self._catalog_data()
        m = self._find_material(text, state, materials)
        if not m and state.selected_material:
            by_id = {x["id_material"]: x for x in materials}
            m = by_id.get(state.selected_material.get("id_material"))
        if not m:
            last = self._last_materials(state, materials)
            return Reply(R.pilih_material_text(last), intent="pesan",
                         task="tanya_material", facts=F.tanya_material(last))
        card = self._material_card(m)
        qty = parse_quantity(text)
        if qty is None:
            qty = 1.0
        qty = min(qty, card["stok"])
        state.selected_material = card
        state.last_result_kind = "order"
        state.fase = "katalog"
        state.awaiting = []
        if not state.last_material_ids:
            state.last_material_ids = [card["id_material"]]
        total = qty * card["harga"]
        return Reply(R.material_order_text(card, qty, total), [card["id_material"]],
                     intent="pesan", task="pesan",
                     facts=F.order_material(card, qty, total))

    def _material_hitung_reply(self, state: State, text: str) -> Reply:
        materials, _ = self._catalog_data()
        m = self._find_material(text, state, materials)
        if not m and state.selected_material:
            by_id = {x["id_material"]: x for x in materials}
            m = by_id.get(state.selected_material.get("id_material"))
        if not m:
            last = self._last_materials(state, materials)
            return Reply(R.pilih_material_text(last), intent="hitung_material",
                         task="tanya_material", facts=F.tanya_material(last))
        card = self._material_card(m)
        budget = parse_modal(text) or state.modal
        state.selected_material = card
        state.last_result_kind = "hitung_material"
        state.fase = "katalog"
        state.awaiting = []
        if not state.last_material_ids:
            state.last_material_ids = [card["id_material"]]
        if not budget:
            return Reply(R.material_budget_text(card), [card["id_material"]],
                         intent="hitung_material", task="tanya_budget",
                         facts=F.hitung_material(card, None, None))
        affordable = int(budget // card["harga"]) if card["harga"] > 0 else 0
        qty = min(affordable, int(card["stok"]))
        total = qty * card["harga"]
        return Reply(R.material_hitung_text(card, budget, affordable, qty, total),
                     [card["id_material"]], intent="hitung_material",
                     task="hitung_material",
                     facts=F.hitung_material(card, budget, affordable, qty, total))

    @staticmethod
    def _classify(t: str, sl, qty, state: State, explicit=None) -> str | None:
        tl = t.lower()
        material_context = bool(state.selected_material or state.last_material_ids)
        material_list_context = state.last_result_kind in (
            "material", "material_kosong", "stats", "detail"
        )
        if "qty" in state.awaiting and qty is not None:
            return "hitung"
        if RE_JUMLAH_KATALOG.search(tl):
            return "katalog_jumlah"
        if RE_SEMUA_WILAYAH.search(tl):
            return "katalog"
        if RE_KATALOG.search(tl):
            return "katalog"
        if (re.match(r"^\s*(?:material|produk)\b", tl)
                and not re.search(r"\b(untuk apa|apa itu|bedanya|kenapa|mengapa)\b", tl)
                and (sl.kota or sl.modal or categories_for_query(tl)
                     or re.search(r"\b(murah|terjangkau|bagus|berkualitas|baru|bekas|bawah|maks|semua|wilayah)\b", tl))):
            return "katalog"
        if RE_TAMPILKAN_LAGI.search(tl) and material_list_context:
            return "katalog"
        if RE_DAPAT_BERAPA.search(tl) and material_context:
            return "hitung_material"
        if RE_DETAIL.search(tl) and material_context:
            return "detail_material"
        if RE_PESAN.search(tl) and material_context:
            return "pesan"
        if material_context and RE_PILIH.search(tl) and _ordinal(tl):
            return "pilih_material"
        if RE_BARE_PILIHAN.match(tl) and material_list_context:
            return "pilih_material"
        if (material_list_context and _ordinal(tl)
                and re.search(r"\b(yang|nomor|no\.?|opsi|pilihan|ke)\b", tl)):
            return "pilih_material"
        if RE_HITUNG.search(tl):
            return "hitung"
        if RE_MULAI.search(tl) or (RE_MULAI_UMUM.search(tl) and state.fase != "discovery"):
            return "mulai"
        if RE_CARA.search(tl) and (explicit or RE_DOMAIN.search(tl)):
            return "cara"
        if (RE_MODAL_Q.search(tl) and sl.modal is None and not sl.modal_skip
                and not sl.modal_asumsi):
            return "modal_q"
        if material_list_context and query_tokens(t) and not explicit:
            if categories_for_query(t) or state.last_result_kind in ("material", "stats"):
                return "katalog"
        return None

    # ---------- utama ----------
    def handle(self, state: State, text: str) -> Reply:
        sl = extract_slots(text, awaiting=state.awaiting)
        qty = parse_quantity(text)
        materials, _ = self._catalog_data()
        explicit, how = self._resolve_resep(text, state)
        intent = self._classify(text, sl, qty, state, explicit)

        # "bukan hanya di Surabaya" bukan permintaan kota, melainkan perluasan wilayah
        negasi_kota = bool(RE_SEMUA_WILAYAH.search(text.lower()))
        if negasi_kota:
            state.scope_all = True
            if intent is None:
                intent = "katalog"

        # slot kota & modal selalu diperbarui bila disebut
        changed = False
        if sl.kota and not negasi_kota and (sl.kota != state.kota or state.scope_all):
            state.kota, state.provinsi, changed = sl.kota, resolve_provinsi(sl.kota, materials), True
            state.scope_all = False
        if sl.modal is not None and sl.modal != state.modal:
            state.modal, state.modal_asumsi, state.modal_dilewati = sl.modal, sl.modal_asumsi, False
            changed = True
        elif sl.modal_skip and state.modal is None:
            state.modal_dilewati = True

        if intent in ("katalog_jumlah", "katalog", "pilih_material",
                      "detail_material", "pesan", "hitung_material"):
            material_text = text
            if (negasi_kota and not query_tokens(text) and state.last_search_query
                    and state.last_result_kind in ("material", "stats")):
                material_text = f"{state.last_search_query} {text}"
            reply = self._handle_material_intent(state, material_text, intent)
            state.last_turn = text.lower()
            state.last_signature = f"{intent}:{_catalog_query(text)}:{self._scope(state)}"
            return reply
        # memilih produk dari daftar rekomendasi ("yang pertama", "tote bag aja")
        kalimat_pendek = len(text.split()) <= 7 and "?" not in text   # bukan pertanyaan panjang
        if intent is None and explicit and state.last_recs and not changed and (
                how == "ordinal" or (explicit["id_resep"] in state.last_recs and kalimat_pendek)):
            intent = "pilih"
        if (intent is None and sl.minat_text and sl.minat_text != state.minat_text
                and (state.fase == "discovery" or RE_MINAT.search(text.lower()))):
            state.minat_text, changed = sl.minat_text, True

        if intent in ("hitung", "cara", "modal_q", "pilih"):
            resep = explicit or self.reco.by_id.get(state.selected_resep)
            if resep is None:
                if state.last_recs and (intent != "cara" or RE_REF.search(text.lower())):
                    opsi = [self.reco.by_id[i] for i in state.last_recs]
                    return Reply(R.ask_which_text(opsi), intent=intent,
                                 task="tanya_produk", facts=F.tanya_produk(opsi))
                intent = None  # belum ada produk: lanjut ke alur discovery
            else:
                return self._pendampingan(state, intent, resep, qty, materials)

        if intent == "mulai":
            state.fase = "pendampingan"
            resep = explicit or self.reco.by_id.get(state.selected_resep)
            return Reply(R.mulai_text(resep), intent="mulai", task="mulai", facts=F.mulai(resep))

        # ---- pertanyaan terbuka / di luar alur (diputuskan model: dijawab atau ditolak sopan) ----
        discovery_terbuka = (state.fase == "discovery" and not changed and not state.awaiting
                             and not RE_IDE.search(text.lower()))
        if (state.fase != "discovery" and not changed) or discovery_terbuka:
            sel = self.reco.by_id.get(state.selected_resep)
            cands = region_candidates(sel, materials, state.kota, state.provinsi)[0] if sel else []
            facts = F.bebas(state, sel, cands, self.reco.by_id)
            if self.llm_fallback:
                out = self.llm_fallback(state, text, materials)
                if out:
                    return Reply(out, intent="llm", task="bebas", facts=facts)
            return Reply(R.fallback_text(), intent="fallback", task="bebas", facts=facts)

        # ---- alur discovery / rekomendasi ulang ----

        need_kota = state.kota is None
        need_modal = state.modal is None and not state.modal_dilewati
        if (need_kota or need_modal) and state.ask_count < 2:
            first = state.ask_count == 0
            state.ask_count += 1
            state.awaiting = [s for s, n in (("kota", need_kota), ("modal", need_modal)) if n]
            return Reply(R.ask_slots(state, need_kota, need_modal, first), intent="ask_slots",
                         task="tanya_slot", facts=F.tanya_slot(state, need_kota, need_modal, first))

        return self._rekomendasi(state, materials)

    def _handle_material_intent(self, state: State, text: str, intent: str) -> Reply:
        if intent == "katalog_jumlah":
            return self._stats_reply(state, text)
        if intent == "katalog":
            return self._catalog_reply(state, text)
        if intent == "pilih_material":
            reply = self._material_detail_reply(state, text)
            if reply.intent == "detail_material" and state.selected_material:
                reply.intent = "pilih_material"
                reply.task = "detail_material"
            return reply
        if intent == "detail_material":
            return self._material_detail_reply(state, text)
        if intent == "pesan":
            return self._order_reply(state, text)
        return self._material_hitung_reply(state, text)

    def _rekomendasi(self, state: State, materials) -> Reply:
        recs, info = self.reco.recommend(state, materials)
        state.awaiting = []
        if not recs:
            return Reply("Maaf, belum ada material di katalog yang cocok dengan resep kami. "
                         "Coba lagi nanti saat katalog bertambah.", intent="rekomendasi",
                         task="rekomendasi_kosong", facts={"kota": state.kota, "modal_user": state.modal})
        state.fase = "rekomendasi"
        state.last_recs = [r.resep["id_resep"] for r in recs]
        mids = [m["id_material"] for r in recs for m in r.kandidat[:2]]
        return Reply(R.recommend_text(state, recs, info, materials), mids, state.last_recs,
                     intent="rekomendasi", task="rekomendasi",
                     facts=F.rekomendasi(state, recs, info, materials))

    def _pendampingan(self, state: State, intent: str, resep, qty, materials) -> Reply:
        state.selected_resep = resep["id_resep"]
        state.fase = "pendampingan"
        # Coba pencocokan ketat dulu
        cands, _ = region_candidates(resep, materials, state.kota, state.provinsi)
        if not cands:
            # Fallback ke material alternatif
            from .catalog import find_alternative_materials
            cands = find_alternative_materials(resep, materials, state.kota, state.provinsi)
        mids = [m["id_material"] for m in cands[:2]]
        rid = [resep["id_resep"]]

        if intent in ("cara", "pilih"):
            return Reply(R.cara_text(resep, cands, intro=(intent == "pilih")), mids, rid, intent,
                         task="cara", facts=F.cara(resep, cands, intent == "pilih"))
        if intent == "modal_q":
            return Reply(R.modal_text(resep, state), mids, rid, intent,
                         task="modal", facts=F.modal(resep, state))
        # hitung
        if qty is None:
            state.awaiting = ["qty"]
            return Reply(R.ask_qty_text(resep), mids, rid, intent,
                         task="tanya_jumlah", facts=F.tanya_jumlah(resep))
        state.awaiting = [a for a in state.awaiting if a != "qty"]
        text, used = R.hitung_text(resep, qty, state, materials)
        return Reply(text, used or mids, rid, intent, task="hitung",
                     facts=F.hitung(resep, qty, state, materials))
