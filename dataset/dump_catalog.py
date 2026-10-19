"""Ambil material & resep dari Supabase ke catalog_snapshot.json (jalankan sekali / saat data berubah).

    python dataset/dump_catalog.py dataset/catalog_snapshot.json
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from circlo_ai.catalog import SupabaseCatalog  # noqa: E402
from circlo_ai.config import get_supabase  # noqa: E402

if __name__ == "__main__":
    cat = SupabaseCatalog(get_supabase())
    data = {"materials": cat.materials(), "resep": cat.resep()}
    json.dump(data, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(data['materials'])} material, {len(data['resep'])} resep -> {sys.argv[1]}")
