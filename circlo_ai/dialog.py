"""Dialog manager: state machine discovery -> rekomendasi -> pendampingan.
Alur dikendalikan KODE (bukan model) supaya konsisten; model hanya merangkai kalimat."""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import asdict, dataclass, field

from . import facts as F
from . import responder as R
from .catalog import region_candidates, resolve_provinsi
from .slots import extract_slots, parse_quantity

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
ORDINAL = {"pertama": 1, "kesatu": 1, "kedua": 2, "ketiga": 3}
STOP = {"dari", "bekas", "sisa", "dan", "untuk", "dengan", "yang", "atau", "dalam", "pada", "bahan"}


def _tokens(s: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", s.lower()) if len(w) >= 3 and w not in STOP}


def _ordinal(t: str) -> int | None:
    m = re.search(r"\b(?:nomor|no\.?|opsi|ide|pilihan|yang)\s*(\d)\b(?!\s*(?:(?:juta|jt|ribu|rb|k)\b|\d))", t)
    if m:
        return int(m.group(1))
    m = re.search(r"(?:\byang\s+|^\s*)(pertama|kesatu|kedua|ketiga)\b", t)
    return ORDINAL[m.group(1)] if m else None


@dataclass
class State:
    fase: str = "discovery"           # discovery | rekomendasi | pendampingan
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

    def to_dict(self) -> dict:   # cocok disimpan ke ai_conversation.slots (jsonb)
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "State":
        return cls(**d)


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

    @staticmethod
    def _classify(t: str, sl, qty, state: State, explicit=None) -> str | None:
        tl = t.lower()
        if "qty" in state.awaiting and qty is not None:
            return "hitung"
        if RE_HITUNG.search(tl):
            return "hitung"
        if RE_MULAI.search(tl) or (RE_MULAI_UMUM.search(tl) and state.fase != "discovery"):
            return "mulai"
        if RE_CARA.search(tl) and (explicit or RE_DOMAIN.search(tl)):
            return "cara"
        if (RE_MODAL_Q.search(tl) and sl.modal is None and not sl.modal_skip
                and not sl.modal_asumsi):
            return "modal_q"
        return None

    # ---------- utama ----------
    def handle(self, state: State, text: str) -> Reply:
        sl = extract_slots(text, awaiting=state.awaiting)
        qty = parse_quantity(text)
        materials = self.catalog.materials()
        explicit, how = self._resolve_resep(text, state)
        intent = self._classify(text, sl, qty, state, explicit)

        # slot kota & modal selalu diperbarui bila disebut
        changed = False
        if sl.kota and sl.kota != state.kota:
            state.kota, state.provinsi, changed = sl.kota, resolve_provinsi(sl.kota, materials), True
        if sl.modal is not None and sl.modal != state.modal:
            state.modal, state.modal_asumsi, state.modal_dilewati = sl.modal, sl.modal_asumsi, False
            changed = True
        elif sl.modal_skip and state.modal is None:
            state.modal_dilewati = True
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
        cands, _ = region_candidates(resep, materials, state.kota, state.provinsi)
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
