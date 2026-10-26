from __future__ import annotations

import json
import re
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_MAP_PATH = _ROOT / "public" / "data" / "material_images.json"
_category_cache: dict | None = None


def _load() -> dict:
    global _category_cache
    if _category_cache is None:
        try:
            _category_cache = json.loads(_MAP_PATH.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            _category_cache = {}
    return _category_cache


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", (text or "").lower())).strip()


def category_slug(category: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (category or "lainnya").lower()).strip("-")
    return slug or "lainnya"


def _category_image(category: str) -> str:
    images = _load().get("category_images", {})
    entry = images.get(category) or images.get("Lainnya") or {}
    return entry.get("url") or f"/images/materials/{category_slug(category)}.svg"


def image_meta_for(material: dict) -> dict:
    data = _load()
    mid = str(material.get("id_material") or "")
    entries = data.get("materials", {})
    if mid and mid in entries:
        entry = entries[mid]
        return {
            "url": entry.get("image_url") or _category_image(material.get("kategori", "")),
            "source": entry.get("source") or "CIRCLO",
            "license": entry.get("license") or "Aset lokal proyek",
            "match_type": entry.get("match_type") or "material",
            "alt": f"Ilustrasi {material.get('kategori') or 'material'}: {material.get('nama_material') or 'material'}",
        }

    name = _normalize(material.get("nama_material", ""))
    exact = data.get("exact_images", {})
    if name and name in exact:
        entry = exact[name]
        return {
            "url": entry["url"],
            "source": entry.get("source") or "CIRCLO",
            "license": entry.get("license") or "Aset lokal proyek",
            "match_type": "exact_name",
            "alt": f"Foto material: {material.get('nama_material')}",
        }

    for rule in data.get("keyword_rules", []):
        if any(word in name for word in rule.get("words", [])):
            return {
                "url": rule["url"],
                "source": rule.get("source") or "CIRCLO",
                "license": rule.get("license") or "Aset lokal proyek",
                "match_type": "keyword",
                "alt": f"Foto material: {material.get('nama_material')}",
            }

    category = material.get("kategori", "")
    return {
        "url": _category_image(category),
        "source": "CIRCLO",
        "license": "Ilustrasi kategori, bukan foto material",
        "match_type": "category_fallback",
        "alt": f"Ilustrasi kategori {category or 'material'}: {material.get('nama_material') or 'material'}",
    }


def image_for(material: dict) -> str:
    return image_meta_for(material)["url"]
