"""
Chat Circlo Assistant lewat terminal (Step 3a).

Jalankan dari folder ini:
    python chat_cli.py            # chat biasa
    python chat_cli.py --debug    # tampilkan intent, slot, dan id_material

Perintah di dalam chat:  /reset  /slots  /quit
Butuh env var SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY (lihat Step 2).
"""
import argparse
import json
import sys

from circlo_ai.catalog import SupabaseCatalog
from circlo_ai.config import get_supabase
from circlo_ai.dialog import DialogManager, State
from circlo_ai.embedder import E5Embedder
from circlo_ai.recommender import Recommender


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()

    if hasattr(sys.stdout, "reconfigure"):  # supaya aman di konsol Windows
        sys.stdout.reconfigure(encoding="utf-8")

    print("Memuat data dan model (run pertama agak lama)...")
    catalog = SupabaseCatalog(get_supabase())
    resep = catalog.resep()
    if not resep:
        sys.exit("Tabel resep_produk kosong. Jalankan step2_seed_data.sql dulu.")
    dm = DialogManager(catalog, Recommender(E5Embedder(), resep))
    state = State()

    print("\nCirclo Assistant siap. Ketik /reset, /slots, atau /quit.\n")
    while True:
        try:
            text = input("Kamu: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not text:
            continue
        if text == "/quit":
            break
        if text == "/reset":
            state = State()
            print("(percakapan direset)\n")
            continue
        if text == "/slots":
            print(json.dumps(state.to_dict(), indent=2, ensure_ascii=False), "\n")
            continue

        reply = dm.handle(state, text)
        print(f"\nAI: {reply.text}\n")
        if args.debug:
            print(f"[debug] intent={reply.intent} fase={state.fase} "
                  f"material_ids={reply.material_ids} resep_ids={reply.resep_ids}\n")


if __name__ == "__main__":
    main()
