"""
STEP 2b - Generate embedding untuk material Circlo dan simpan ke Supabase.

Install:
    pip install sentence-transformers supabase

Environment variable (jangan di-commit ke Git, jangan taruh di frontend):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY   (Dashboard > Project Settings > API)

Pemakaian:
    python step2_embed_materials.py                # embed material yang belum punya embedding
    python step2_embed_materials.py --all          # embed ulang semua material
    python step2_embed_materials.py --test "mau bikin tas dari bahan sisa" --kota Surabaya
                                                   # uji pencarian RAG (fungsi match_materials)

Catatan: run pertama akan mengunduh model sekitar 1 GB.
"""
import argparse
import os
import sys

from sentence_transformers import SentenceTransformer
from supabase import create_client

MODEL_NAME = "intfloat/multilingual-e5-base"  # 768 dimensi, sesuai step1_ai_schema.sql
BATCH_SIZE = 16


def get_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY terlebih dahulu.")
    return create_client(url, key)


def build_passage(m: dict) -> str:
    """Teks yang di-embed. Prefix 'passage:' wajib untuk model E5."""
    return (
        f"passage: {m['nama_material']}. "
        f"Kategori: {m['kategori']}. "
        f"Lokasi: {m.get('kota') or '-'}, {m.get('provinsi') or '-'}. "
        f"Satuan: {m.get('satuan') or '-'}. "
        f"{m['deskripsi_material']}"
    )


def embed_materials(sb, model, embed_all: bool):
    query = sb.table("material").select(
        "id_material, nama_material, kategori, kota, provinsi, satuan, deskripsi_material"
    )
    if not embed_all:
        query = query.is_("embedding", "null")
    rows = query.execute().data

    if not rows:
        print("Tidak ada material yang perlu di-embed.")
        return

    print(f"Meng-embed {len(rows)} material ...")
    passages = [build_passage(r) for r in rows]
    vectors = model.encode(
        passages,
        batch_size=BATCH_SIZE,
        normalize_embeddings=True,
        show_progress_bar=True,
    ).tolist()

    for row, vec in zip(rows, vectors):
        sb.table("material").update({"embedding": vec}).eq(
            "id_material", row["id_material"]
        ).execute()
    print("Selesai.")


def test_search(sb, model, text: str, kota: str | None, max_harga: float | None, kategori: str | None):
    q_vec = model.encode("query: " + text, normalize_embeddings=True).tolist()
    res = sb.rpc(
        "match_materials",
        {
            "query_embedding": q_vec,
            "p_kota": kota,
            "p_max_harga": max_harga,
            "p_kategori": kategori,
            "match_count": 5,
        },
    ).execute()

    print(f'\nQuery: "{text}"  | kota={kota} max_harga={max_harga} kategori={kategori}')
    if not res.data:
        print("Tidak ada hasil. Cek apakah embedding sudah terisi dan filter terlalu ketat.")
        return
    for r in res.data:
        print(
            f"- [{r['similarity']:.3f}] {r['nama_material']} "
            f"({r['kategori']}, {r['kota']}) "
            f"Rp{float(r['harga']):,.0f}/{r['satuan']}  stok {r['stok']}"
        )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="embed ulang semua material")
    ap.add_argument("--test", type=str, help="uji pencarian dengan kalimat ini")
    ap.add_argument("--kota", type=str, default=None)
    ap.add_argument("--max-harga", type=float, default=None)
    ap.add_argument("--kategori", type=str, default=None)
    args = ap.parse_args()

    sb = get_client()
    model = SentenceTransformer(MODEL_NAME)

    if args.test:
        test_search(sb, model, args.test, args.kota, args.max_harga, args.kategori)
    else:
        embed_materials(sb, model, args.all)


if __name__ == "__main__":
    main()