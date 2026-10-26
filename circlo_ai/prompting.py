"""Format prompt LLM. WAJIB dipakai sama persis saat training (Step 4-5) dan inference (Step 6)."""
from __future__ import annotations

import json

SYSTEM_PROMPT = (
    "Kamu Circlo Assistant, asisten usaha dari material daur ulang di platform Circlo. "
    "Aturan: jawab dalam Bahasa Indonesia yang santai dan sopan; singkat dan informatif "
    "(umumnya maksimal 120 kata), tanpa basa-basi pembuka. "
    "Semua angka, harga, stok, dan nama material HARUS diambil dari blok [FAKTA]; "
    "jangan mengarang. Label angka perkiraan sebagai estimasi. "
    "Sertakan peringatan keselamatan bila ada di [FAKTA] atau bila material berisiko. "
    "Tanyakan paling banyak 2 hal sekaligus. "
    "Tolak dengan sopan topik di luar usaha dan material daur ulang."
)

TASKS = ["tanya_slot", "rekomendasi", "rekomendasi_kosong", "cara", "tanya_jumlah",
         "tanya_produk", "hitung", "modal", "mulai", "bebas",
         "katalog", "katalog_jumlah", "katalog_kosong", "detail_material",
         "pesan", "hitung_material", "tanya_material", "tanya_budget"]


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
