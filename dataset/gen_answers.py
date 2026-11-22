"""
Tulis JAWABAN IDEAL untuk tiap skenario memakai LLM "guru" (teacher), dengan contoh emas (gold) sebagai few-shot.
Hasilnya WAJIB lewat validate.py dan dikurasi manual sebelum dipakai melatih model.

Opsi A - otomatis lewat Anthropic API (butuh akun & ANTHROPIC_API_KEY, berbayar; cek harga terbaru):
    pip install anthropic
    python dataset/gen_answers.py --model claude-haiku-5-5 --limit 20      # coba kecil dulu
    python dataset/gen_answers.py --model claude-sonnet-5-5 --tasks bebas  # tugas sulit pakai model lebih kuat
    python dataset/gen_answers.py --dry-run                                # lihat prompt tanpa memanggil API

Opsi B - manual / tanpa API (gratis): ekspor CSV, tulis/paste jawaban (mis. via chat Claude, per 20 baris), impor lagi:
    python dataset/gen_answers.py --export-csv dataset/to_answer.csv
    python dataset/gen_answers.py --import-csv dataset/to_answer.csv

Skrip bisa dilanjutkan (resume): baris yang sudah punya jawaban di answers.jsonl dilewati.
"""
import argparse
import csv
import json
import os
import random
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from circlo_ai.prompting import SYSTEM_PROMPT, build_user_block  # noqa: E402

GUIDE = {
    "tanya_slot": "Tanyakan HANYA slot di fakta.kurang (kota dan/atau modal), maksimal 2 kalimat. Ramah, singkat.",
    "tanya_jumlah": "Tanyakan jumlah unit yang ingin diproduksi untuk produk di fakta. Satu kalimat.",
    "tanya_produk": "Minta pembeli memilih salah satu produk di fakta.opsi (sebut semua opsinya, ringkas).",
    "rekomendasi": ("Jelaskan wilayah yang dipakai (jujur bila bukan kota user), lalu daftar rekomendasi: satu baris per "
                    "produk berisi nama, modal awal (estimasi), dan 1 bahan dari katalog beserta harga/stok/kota. "
                    "Perhatikan modal_kurang, modal_asumsi, status_modal. Tutup dengan 1 ajakan lanjut."),
    "rekomendasi_kosong": "Katakan terus terang belum ada material yang cocok di katalog saat ini. Satu-dua kalimat.",
    "cara": ("Jelaskan cara membuat produk berdasarkan fakta.langkah (boleh dirapikan jadi langkah singkat), sertakan "
             "peringatan k3 bila ada, sebut bahan di katalog, tutup dengan tawaran hitung kebutuhan bahan. "
             "Bila pesan user berupa pertanyaan spesifik, JAWAB pertanyaan itu dulu memakai fakta."),
    "hitung": ("Tampilkan rumus ringkas (jumlah x bahan per unit / (1 - susut)), kebutuhan, rencana beli, total biaya. "
               "Label sebagai estimasi. Sebut kekurangan stok bila ada dan peringatkan bila melebihi modal."),
    "modal": "Sebut estimasi modal awal produk, bandingkan dengan modal user (cukup/kurang berapa), label estimasi.",
    "mulai": ("Berikan langkah memulai usaha dari fakta.poin_umum (boleh diringkas), sertakan catatan k3 produk bila ada. "
              "Bila pesan user menanyakan hal spesifik (izin, harga jual, pelanggan), fokus jawab itu."),
    "bebas": ("Pesan ini pertanyaan terbuka. Bila masih terkait usaha/material daur ulang: jawab praktis dan hati-hati, "
              "pakai fakta bila relevan, akui ketidakpastian ('sebaiknya diuji dulu') dan jangan mengarang angka spesifik. "
              "Bila di luar topik: tolak dengan sopan (maks 2 kalimat) dan tawarkan topik yang bisa dibantu."),
}
KIND_HINT = {
    "luar_topik": "Pesan ini DI LUAR topik usaha/material daur ulang. Tolak dengan sopan, jangan menjawab isinya.",
    "bebas": "Jawab langsung pertanyaan user; fakta hanya dipakai bila relevan.",
}
STYLE = ("\nGaya penulisan: Bahasa Indonesia santai-sopan, tanpa salam pembuka, tanpa markdown tebal/judul, "
         "tanpa menyebut dirimu AI. Tulis HANYA jawaban asisten.")


def teacher_system(task: str) -> str:
    return f"{SYSTEM_PROMPT}\n\nPanduan tugas '{task}': {GUIDE[task]}{STYLE}"


def teacher_messages(rec: dict, gold: list[dict], n_shots: int = 2) -> list[dict]:
    pool = [g for g in gold if g["task"] == rec["task"] and g["id"] != rec["id"]]
    same = [g for g in pool if g.get("kind") == rec["kind"]] or pool   # utamakan jenis yang sama
    shots = random.Random(rec["id"]).sample(same, min(n_shots, len(same)))
    msgs = []
    for g in shots:
        msgs += [{"role": "user", "content": build_user_block(g["task"], g["facts"], g["prev_user"], g["user_text"])},
                 {"role": "assistant", "content": g["answer"]}]
    block = build_user_block(rec["task"], rec["facts"], rec["prev_user"], rec["user_text"])
    if rec["kind"] in KIND_HINT:   # petunjuk untuk penulis; TIDAK masuk ke data latih
        block += f"\n\n(Catatan untuk penulis: {KIND_HINT[rec['kind']]})"
    return msgs + [{"role": "user", "content": block}]


def anthropic_call(model: str):
    import anthropic
    client = anthropic.Anthropic()

    def call(system, messages):
        for attempt in range(4):
            try:
                r = client.messages.create(model=model, max_tokens=500, system=system, messages=messages)
                return "".join(b.text for b in r.content if b.type == "text").strip()
            except Exception as e:  # noqa: BLE001
                print(f"  (percobaan {attempt + 1} gagal: {type(e).__name__}: {e})", file=sys.stderr)
                time.sleep(2 ** attempt)
        return None
    return call


def generate(recs, gold, call, out_path, workers=4):
    lock, done = threading.Lock(), 0

    def work(rec):
        nonlocal done
        ans = call(teacher_system(rec["task"]), teacher_messages(rec, gold))
        if not ans:
            return
        row = dict(rec, answer=ans)
        with lock:
            with open(out_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
            done += 1
            if done % 25 == 0:
                print(f"  {done}/{len(recs)} selesai")

    with ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(work, recs))
    return done


def load(path):
    return [json.loads(l) for l in open(path, encoding="utf-8") if l.strip()] if os.path.exists(path) else []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenarios", default="dataset/scenarios.jsonl")
    ap.add_argument("--gold", default="dataset/gold_examples.jsonl")
    ap.add_argument("--out", default="dataset/answers.jsonl")
    ap.add_argument("--model", default="claude-haiku-5-5")
    ap.add_argument("--tasks", nargs="*", help="batasi tugas, mis. bebas hitung")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--export-csv")
    ap.add_argument("--import-csv")
    a = ap.parse_args()

    scen, gold = load(a.scenarios), load(a.gold)
    answered = {r["id"] for r in load(a.out)}

    if a.import_csv:
        by_id = {r["id"]: r for r in scen}
        n = 0
        with open(a.import_csv, encoding="utf-8-sig", newline="") as f, open(a.out, "a", encoding="utf-8") as out:
            for row in csv.DictReader(f):
                ans = (row.get("answer") or "").strip()
                if ans and row["id"] in by_id and row["id"] not in answered:
                    out.write(json.dumps(dict(by_id[row["id"]], answer=ans), ensure_ascii=False) + "\n")
                    n += 1
        print(f"{n} jawaban diimpor ke {a.out}")
        return

    todo = [r for r in scen if r["id"] not in answered and (not a.tasks or r["task"] in a.tasks)]
    if a.limit:
        todo = todo[:a.limit]

    if a.export_csv:
        with open(a.export_csv, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "task", "kind", "prompt", "answer"])
            for r in todo:
                w.writerow([r["id"], r["task"], r["kind"],
                            teacher_system(r["task"]) + "\n\n" + teacher_messages(r, gold, 0)[-1]["content"], ""])
        print(f"{len(todo)} baris diekspor ke {a.export_csv}. Isi kolom 'answer', lalu --import-csv.")
        return

    if a.dry_run:
        r = todo[0]
        print("SYSTEM:\n", teacher_system(r["task"]), "\n")
        for m in teacher_messages(r, gold):
            print(f"[{m['role']}]\n{m['content']}\n")
        return

    print(f"{len(todo)} skenario akan dijawab dengan {a.model} ({len(gold)} contoh emas tersedia)")
    n = generate(todo, gold, anthropic_call(a.model), a.out, a.workers)
    print(f"selesai: {n} jawaban ditambahkan ke {a.out}. Langkah berikut: python dataset/validate.py {a.out}")


if __name__ == "__main__":
    main()
