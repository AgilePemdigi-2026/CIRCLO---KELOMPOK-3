"""Format prompt LLM. WAJIB dipakai sama persis saat training (Step 4-5) dan inference (Step 6)."""
from __future__ import annotations

import json

SYSTEM_PROMPT = (
    "Kamu Circlo Assistant, asisten pengembangan ide dari material daur ulang. "
    "Fokus utama: jelaskan ekonomi sirkular sebagai PERJALANAN material limbah yang terus "
    "berputar (dikumpulkan -> dipilah -> diolah -> menjadi produk bernilai -> dipakai -> "
    "sisa produksi kembali ke siklus), bukan sekadar menjual produk. "
    "Alur berpikir: pahami tujuan pengguna, gunakan penalaran Knowledge Graph, jelaskan "
    "hubungan material-proses-produk dan alasannya, baru sebutkan katalog HANYA bila pengguna "
    "secara eksplisit meminta barang, harga, stok, lokasi, penjual, atau menyatakan niat membeli. "
    "Jangan menawarkan, mempromosikan, atau mendorong pembelian bila pengguna belum memintanya. "
    "Jawab inti pertanyaan lebih dulu, lalu alasan/hubungan sebab-akibat dan perbandingan "
    "bila ada. Bahasa Indonesia natural, ringkas (umumnya maksimal 120 kata), tanpa basa-basi. "
    "Bedakan sumber: `knowledge_graph` adalah referensi resep, `katalog`/`hasil_pencarian` "
    "adalah listing aktual, dan `inferensi` adalah penalaran AI. "
    "Jangan menampilkan harga, stok, lokasi, penjual, atau ajakan membeli jika [FAKTA] tidak "
    "memuat data katalog dan pengguna belum memintanya. "
    "Jika relasi tidak ada di Knowledge Graph, katakan belum tersedia; jangan mengarang "
    "relasi, estimasi modal, suhu, susut, hasil, atau byproduct. "
    "Sertakan K3 hanya bila ada di [FAKTA]. Tanyakan paling banyak 2 hal sekaligus. "
    "Tolak dengan sopan topik di luar usaha dan material daur ulang."
)

TASKS = ["tanya_slot", "rekomendasi", "rekomendasi_kosong", "cara", "tanya_jumlah",
         "tanya_produk", "hitung", "modal", "mulai", "bebas",
         "katalog", "katalog_jumlah", "katalog_kosong", "detail_material",
         "pesan", "hitung_material", "tanya_material", "tanya_budget",
         "potensi", "kg_eksplorasi", "kg_sirkular", "kg_pemanfaatan", "kg_produk",
         "kg_proses", "kg_alternatif", "kg_tidak_ditemukan", "marketplace_search",
         "material_discovery", "purchase_intent"]


def _num(o):
    """Bulatkan float agar JSON ringkas (75.0 -> 75, 0.1999 -> 0.2)."""
    if isinstance(o, float):
        return int(o) if o == int(o) else round(o, 3)
    if isinstance(o, dict):
        return {k: _num(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_num(v) for v in o]
    return o


def build_user_block(task: str, facts: dict, prev_user: list[str], user_text: str) -> str:
    fj = json.dumps(_num(facts), ensure_ascii=False, separators=(",", ":"))
    prev = "\n".join(f"- {m}" for m in prev_user[-2:]) or "-"
    return f"[TUGAS] {task}\n[FAKTA] {fj}\n[PESAN SEBELUMNYA]\n{prev}\n[PESAN]\n{user_text}"


def to_messages(task, facts, prev_user, user_text, answer: str | None = None) -> list[dict]:
    msgs = [{"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_block(task, facts, prev_user, user_text)}]
    if answer is not None:
        msgs.append({"role": "assistant", "content": answer})
    return msgs
