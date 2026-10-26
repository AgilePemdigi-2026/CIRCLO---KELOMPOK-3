"""API HTTP (FastAPI) untuk Circlo AI.

Membungkus paket AI Python yang sudah ada (`circlo_ai`) agar bisa dipanggil dari
UI Next.js. Model dimuat sekali saat startup, lalu tiap request memakai
DialogManager.handle() seperti di chat_cli.py.

Setiap balasan memiliki FAKTA terstruktur (reply.task + reply.facts). Bila LLM
eksternal dikonfigurasi (lihat circlo_llm.py), FAKTA itu dirangkai ulang menjadi
jawaban berformat Markdown; bila tidak, dipakai jawaban template dari circlo_ai.

Jalankan (dari root proyek):
    uvicorn circlo_api:app --host 127.0.0.1 --port 8000

Env var (server-side, JANGAN ditaruh di frontend):
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY     (wajib)
    LLM_API_KEY, LLM_MODEL, LLM_BASE_URL        (opsional, untuk jawaban LLM)

Nilai dibaca dari environment. Bila ada file `.env.local` / `.env` di root proyek,
file itu dimuat otomatis (hanya untuk key yang belum ada di environment).
"""
from __future__ import annotations

import json
import os
import sys
import threading
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

import circlo_llm
from circlo_ai.catalog import SupabaseCatalog, material_search, region_candidates, search_materials_semantic
from circlo_ai.dialog import DialogManager, State
from circlo_ai.embedder import E5Embedder
from circlo_ai.images import image_meta_for
from circlo_ai.recommender import Recommender

MAX_TEXT_LEN = 2000
HISTORY_LEN = 10
CARD_FIELDS = ("id_material", "id_seller", "nama_material", "kategori", "harga", "satuan",
               "stok", "kota", "provinsi", "lokasi", "deskripsi_material")


def _load_env_file(path: Path) -> None:
    """Muat KEY=VALUE sederhana dari file .env. Environment yang sudah ada menang."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.lstrip("\ufeff").strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


_ROOT = _SCRIPT_DIR.parent
_load_env_file(_ROOT / ".env.local")
_load_env_file(_ROOT / ".env")

_resources: dict = {}
_sessions: dict[str, dict] = {}
_lock = threading.Lock()
_catalog_refreshed_at = 0.0
CATALOG_TTL = 5.0


def _refresh_catalog(force: bool = False) -> None:
    global _catalog_refreshed_at
    catalog = _resources.get("catalog")
    if not catalog:
        return
    now = time.time()
    if not force and now - _catalog_refreshed_at < CATALOG_TTL:
        return
    data = catalog.load()
    _resources["materials"] = data["materials"]
    _resources["stats"] = data["stats"]
    _resources["by_id"] = {m["id_material"]: m for m in data["materials"]}
    _catalog_refreshed_at = now


@asynccontextmanager
async def lifespan(app: FastAPI):
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY sebelum menjalankan API."
        )

    from supabase import create_client

    catalog = SupabaseCatalog(create_client(url, key))
    resep = catalog.resep()
    if not resep:
        raise RuntimeError("Tabel resep_produk kosong. Jalankan step2_seed_data.sql dulu.")

    _resources["catalog"] = catalog
    _refresh_catalog(force=True)
    embedder = E5Embedder()
    _resources["embedder"] = embedder
    _resources["dm"] = DialogManager(catalog, Recommender(embedder, resep))
    yield
    _resources.clear()
    _sessions.clear()


app = FastAPI(title="Circlo AI API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class ChatIn(BaseModel):
    text: str
    session_id: str | None = None


class EmbedIn(BaseModel):
    text: str
    type: str = "query"  # "query" or "passage"


class ResetIn(BaseModel):
    session_id: str


def _card(m: dict) -> dict:
    card = {k: m.get(k) for k in CARD_FIELDS}
    image = image_meta_for(m)
    card.update({
        "image_url": image["url"],
        "image_source": image["source"],
        "image_license": image["license"],
        "image_match_type": image["match_type"],
        "image_alt": image["alt"],
    })
    return card


def _cards_for(material_ids: list) -> list[dict]:
    by_id = _resources.get("by_id", {})
    out, seen = [], set()
    for mid in material_ids or []:
        if mid in seen or mid not in by_id:
            continue
        seen.add(mid)
        out.append(_card(by_id[mid]))
    return out


THIN_TASKS = {"tanya_slot", "tanya_produk"}


def _retrieve(dm: DialogManager, state: State, text: str, materials: list, limit: int = 4):
    """Cari material katalog yang relevan dengan teks user memakai retrieval yang sudah ada
    (kemiripan resep dari embedder + region_candidates). Return None bila tidak ada."""
    reco = getattr(dm, "reco", None)
    if reco is None or not materials:
        return None
    try:
        sims = reco.similarities(text)
    except Exception:
        return None

    items, seen, produk = [], set(), []
    for rid, _score in sorted(sims.items(), key=lambda kv: kv[1], reverse=True):
        resep = reco.by_id.get(rid)
        if not resep:
            continue
        cands, _level = region_candidates(resep, materials, state.kota, state.provinsi)
        if not cands:
            continue
        if resep["nama_produk"] not in produk:
            produk.append(resep["nama_produk"])
        for m in cands[:2]:
            if m["id_material"] in seen:
                continue
            seen.add(m["id_material"])
            items.append({
                "id_material": m["id_material"],
                "nama_material": m["nama_material"], "kategori": m["kategori"],
                "harga": m["harga"], "satuan": m["satuan"], "stok": m["stok"],
                "kota": m["kota"], "untuk_produk": resep["nama_produk"],
            })
        if len(items) >= limit:
            break
    if not items:
        return None
    return {"kota": state.kota, "material": items[:limit], "produk_terkait": produk[:3]}


def _last_recs_detail(dm: DialogManager, state: State, materials: list, limit: int = 3):
    """Detail rekomendasi terakhir (produk + estimasi modal + bahan termurah di wilayah user),
    agar pertanyaan lanjutan seperti 'yang paling murah yang mana' tetap didukung data."""
    reco = getattr(dm, "reco", None)
    if reco is None or not state.last_recs:
        return None
    out = []
    for rid in state.last_recs[:limit]:
        resep = reco.by_id.get(rid)
        if not resep:
            continue
        cands, _level = region_candidates(resep, materials, state.kota, state.provinsi)
        out.append({
            "produk": resep["nama_produk"],
            "estimasi_modal": resep.get("estimasi_modal"),
            "bahan": [{"nama": m["nama_material"], "harga": m["harga"], "satuan": m["satuan"],
                       "stok": m["stok"], "kota": m["kota"]} for m in cands[:2]],
        })
    return out or None


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.get("/health")
def health():
    return {
        "status": "ok",
        "ready": "dm" in _resources,
        "llm": circlo_llm.is_configured(),
        "materials": len(_resources.get("materials", [])),
    }


@app.post("/embed")
def embed(payload: EmbedIn):
    embedder: E5Embedder = _resources.get("embedder")
    if not embedder:
        raise HTTPException(status_code=503, detail="Embedder not ready")
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text tidak boleh kosong.")
    if payload.type == "passage":
        vec = embedder.passages([text])[0].tolist()
    else:
        vec = embedder.query(text).tolist()
    return {"embedding": vec}


class SearchIn(BaseModel):
    query: str
    kota: str | None = None
    provinsi: str | None = None
    limit: int = 10


@app.post("/search")
def search_materials(payload: SearchIn):
    """Pencarian material berbasis keyword overlap (semantic fallback)."""
    materials = _resources.get("materials", [])
    if not materials:
        raise HTTPException(status_code=503, detail="Material belum dimuat.")
    text = (payload.query or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Query tidak boleh kosong.")
    results = search_materials_semantic(
        text, materials, payload.kota, payload.provinsi, payload.limit
    )
    return {"results": [_card(m) | {"score": round(m.get("_search_score", 0), 3)}
                        for m in results]}


@app.get("/stats")
def stats():
    _refresh_catalog()
    if "stats" not in _resources:
        raise HTTPException(status_code=503, detail="Katalog belum dimuat.")
    return {"stats": _resources["stats"]}


@app.get("/material/{mid}")
def material(mid: int):
    _refresh_catalog()
    m = _resources.get("by_id", {}).get(mid)
    if not m:
        catalog = _resources.get("catalog")
        m = catalog.get_material(mid) if catalog else None
    if not m:
        raise HTTPException(status_code=404, detail="Material tidak ditemukan.")
    return _card(m)


@app.post("/chat")
def chat(payload: ChatIn):
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Pesan tidak boleh kosong.")
    if len(text) > MAX_TEXT_LEN:
        raise HTTPException(status_code=400, detail="Pesan terlalu panjang.")

    dm: DialogManager = _resources["dm"]  # type: ignore[assignment]
    sid = payload.session_id or uuid.uuid4().hex

    with _lock:
        session = _sessions.get(sid)
        if session is None:
            session = {"state": State(), "history": []}
            _sessions[sid] = session
        state = session["state"]
        prev_user = list(session["history"])
        _refresh_catalog()
        reply = dm.handle(state, text)
        session["history"] = (prev_user + [text])[-HISTORY_LEN:]

    facts = dict(reply.facts)
    material_ids = list(reply.material_ids)
    # Bila dialog belum menampilkan material (mis. sedang tanya slot), jalankan retrieval
    # yang sudah ada agar LLM tetap punya konteks katalog. Jangan kirim seluruh dataset.
    if not material_ids and reply.task in THIN_TASKS:
        extra = _retrieve(dm, state, text, _resources.get("materials", []))
        if extra:
            facts["hasil_pencarian"] = extra
            material_ids = [m["id_material"] for m in extra["material"]]
    elif reply.task == "bebas" and state.last_recs:
        detail = _last_recs_detail(dm, state, _resources.get("materials", []))
        if detail:
            facts["rekomendasi_terakhir_detail"] = detail

    meta = {
        "session_id": sid,
        "intent": reply.intent,
        "task": reply.task,
        "material_ids": material_ids,
        "materials": _cards_for(material_ids),
        "resep_ids": reply.resep_ids,
        "selected_material_id": (
            state.selected_material.get("id_material") if state.selected_material else None
        ),
        "total_matches": facts.get("total_cocok"),
        "scope": (facts.get("wilayah") or {}).get("scope"),
        "used_llm": False,
    }

    if not circlo_llm.is_configured():
        def fallback():
            yield _sse("meta", meta)
            yield _sse("delta", {"text": reply.text})
            yield _sse("done", {"used_llm": False})
        return StreamingResponse(fallback(), media_type="text/event-stream")

    def generate():
        yield _sse("meta", meta)
        got = False
        for chunk in circlo_llm.stream(reply.task, facts, prev_user[-2:], text):
            got = True
            yield _sse("delta", {"text": chunk})
        if not got:
            # LLM gagal/tidak tersedia -> jatuh ke jawaban template agar UI tetap terisi.
            yield _sse("delta", {"text": reply.text})
        yield _sse("done", {"used_llm": got})

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/reset")
def reset(payload: ResetIn):
    with _lock:
        _sessions.pop(payload.session_id, None)
    return {"status": "ok"}
