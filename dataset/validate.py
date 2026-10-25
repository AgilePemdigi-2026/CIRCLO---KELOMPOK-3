"""
Pemeriksa kualitas dataset: jawaban harus ringkas, berbasis FAKTA, dan lengkap.

    python dataset/validate.py dataset/answers.jsonl                  # laporan + file _pass/_review/_fail
    python dataset/validate.py dataset/answers.jsonl --split          # + train/val/test (format chat)
    python dataset/validate.py dataset/answers.jsonl --split --include-review   # sertakan yang sudah kamu review manual

Status: PASS (otomatis lolos) | REVIEW (perlu dicek manusia: angka di luar fakta pada pertanyaan terbuka)
        | FAIL (dibuang: halusinasi angka, terlalu panjang, elemen wajib hilang, dll.)
"""
import argparse
import hashlib
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from circlo_ai.prompting import to_messages  # noqa: E402
from utterances import alias  # noqa: E402

MAX_WORDS = {"tanya_slot": 45, "tanya_jumlah": 30, "tanya_produk": 40, "rekomendasi": 150,
             "rekomendasi_kosong": 40, "cara": 115, "hitung": 115, "modal": 75, "mulai": 150,
             "bebas": 130}
SAFETY = re.compile(r"hati-hati|masker|sarung tangan|keselamatan|aman|apd|ventilasi|waspada|pelindung"
                    r"|kacamata|pakai|gunakan|jangan|hindari|pastikan", re.I)
GREETING = re.compile(r"^\W*(halo|hai|hi|selamat|tentu saja|dengan senang hati)\b|sebagai (ai|asisten ai|model)", re.I)
ENGLISH = re.compile(r"\b(the|and|you|your|this|that|with|please|sure)\b", re.I)
REFUSAL = re.compile(r"maaf|belum bisa|di luar|fokus|khusus|tidak bisa|nggak bisa|tak bisa", re.I)
ESTIMATE = re.compile(r"estimasi|perkiraan|sekitar|kira-kira|±|kasar", re.I)


# ---------- ekstraksi angka ----------
def _parse_token(tok: str):
    tok = tok.strip(".,")
    if not tok:
        return None
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", tok):
        return float(tok.replace(".", ""))
    if re.fullmatch(r"\d+,\d+", tok):
        return float(tok.replace(",", "."))
    if re.fullmatch(r"\d+\.\d+", tok):
        return float(tok)
    if re.fullmatch(r"\d+", tok):
        return float(tok)
    return None


def numbers_in_text(text: str) -> list[float]:
    out = []
    for m in re.finditer(r"(?<![\w.,])(\d+(?:[.,]\d+)*)", text.lower()):
        v = _parse_token(m.group(1))
        if v is None:
            continue
        unit = re.match(r"\s*(juta|jt|ribu|rb)\b", text.lower()[m.end():])
        if unit:
            v *= 1e6 if unit.group(1) in ("juta", "jt") else 1e3
        out.append(v)
    return out


def numbers_in_facts(o) -> set:
    s = set()
    if isinstance(o, bool):
        return s
    if isinstance(o, (int, float)):
        s.add(float(o))
    elif isinstance(o, str):
        s.update(numbers_in_text(o))
    elif isinstance(o, dict):
        for v in o.values():
            s |= numbers_in_facts(v)
    elif isinstance(o, list):
        for v in o:
            s |= numbers_in_facts(v)
    return s


def grounded(v: float, allowed: set) -> bool:
    if v <= 10 and float(v).is_integer():
        return True   # penomoran daftar, "2 hal", dll.
    return any(abs(v - a) <= max(0.06, 0.005 * abs(a)) for a in allowed)


def _has_number(answer_nums, target) -> bool:
    return target is not None and any(abs(n - target) <= max(0.06, 0.005 * abs(target)) for n in answer_nums)


def _contains(answer: str, phrase: str) -> bool:
    return phrase.lower() in answer.lower()


# ---------- aturan ----------
def check(rec: dict):
    """Return (status, [alasan])."""
    a, task, kind, f = rec["answer"].strip(), rec["task"], rec["kind"], rec["facts"]
    fails, reviews = [], []
    words = len(a.split())
    limit = 50 if kind == "luar_topik" else MAX_WORDS.get(task, 130)
    if words < 3:
        fails.append("terlalu pendek")
    if words > limit:
        fails.append(f"terlalu panjang ({words}>{limit} kata)")
    if GREETING.search(a):
        fails.append("pembuka basa-basi / sebut diri AI")
    if "**" in a or "##" in a:
        fails.append("pakai markdown tebal/judul")
    if len(ENGLISH.findall(a)) >= 2:
        fails.append("bukan Bahasa Indonesia")

    # angka harus berasal dari FAKTA / pesan user
    allowed = numbers_in_facts(f)
    for t in [rec["user_text"]] + list(rec.get("prev_user", [])):
        allowed |= set(numbers_in_text(t))
    nums = numbers_in_text(a)
    bad = [n for n in nums if not grounded(n, allowed)]
    if task in ("tanya_slot", "tanya_jumlah"):
        bad = []   # contoh angka dalam pertanyaan ("misalnya 5 juta") tidak berbahaya
    if bad:
        (reviews if kind in ("bebas", "luar_topik") else fails).append(f"angka di luar fakta: {bad[:4]}")

    # elemen wajib per tugas
    al = a.lower()
    if kind == "luar_topik":
        if re.search(r"\d", a):
            fails.append("luar_topik: ada angka")
        if not REFUSAL.search(a):
            fails.append("luar_topik: tidak menolak dengan sopan")
    elif task == "tanya_slot":
        if "?" not in a:
            fails.append("tanya_slot: tidak ada pertanyaan")
        if a.count("?") > 2:
            fails.append("tanya_slot: lebih dari 2 pertanyaan")
        if "kota" in f["kurang"] and not re.search(r"kota|daerah|lokasi|domisili|tinggal|mana", al):
            fails.append("tanya_slot: tidak menanyakan kota")
        if "modal" in f["kurang"] and not re.search(r"modal|budget|dana|anggaran", al):
            fails.append("tanya_slot: tidak menanyakan modal")
    elif task == "tanya_jumlah":
        if "?" not in a or not _contains(a, alias(f["produk"])):
            fails.append("tanya_jumlah: tidak menanyakan jumlah produk tsb")
    elif task == "tanya_produk":
        miss = [o["produk"] for o in f["opsi"] if not _contains(a, alias(o["produk"]))]
        if miss:
            fails.append(f"tanya_produk: opsi hilang {len(miss)}")
    elif task == "rekomendasi_kosong":
        if "belum" not in al:
            fails.append("rekomendasi_kosong: harus bilang belum ada")
    elif task == "rekomendasi":
        miss = [r["produk"] for r in f["rekomendasi"] if not _contains(a, alias(r["produk"]))]
        if miss:
            fails.append(f"rekomendasi: produk hilang {len(miss)}")
        if not any(_contains(a, b["nama"].split(" (")[0][:18]) or _contains(a, b["nama"].split()[0])
                   for r in f["rekomendasi"] for b in r["bahan"]):
            fails.append("rekomendasi: tidak menyebut bahan dari katalog")
        if f["wilayah"]["level"] != "kota" and not re.search(r"belum ada|se-|seluruh|katalog|provinsi|jawa timur", al):
            fails.append("rekomendasi: tidak jujur soal stok di luar kota user")
        if f["modal_kurang"] and not re.search(r"di atas|kurang|terjangkau|melebihi|belum cukup", al):
            fails.append("rekomendasi: modal kurang tidak disebut")
        if f["modal_asumsi"] and "asum" not in al:
            fails.append("rekomendasi: asumsi modal tidak disebut")
    elif task == "cara":
        if kind not in ("bebas",):
            if not _contains(a, alias(f["produk"])):
                fails.append("cara: tidak menyebut produk")
            gist = {w for w in re.findall(r"[a-z]{5,}", (f.get("langkah") or "").lower())}
            if gist and len(gist & set(re.findall(r"[a-z]{5,}", al))) < min(3, len(gist)):
                fails.append("cara: langkah dari fakta tidak tercermin")
        if f.get("k3") and not SAFETY.search(a):
            (reviews if kind == "bebas" else fails).append("cara: peringatan keselamatan hilang")
    elif task == "hitung":
        if not f["ada_bahan"]:
            if "belum" not in al:
                fails.append("hitung: harus bilang bahan belum ada")
        else:
            if not _has_number(nums, f["kebutuhan"]):
                fails.append("hitung: angka kebutuhan tidak muncul")
            if not _has_number(nums, f.get("total_biaya")):
                fails.append("hitung: total biaya tidak muncul")
            if f.get("kekurangan", 0) > 1e-9 and not re.search(r"kurang|stok", al):
                fails.append("hitung: kekurangan stok tidak disebut")
            if f.get("melebihi_modal") and "modal" not in al:
                fails.append("hitung: biaya melebihi modal tidak disebut")
            if not ESTIMATE.search(a):
                fails.append("hitung: tidak dilabeli estimasi")
    elif task == "modal":
        if f.get("estimasi_modal") and not _has_number(nums, f["estimasi_modal"]):
            fails.append("modal: angka estimasi tidak muncul")
        if not ESTIMATE.search(a):
            fails.append("modal: tidak dilabeli estimasi")
        if f.get("cukup") is False and "kurang" not in al:
            fails.append("modal: kekurangan tidak disebut")
    elif task == "mulai" and kind != "bebas":
        if "nib" not in al:
            fails.append("mulai: NIB tidak disebut")
        kw = ["prototipe", "uji pasar", "pre-order", "hpp", "harga jual", "oss", "brand", "pemasaran",
              "marketplace", "media sosial", "bertahap"]
        if sum(k in al for k in kw) < 3:
            fails.append("mulai: poin umum kurang lengkap")

    status = "FAIL" if fails else ("REVIEW" if reviews else "PASS")
    return status, fails + reviews


# ---------- split ----------
def bucket(group: str) -> str:
    h = int(hashlib.md5(group.encode()).hexdigest()[:8], 16) % 100
    return "train" if h < 80 else ("val" if h < 90 else "test")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--split", action="store_true")
    ap.add_argument("--include-review", action="store_true")
    a = ap.parse_args()

    rows = [json.loads(l) for l in open(a.path, encoding="utf-8") if l.strip()]
    rows = [r for r in rows if r.get("answer")]
    base = os.path.splitext(a.path)[0]
    buckets, per_task, reasons = defaultdict(list), defaultdict(Counter), Counter()
    for r in rows:
        st, why = check(r)
        r["status"], r["reasons"] = st, why
        buckets[st].append(r)
        per_task[r["task"] + ("/luar_topik" if r["kind"] == "luar_topik" else "")][st] += 1
        for w in why:
            reasons[re.sub(r"[\d\[\]\.]+", "#", w)] += 1
    for st in ("PASS", "REVIEW", "FAIL"):
        with open(f"{base}_{st.lower()}.jsonl", "w", encoding="utf-8") as f:
            for r in buckets[st]:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"{len(rows)} jawaban diperiksa: " + ", ".join(f"{k}={len(buckets[k])}" for k in ("PASS", "REVIEW", "FAIL")))
    print("\nper tugas:")
    for t, c in sorted(per_task.items()):
        print(f"  {t:22s} PASS {c['PASS']:4d} | REVIEW {c['REVIEW']:3d} | FAIL {c['FAIL']:3d}")
    if reasons:
        print("\nalasan terbanyak:")
        for w, n in reasons.most_common(8):
            print(f"  {n:4d}  {w}")

    if a.split:
        keep = buckets["PASS"] + (buckets["REVIEW"] if a.include_review else [])
        out = defaultdict(list)
        for r in keep:
            out[bucket(r["group"])].append(r)
        d = os.path.dirname(a.path) or "."
        for name, lst in out.items():
            with open(os.path.join(d, f"{name}.jsonl"), "w", encoding="utf-8") as f:
                for r in lst:
                    m = {"messages": to_messages(r["task"], r["facts"], r["prev_user"], r["user_text"], r["answer"]),
                         "meta": {"id": r["id"], "task": r["task"], "kind": r["kind"]}}
                    f.write(json.dumps(m, ensure_ascii=False) + "\n")
        print("\nsplit (berdasarkan grup kota|produk, bukan acak per baris):")
        for name in ("train", "val", "test"):
            print(f"  {name:5s}: {len(out[name])}  {dict(Counter(r['task'] for r in out[name]))}")


if __name__ == "__main__":
    main()
