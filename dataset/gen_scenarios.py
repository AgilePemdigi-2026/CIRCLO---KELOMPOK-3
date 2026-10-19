"""
Buat skenario (INPUT) dataset fine-tuning dengan menjalankan dialog manager sungguhan.
Tiap baris = satu giliran: tugas + fakta + pesan user. Jawaban ideal ditulis di langkah berikutnya.

    python dataset/gen_scenarios.py --snapshot dataset/catalog_snapshot.json --n 1100 --embedder e5
    python dataset/gen_scenarios.py --n 200 --embedder fake      # tes cepat tanpa model

Skenario yang hasilnya TIDAK sesuai niat (mis. kalimat salah dirutekan dialog manager)
dibuang dan dihitung di laporan "dibuang": itu daftar kelemahan router untuk diperbaiki.
"""
import argparse
import copy
import hashlib
import json
import os
import random
import sys
import zlib
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import utterances as U  # noqa: E402
from circlo_ai.dialog import DialogManager, State  # noqa: E402
from circlo_ai.recommender import Recommender  # noqa: E402

KOTA_KATALOG = ["Surabaya", "Sidoarjo", "Gresik", "Malang", "Mojokerto"]
KOTA_LUAR = ["Kediri", "Jember", "Pasuruan", "Jakarta", "Bandung"]
MODALS = [300_000, 500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000, 7_500_000,
          10_000_000, 15_000_000, 25_000_000, 50_000_000]
QTYS = [5, 10, 20, 30, 50, 100, 150, 200, 300, 500, 1000, 2500]
WEIGHTS = {"ask_slot": 12, "rekomendasi": 18, "pilih": 8, "cara": 8, "hitung": 15, "modal": 6,
           "mulai": 8, "bebas": 12, "luar_topik": 5, "rekomendasi_ulang": 4, "tanya_produk": 3}


class SnapshotCatalog:
    def __init__(self, path):
        d = json.load(open(path, encoding="utf-8"))
        self._m, self._r = d["materials"], d["resep"]

    def materials(self):
        return copy.deepcopy(self._m)

    def resep(self):
        return copy.deepcopy(self._r)


class Sim:
    def __init__(self, dm):
        self.dm, self.state, self.prev = dm, State(), []

    def say(self, text):
        prev = list(self.prev)
        reply = self.dm.handle(self.state, text)
        self.prev.append(text)
        return reply, prev


def mk(sim, reply, prev, text, kind):
    st = sim.state
    anchor = st.selected_resep or (st.last_recs[0] if st.last_recs else 0)
    if not anchor:   # belum ada produk: sebar grup berdasarkan teks agar split tetap merata
        anchor = f"u{zlib.crc32(text.lower().encode()) % 60}"
    return {"kind": kind, "task": reply.task, "facts": reply.facts, "prev_user": prev[-2:],
            "user_text": text, "baseline": reply.text, "group": f"{st.kota}|{anchor}"}


def pick_kota(rng):
    return rng.choice(KOTA_KATALOG) if rng.random() < 0.7 else rng.choice(KOTA_LUAR)


def slot_text(rng, kota, modal, minat=None):
    t = rng.choice(U.COMBINED).format(k=kota, m=U.fmt_modal(modal, rng))
    if minat:
        t += ", " + rng.choice(U.MINAT_PHRASES).format(x=minat)
    return U.noisy(t, rng)


class Gen:
    def __init__(self, dm, rng):
        self.dm, self.rng = dm, rng
        self.drop = Counter()

    def new(self):
        return Sim(self.dm)

    # ---- bagian reusable ----
    def reach_rec(self, kind_hint="rekomendasi"):
        """Bawa percakapan sampai rekomendasi. Return (sim, [record...]) atau (None, [])."""
        rng, sim, recs = self.rng, self.new(), []
        kota, modal = pick_kota(rng), rng.choice(MODALS)
        minat = rng.choice(U.MINAT_WORDS) if rng.random() < 0.4 else None
        v = rng.choice(["single", "two", "three", "skip"])
        if v == "single":
            t = slot_text(rng, kota, modal, minat)
            r, p = sim.say(t)
            recs.append(mk(sim, r, p, t, kind_hint))
        else:
            t0 = U.noisy(rng.choice(U.OPEN_FIRST), rng)
            r, p = sim.say(t0)
            if r.task != "tanya_slot":
                self.drop["first_not_ask"] += 1
                return None, []
            recs.append(mk(sim, r, p, t0, "ask_slot"))
            if v == "two":
                t = slot_text(rng, kota, modal, minat)
            elif v == "skip":
                t = U.noisy(rng.choice(U.KOTA_PHRASES).format(k=kota) + ", belum tau modalnya", rng)
            else:  # three: kota dulu, lalu modal
                t1 = U.noisy(rng.choice(U.KOTA_PHRASES).format(k=kota), rng)
                r, p = sim.say(t1)
                if r.task != "tanya_slot":
                    self.drop["three_step1"] += 1
                    return None, []
                recs.append(mk(sim, r, p, t1, "ask_slot"))
                t = U.noisy(rng.choice(U.MODAL_PHRASES).format(m=U.fmt_modal(modal, rng)), rng)
            r, p = sim.say(t)
            recs.append(mk(sim, r, p, t, kind_hint))
        if recs[-1]["task"] not in ("rekomendasi",):
            self.drop["no_rekomendasi"] += 1
            return None, []
        return sim, recs

    def select(self, sim, how=None):
        """Pilih salah satu rekomendasi. Return (record, resep_id) atau (None, None)."""
        rng = self.rng
        n = len(sim.state.last_recs)
        i = rng.randrange(n)
        rid = sim.state.last_recs[i]
        nama = self.dm.reco.by_id[rid]["nama_produk"]
        if (how or rng.choice(["ord", "alias"])) == "ord":
            opts = [(p, k) for p, k in U.ORDINAL_PHRASES if k <= n]
            ph, k = rng.choice(opts)
            rid, t = sim.state.last_recs[k - 1], ph
        else:
            t = rng.choice(["yang {a} aja", "mau coba {a}", "tertarik sama {a}"]).format(a=U.alias(nama))
        t = U.noisy(t, rng)
        r, p = sim.say(t)
        if r.task != "cara" or sim.state.selected_resep != rid:
            self.drop["select_gagal"] += 1
            return None, None
        return mk(sim, r, p, t, "pilih"), rid

    def _fin(self, rec, kind, task, cond=lambda r: True, intent=None):
        if rec["task"] != task or not cond(rec):
            self.drop[f"{kind}_salah_rute"] += 1
            return []
        rec["kind"] = kind
        return [rec]

    # ---- builder per jenis ----
    def b_ask_slot(self):
        rng, sim = self.rng, self.new()
        kota, modal = pick_kota(rng), rng.choice(MODALS)
        v = rng.choice(["both", "no_kota", "no_modal"])
        if v == "both":
            t = rng.choice(U.OPEN_FIRST)
        elif v == "no_kota":
            t = rng.choice(["bingung mau usaha apa, ", "pengen usaha ramah lingkungan, "]) + \
                rng.choice(U.MODAL_PHRASES).format(m=U.fmt_modal(modal, rng))
        else:
            t = rng.choice(["bingung mau usaha apa, ", "pengen usaha dari bahan sisa, "]) + \
                rng.choice(U.KOTA_PHRASES).format(k=kota)
        t = U.noisy(t, rng)
        r, p = sim.say(t)
        want = {"both": ["kota", "modal"], "no_kota": ["kota"], "no_modal": ["modal"]}[v]
        return self._fin(mk(sim, r, p, t, "ask_slot"), "ask_slot", "tanya_slot",
                         lambda x: x["facts"]["kurang"] == want)

    def b_rekomendasi(self):
        sim, recs = self.reach_rec()
        return [recs[-1]] if sim else []

    def b_pilih(self):
        sim, _ = self.reach_rec()
        if not sim:
            return []
        rec, _ = self.select(sim)
        return [rec] if rec else []

    def b_cara(self):
        rng = self.rng
        sim, _ = self.reach_rec()
        if not sim:
            return []
        rec, rid = self.select(sim)
        if not rec:
            return []
        nama = self.dm.reco.by_id[rid]["nama_produk"]
        t = U.noisy(rng.choice(U.CARA_PHRASES).format(p=U.alias(nama)), rng)
        r, p = sim.say(t)
        return self._fin(mk(sim, r, p, t, "cara"), "cara", "cara",
                         lambda x: not x["facts"]["baru_dipilih"])

    def b_hitung(self):
        rng = self.rng
        sim, _ = self.reach_rec()
        if not sim:
            return []
        rec, rid = self.select(sim)
        if not rec:
            return []
        q, u = rng.choice(QTYS), rng.choice(U.UNITS)
        if rng.random() < 0.25:     # user belum menyebut jumlah -> AI bertanya dulu
            t1 = U.noisy(rng.choice(U.HITUNG_NOQ), rng)
            r, p = sim.say(t1)
            if r.task != "tanya_jumlah":
                self.drop["hitung_noq_salah_rute"] += 1
                return []
            ask = mk(sim, r, p, t1, "tanya_jumlah")
            t2 = U.noisy(rng.choice(["{q}", "{q} {u}", "buat {q} {u} aja", "rencananya {q} {u}"])
                         .format(q=q, u=u), rng)
            r, p = sim.say(t2)
            fin = self._fin(mk(sim, r, p, t2, "hitung"), "hitung", "hitung")
            return [ask] + fin if fin else []
        t = U.noisy(rng.choice(U.HITUNG_PHRASES).format(q=q, u=u), rng)
        r, p = sim.say(t)
        return self._fin(mk(sim, r, p, t, "hitung"), "hitung", "hitung",
                         lambda x: x["facts"]["jumlah_unit"] == q)

    def b_modal(self):
        rng = self.rng
        sim, _ = self.reach_rec()
        if not sim:
            return []
        rec, rid = self.select(sim)
        if not rec:
            return []
        nama = self.dm.reco.by_id[rid]["nama_produk"]
        t = U.noisy(rng.choice(U.MODALQ_PHRASES).format(p=U.alias(nama)), rng)
        r, p = sim.say(t)
        return self._fin(mk(sim, r, p, t, "modal"), "modal", "modal")

    def b_mulai(self):
        rng = self.rng
        sim, _ = self.reach_rec()
        if not sim:
            return []
        if rng.random() < 0.5:
            rec, _ = self.select(sim)
            if not rec:
                return []
        t = U.noisy(rng.choice(U.MULAI_PHRASES), rng)
        r, p = sim.say(t)
        return self._fin(mk(sim, r, p, t, "mulai"), "mulai", "mulai")

    def b_bebas(self):
        rng = self.rng
        sim, _ = self.reach_rec()
        if not sim:
            return []
        q, needs = rng.choice(U.BEBAS)
        if needs or rng.random() < 0.4:
            rec, _ = self.select(sim)
            if not rec:
                return []
        t = U.noisy(q, rng)
        r, p = sim.say(t)
        rec = mk(sim, r, p, t, "bebas")
        # pertanyaan dalam lingkup boleh dirutekan ke tugas lain (mis. 'cara'/'mulai');
        # jawabannya tetap harus MENJAWAB pertanyaan itu memakai fakta yang tersedia
        if rec["task"] in ("bebas", "cara", "mulai", "modal"):
            return [rec]
        self.drop["bebas_salah_rute"] += 1
        return []

    def b_luar_topik(self):
        rng = self.rng
        sim = self.new()
        if rng.random() < 0.5:
            sim, _ = self.reach_rec()
            if not sim:
                return []
        t = U.noisy(rng.choice(U.LUAR_TOPIK), rng)
        r, p = sim.say(t)
        return self._fin(mk(sim, r, p, t, "luar_topik"), "luar_topik", "bebas")

    def b_rekomendasi_ulang(self):
        rng = self.rng
        sim, _ = self.reach_rec()
        if not sim:
            return []
        if rng.random() < 0.6:
            m = rng.choice([x for x in MODALS if x != sim.state.modal])
            t = rng.choice(["kalau modalnya {m} gimana?", "ganti deh, modalku {m}",
                            "kalau budgetnya {m} ada yang lain?"]).format(m=U.fmt_modal(m, rng))
        else:
            k = rng.choice([x for x in KOTA_KATALOG if x != sim.state.kota])
            t = rng.choice(["sebenernya aku di {k}", "eh aku domisili {k} ding"]).format(k=k)
        t = U.noisy(t, rng)
        r, p = sim.say(t)
        return self._fin(mk(sim, r, p, t, "rekomendasi_ulang"), "rekomendasi_ulang", "rekomendasi")

    def b_tanya_produk(self):
        rng = self.rng
        sim, _ = self.reach_rec()
        if not sim:
            return []
        pool = [x for x in U.CARA_PHRASES if "{p}" not in x] + U.HITUNG_NOQ
        t = U.noisy(rng.choice(pool), rng)
        r, p = sim.say(t)
        return self._fin(mk(sim, r, p, t, "tanya_produk"), "tanya_produk", "tanya_produk")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--snapshot", default="dataset/catalog_snapshot.json")
    ap.add_argument("--n", type=int, default=1100)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--embedder", choices=["e5", "fake"], default="e5")
    ap.add_argument("--out", default="dataset/scenarios.jsonl")
    a = ap.parse_args()

    cat = SnapshotCatalog(a.snapshot)
    if a.embedder == "e5":
        from circlo_ai.embedder import E5Embedder
        emb = E5Embedder()
    else:
        from circlo_ai.fake import FakeEmbedder
        emb = FakeEmbedder()
    dm = DialogManager(cat, Recommender(emb, cat.resep()))
    rng = random.Random(a.seed)
    g = Gen(dm, rng)
    builders = {k: getattr(g, "b_" + k) for k in WEIGHTS}
    kinds, weights = list(WEIGHTS), list(WEIGHTS.values())

    out, seen, attempts = [], set(), 0
    while len(out) < a.n and attempts < a.n * 30:
        attempts += 1
        for rec in builders[rng.choices(kinds, weights)[0]]():
            key = (rec["task"], rec["user_text"].lower().strip(),
                   hashlib.md5(json.dumps(rec["facts"], sort_keys=True, default=str).encode()).hexdigest())
            if key in seen:
                g.drop["duplikat"] += 1
                continue
            seen.add(key)
            rec["id"] = f"s{len(out):05d}"
            out.append(rec)
            if len(out) >= a.n:
                break

    with open(a.out, "w", encoding="utf-8") as f:
        for r in out:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"{len(out)} skenario -> {a.out}  (percobaan: {attempts})")
    print("per tugas :", dict(Counter(r["task"] for r in out)))
    print("per jenis :", dict(Counter(r["kind"] for r in out)))
    print("dibuang   :", dict(g.drop))


if __name__ == "__main__":
    main()
