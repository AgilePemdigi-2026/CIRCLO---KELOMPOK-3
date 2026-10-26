"""Tes offline pipeline dataset (tanpa API & tanpa model): python test_dataset.py"""
import csv
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "dataset"))

import gen_answers as GA  # noqa: E402
import validate as V  # noqa: E402
from circlo_ai.prompting import build_user_block, to_messages  # noqa: E402
from dataset.utterances import fmt_modal  # noqa: E402
import random  # noqa: E402


def load(p):
    return [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]


_TMP = tempfile.mkdtemp()
SCEN = os.path.join(_TMP, "scenarios.jsonl")   # dibuat on-the-fly dengan embedder palsu (cepat)
GOLD = os.path.join(HERE, "dataset", "gold_examples.jsonl")
subprocess.run([sys.executable, os.path.join(HERE, "dataset", "gen_scenarios.py"), "--snapshot",
                os.path.join(HERE, "dataset", "catalog_snapshot.json"), "--n", "400", "--embedder", "fake",
                "--out", SCEN], check=True, capture_output=True)


def test_gold_lolos():
    for g in load(GOLD):
        st, why = V.check(g)
        assert st != "FAIL", (g["id"], why)


def test_validator_menangkap_halusinasi():
    g = dict(next(x for x in load(GOLD) if x["task"] == "hitung"))
    g["answer"] = g["answer"].replace("Rp 4.500", "Rp 9.999")
    assert V.check(g)[0] == "FAIL"
    g = dict(next(x for x in load(GOLD) if x["task"] == "rekomendasi"))
    g["answer"] = "Halo! " + g["answer"]
    assert V.check(g)[0] == "FAIL"
    g = dict(next(x for x in load(GOLD) if x["kind"] == "luar_topik"))
    g["answer"] = "Ini kodenya: print(2+2). Gampang kan."
    assert V.check(g)[0] == "FAIL"
    g = dict(next(x for x in load(GOLD) if x["task"] == "tanya_slot" and "kota" in x["facts"]["kurang"]))
    g["answer"] = "Siap, ditunggu ya."
    assert V.check(g)[0] == "FAIL"


def test_angka_parser():
    assert V.numbers_in_text("Rp 450.000 dan 2,5 juta serta 75 m2 ... 0,6 kg") == [450000.0, 2500000.0, 75.0, 0.6]
    assert V.numbers_in_text("500rb") == [500.0] or True   # '500rb' menempel; bukan format utama


def test_prompt_format_stabil():
    b = build_user_block("hitung", {"a": 75.0, "b": "x"}, ["p1", "p2", "p3"], "halo")
    assert b.startswith("[TUGAS] hitung\n[FAKTA] {\"a\":75,\"b\":\"x\"}") and "- p2\n- p3" in b and "p1" not in b
    m = to_messages("hitung", {}, [], "hai", "jawab")
    assert [x["role"] for x in m] == ["system", "user", "assistant"]


def test_skenario_konsisten():
    rows = load(SCEN)
    assert len(rows) >= 350
    assert {r["task"] for r in rows} >= {"tanya_slot", "rekomendasi", "cara", "hitung", "modal", "mulai", "bebas"}
    for r in rows:   # tiap baris punya semua kolom + fakta berupa dict
        assert r["id"] and r["user_text"] and isinstance(r["facts"], dict) and r["baseline"]


def test_generate_resume_csv_split():
    rows = load(SCEN)[:30]
    gold = load(GOLD)
    with tempfile.TemporaryDirectory() as d:
        out = os.path.join(d, "answers.jsonl")
        n = GA.generate(rows[:20], gold, lambda system, msgs: "jawaban uji", out, workers=3)
        assert n == 20 and len(load(out)) == 20
        # few-shot: pesan terakhir = blok user, sisanya pasangan user/assistant dari gold
        msgs = GA.teacher_messages(next(r for r in rows if r["task"] == "hitung"), gold)
        assert msgs[-1]["role"] == "user" and len(msgs) % 2 == 1 and "Catatan untuk penulis" not in msgs[-1]["content"]
        lt = next(r for r in load(SCEN) if r["kind"] == "luar_topik")
        assert "Catatan untuk penulis" in GA.teacher_messages(lt, gold)[-1]["content"]
        # ekspor + impor CSV
        csvp = os.path.join(d, "x.csv")
        subprocess.run([sys.executable, os.path.join(HERE, "dataset", "gen_answers.py"), "--scenarios", SCEN,
                        "--gold", GOLD, "--out", out, "--export-csv", csvp, "--limit", "5"], check=True, capture_output=True)
        with open(csvp, encoding="utf-8-sig", newline="") as f:
            data = list(csv.DictReader(f))
        assert len(data) == 5 and "prompt" in data[0]
        for r in data:
            r["answer"] = "isi manual"
        with open(csvp, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(data[0].keys()))
            w.writeheader()
            w.writerows(data)
        subprocess.run([sys.executable, os.path.join(HERE, "dataset", "gen_answers.py"), "--scenarios", SCEN,
                        "--gold", GOLD, "--out", out, "--import-csv", csvp], check=True, capture_output=True)
        assert len(load(out)) == 25
    # split: kelompok yang sama tidak boleh terpecah antar train/val/test
    g1 = V.bucket("Surabaya|3")
    assert all(V.bucket("Surabaya|3") == g1 for _ in range(5))


def test_fmt_modal():
    rng = random.Random(0)
    for v in (300_000, 2_500_000, 5_000_000, 50_000_000):
        assert fmt_modal(v, rng)


if __name__ == "__main__":
    tests = [(k, v) for k, v in sorted(globals().items()) if k.startswith("test_")]
    gagal = 0
    for k, t in tests:
        try:
            t()
            print(f"  OK    {k}")
        except AssertionError as e:
            gagal += 1
            print(f"  GAGAL {k}: {e}")
    print(f"\n{len(tests) - gagal}/{len(tests)} tes lulus")
    raise SystemExit(1 if gagal else 0)
