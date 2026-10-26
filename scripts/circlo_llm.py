"""Klien LLM eksternal (OpenAI-compatible) untuk CIRCLO.

Backend (circlo_api.py) memakai modul ini untuk merangkai kalimat jawaban dari
FAKTA terstruktur yang dihasilkan DialogManager (lihat circlo_ai/facts.py).
Bersifat OPSIONAL: bila LLM_API_KEY tidak diset, `generate()` mengembalikan None
dan backend memakai jawaban template dari circlo_ai/responder.py.

Konfigurasi (letakkan di .env.local, server-side, jangan di frontend):
    LLM_API_KEY   = kunci API (wajib untuk mengaktifkan)
    LLM_MODEL     = nama model (mis. gpt-4o-mini, gemini-2.0-flash, ...)
    LLM_BASE_URL  = endpoint OpenAI-compatible (default https://api.openai.com/v1)

Alias khusus OpenRouter (base URL otomatis ke OpenRouter):
    OPENROUTER_API_KEY, OPENROUTER_MODEL
"""
from __future__ import annotations

import json
import os

import httpx

from circlo_ai.prompting import SYSTEM_PROMPT as BASE_SYSTEM_PROMPT
from circlo_ai.prompting import build_user_block

DEFAULT_BASE_URL = "https://api.openai.com/v1"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "gpt-4o-mini"
TIMEOUT = 60.0
MAX_TOKENS = 600

# Urutan model gratis yang cepat & bukan model "reasoning" (yang token pertamanya lama).
# Model dari env (LLM_MODEL/OPENROUTER_MODEL) selalu dicoba lebih dulu.
FALLBACK_MODELS = [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "cohere/north-mini-code:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
]

SYSTEM_PROMPT = BASE_SYSTEM_PROMPT + (
    " Kamu HANYA boleh memakai informasi dari blok [FAKTA]. Jangan memakai pengetahuan luar "
    "dan JANGAN menyebut nama toko, pasar, grosir, distributor, marketplace, atau pemasok yang "
    "tidak ada di [FAKTA]. Jawab langsung pertanyaan terakhir pengguna; jangan mengulang "
    "pertanyaan pengguna dan jangan memberi daftar langkah generik. Jangan menanyakan kota atau "
    "modal yang sudah diberikan pengguna; tanyakan klarifikasi hanya bila benar-benar diperlukan. "
    "Bila [FAKTA] memuat `hasil_pencarian` (material dari katalog CIRCLO), utamakan menyebut "
    "material itu lengkap dengan harga, kota, dan stoknya. Bila data yang diminta tidak ada di "
    "[FAKTA], katakan singkat bahwa datanya belum tersedia, lalu tawarkan satu langkah alternatif "
    "yang masih didukung [FAKTA]. Format Markdown ringkas: **tebal** untuk nama produk/harga/angka "
    "kunci, `- ` untuk poin. Panjang normal 2-5 kalimat atau maksimal 4 poin; tanpa basa-basi "
    "pembuka, tanpa disclaimer berlebihan, dan tanpa peringatan keselamatan yang tidak ada di [FAKTA]."
)


def _config():
    if (os.environ.get("LLM_API_KEY") or "").strip():
        key, provider = os.environ["LLM_API_KEY"].strip(), "generic"
    elif (os.environ.get("OPENROUTER_API_KEY") or "").strip():
        key, provider = os.environ["OPENROUTER_API_KEY"].strip(), "openrouter"
    else:
        return None

    base = (os.environ.get("LLM_BASE_URL") or "").strip()
    if not base:
        base = OPENROUTER_BASE_URL if provider == "openrouter" else DEFAULT_BASE_URL
    base = base.rstrip("/")

    model = (os.environ.get("LLM_MODEL") or os.environ.get("OPENROUTER_MODEL") or "").strip()
    return key, base, _model_candidates(model)


def _model_candidates(primary: str) -> list[str]:
    models: list[str] = []
    if primary:
        models.append(primary)
    for m in FALLBACK_MODELS:
        if m not in models:
            models.append(m)
    return models or [DEFAULT_MODEL]


def is_configured() -> bool:
    return _config() is not None


def _headers(key: str, base: str) -> dict:
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if "openrouter" in base:
        headers["X-Title"] = "CIRCLO"
        headers["HTTP-Referer"] = os.environ.get("APP_URL", "http://localhost:3000")
    return headers


def _payload(model: str, task: str, facts: dict, prev_user: list[str], user_text: str, stream: bool) -> dict:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_block(task, facts or {}, prev_user, user_text)},
        ],
        "temperature": 0.3,
        "max_tokens": MAX_TOKENS,
    }
    if stream:
        payload["stream"] = True
    reasoning = _reasoning_param(model)
    if reasoning is not None:
        payload["reasoning"] = reasoning
    return payload


# Model yang punya mode "reasoning": matikan agar token konten muncul lebih cepat
# (kualitas tetap sama untuk tugas merangkai FAKTA). Model non-reasoning tidak dikirimi
# parameter ini supaya tidak ditolak provider.
REASONING_HINTS = ("deepseek", "reasoning", "thinking", "-r1")


def _reasoning_param(model: str) -> dict | None:
    if any(h in model.lower() for h in REASONING_HINTS):
        return {"enabled": False}
    return None


_client_instance: httpx.Client | None = None


def _client() -> httpx.Client:
    """Client httpx persisten -> koneksi/TLS di-reuse antar request (lebih cepat)."""
    global _client_instance
    if _client_instance is None:
        _client_instance = httpx.Client(
            timeout=httpx.Timeout(TIMEOUT, connect=10.0),
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
        )
    return _client_instance


def stream(task: str, facts: dict, prev_user: list[str], user_text: str):
    """Yield potongan teks jawaban (streaming). Mengosongkan output bila nonaktif/gagal.

    Mencoba model satu per satu; pindah ke model berikutnya hanya bila BELUM ada
    token yang keluar (menghindari jawaban terpotong/bercampur).
    """
    cfg = _config()
    if cfg is None or not task:
        return
    key, base, models = cfg
    url = f"{base}/chat/completions"
    for model in models:
        emitted = False
        try:
            with _client().stream(
                "POST", url, headers=_headers(key, base),
                json=_payload(model, task, facts, prev_user, user_text, True),
            ) as res:
                if res.status_code != 200:
                    res.read()
                    continue
                for line in res.iter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        obj = json.loads(data)
                    except Exception:
                        continue
                    delta = (obj.get("choices") or [{}])[0].get("delta", {}) or {}
                    chunk = delta.get("content")
                    if chunk:
                        emitted = True
                        yield chunk
            if emitted:
                return
        except Exception:
            if emitted:
                return


def generate(task: str, facts: dict, prev_user: list[str], user_text: str) -> str | None:
    """Rangkai jawaban dari (task, facts) via LLM (tanpa streaming). Return None bila gagal."""
    text = "".join(stream(task, facts, prev_user, user_text)).strip()
    return text or None
