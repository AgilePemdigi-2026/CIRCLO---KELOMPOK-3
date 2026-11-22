"""Tes offline format respons Knowledge Graph (tanpa jaringan/LLM/Supabase).

Jalankan dari root proyek:  python scripts/test_kg_format.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from circlo_ai import facts as F  # noqa: E402
from circlo_ai import responder as R  # noqa: E402
from circlo_ai.knowledge_graph import KnowledgeGraph  # noqa: E402

RESEP = json.loads((ROOT / "dataset" / "catalog_snapshot.json").read_text(encoding="utf-8"))["resep"]
KG = KnowledgeGraph.from_recipes(RESEP)


class FakeState:
    kota = None
    provinsi = None
    scope_all = True


def check(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(msg)
    print("  ok -", msg)


def test_steps():
    print("[langkah]")
    s = R._kg_steps("Cuci, potong ukuran 1,5x1,2 m, jahit tepi atau rekatkan dengan heat sealer, tambahkan tali pengikat.")
    check(len(s) == 4, f"koma desimal tidak dipecah (4 langkah) -> {s}")
    check(s[1] == "Potong ukuran 1,5x1,2 m", "langkah ke-2 utuh")
    check(R._kg_steps(None) == [] and R._kg_steps("") == [], "kosong -> []")


def test_pemanfaatan():
    print("[kg_pemanfaatan]")
    pw = KG.pathways_for_category("Spanduk", limit=3)
    t = R.kg_pemanfaatan_text("Spanduk", pw)
    check(t.startswith("### Jalur pemanfaatan limbah Spanduk"), "heading")
    check("- Jalur: Spanduk → Cuci" in t, "jalur KG kategori → aksi → produk")
    check("- Proses:\n  1. " in t, "proses bernomor")
    check("- K3: " in t and "- Kebutuhan bahan: 0,6 m2 per unit, susut 20%" in t, "K3 + bahan + susut dari data")
    check("**Langkah selanjutnya**" in t and "*Sumber: Knowledge Graph CIRCLO" in t, "next step + sumber")
    check("*\"cari material spanduk\"*" in t, "saran memuat kata domain")


def test_produk_dan_alasan():
    print("[kg_produk]")
    pw = KG.search_products("tote bag dari kain perca", limit=2)
    check(bool(pw), "KG menemukan produk")
    t = R.kg_produk_text("tote bag dari kain perca", pw)
    check("**Paling relevan:**" in t and "- Alasan cocok:" in t, "produk terbaik + alasan dari skor KG")
    check("harga" not in t.lower() and "stok:" not in t.lower(), "tidak ada klaim harga/stok katalog")
    check("\n\n\n" not in t, "tidak ada baris kosong berlebih")
    check("Estimasi modal awal: Rp" in t and "(kasar" in t, "estimasi modal berlabel kasar, sama dengan modul modal")


def test_proses_eksplorasi_sirkular_alternatif_kosong():
    print("[lain-lain]")
    pw = KG.pathways_for_category("Plastik", limit=2)
    t = R.kg_proses_text("botol plastik", pw)
    check("### Proses pengolahan: botol plastik" in t and "1. " in t, "proses")
    ide = KG.ideas(limit=4)
    t = R.kg_eksplorasi_text(ide)
    check(t.count("**1.") == 1 and "→" in t and "- Proses:" not in t, "eksplorasi ringkas (tanpa proses penuh)")
    t = R.kg_sirkular_text(KG.categories, ide)
    check("1. **Kumpulkan**" in t and "**Contoh jalur dari resep referensi**" in t, "sirkular")
    alt = KG.alternative_keywords("kain katun", kategori="Tekstil", limit=3)
    t = R.kg_alternatif_text("kain katun", "Tekstil", alt)
    check("### Alternatif pengganti kain katun" in t and "dipakai di" in t, "alternatif")
    t = R.kg_tidak_ditemukan_text("proses", "roket nuklir")
    check("Belum ada di Knowledge Graph" in t and "tidak mengarang" in t, "tidak ditemukan jujur")


def test_semua_resep_tidak_error():
    print("[semua resep]")
    n = 0
    for cat in KG.categories:
        pw = KG.pathways_for_category(cat, limit=50)
        for text in (R.kg_pemanfaatan_text(cat, pw), R.kg_proses_text(cat, pw), R.kg_produk_text(cat, pw)):
            check_ok = text.startswith("### ") and "*Sumber:" in text
            if not check_ok:
                raise AssertionError(cat)
        n += len(pw)
    check(n == len(RESEP), f"{n} jalur dari {len(KG.categories)} kategori dirender tanpa error")


def test_fakta_llm():
    print("[fakta LLM]")
    pw = KG.pathways_for_category("Spanduk", limit=1)
    f = F.kg_proses("tote bag", pw, FakeState())
    j = f["jalur"][0]
    check(j["rantai"].startswith("Spanduk → "), "fakta memuat rantai")
    check(j["langkah_terurut"][0] == "Cuci dan jemur spanduk", "fakta memuat langkah_terurut")
    check(f["sumber_pengetahuan"] == "knowledge_graph", "sumber_pengetahuan tetap")



def test_dialog_tidak_memanggil_fungsi_hilang():
    import re
    print("[kontrak dialog]")
    src = (ROOT / "circlo_ai" / "dialog.py").read_text(encoding="utf-8")
    for mod, name in (("F", F), ("R", R)):
        used = set(re.findall(r"\b%s\.(\w+)" % mod, src))
        missing = sorted(u for u in used if not hasattr(name, u))
        check(not missing, f"semua {mod}.* yang dipanggil dialog.py ada (hilang: {missing})")


def main():
    test_dialog_tidak_memanggil_fungsi_hilang()
    test_steps()
    test_pemanfaatan()
    test_produk_dan_alasan()
    test_proses_eksplorasi_sirkular_alternatif_kosong()
    test_semua_resep_tidak_error()
    test_fakta_llm()

    print("[prompt LLM]")
    import importlib.util
    import types
    try:
        import httpx  # noqa: F401
    except ModuleNotFoundError:  # httpx hanya dipakai saat request; stub cukup untuk tes prompt
        sys.modules["httpx"] = types.ModuleType("httpx")
    spec = importlib.util.spec_from_file_location("circlo_llm_real", ROOT / "scripts" / "circlo_llm.py")
    L = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(L)
    except ModuleNotFoundError as e:  # httpx belum terpasang -> lewati hanya bagian ini
        print("  skip - modul belum terpasang:", e)
    else:
        kg = L._payload("m", "kg_proses", {}, [], "x", False)
        nonkg = L._payload("m", "rekomendasi", {}, [], "x", False)
        check("FORMAT KHUSUS TUGAS kg_*" in kg["messages"][0]["content"], "tugas kg_* memakai format KG")
        check("FORMAT KHUSUS" not in nonkg["messages"][0]["content"], "tugas lain tidak berubah")
        check(kg["max_tokens"] == 900 and nonkg["max_tokens"] == 600, "token KG lebih longgar")
    print("\nSEMUA TES KG FORMAT LULUS")


if __name__ == "__main__":
    main()
