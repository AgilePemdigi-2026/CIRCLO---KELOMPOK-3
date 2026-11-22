"""
Tes offline (tanpa Supabase dan tanpa model): python test_offline.py
Memakai katalog palsu + embedder palsu, jadi cepat dan bisa dijalankan di mana saja.
"""
import re

import numpy as np

from circlo_ai.calculator import hitung_kebutuhan, rencana_beli
from circlo_ai.dialog import DialogManager, State
from circlo_ai.knowledge_graph import KnowledgeGraph
from circlo_ai.recommender import Recommender
from circlo_ai.slots import extract_kota, extract_slots, parse_modal, parse_quantity


# ---------- data & embedder palsu ----------
def mat(i, nama, kat, stok, harga, kota, prov, sat):
    return dict(id_material=i, id_seller=1, nama_material=nama, kategori=kat, stok=float(stok),
                harga=float(harga), kota=kota, provinsi=prov, satuan=sat, deskripsi_material="")


MATERIALS = [
    mat(1, "Spanduk vinil bekas kondisi baik", "Spanduk", 500, 6000, "Surabaya", "Jawa Timur", "m2"),
    mat(2, "Spanduk vinil bekas ada sobekan kecil", "Spanduk", 300, 4000, "Surabaya", "Jawa Timur", "m2"),
    mat(3, "Karung plastik PP bekas", "Plastik", 250, 5000, "Surabaya", "Jawa Timur", "kg"),
    mat(4, "Tutup botol HDPE campur warna", "Plastik", 400, 5500, "Surabaya", "Jawa Timur", "kg"),
    mat(5, "Serbuk gergaji kayu", "Kayu", 800, 1500, "Malang", "Jawa Timur", "kg"),
    mat(6, "Pallet kayu bekas ukuran standar", "Kayu", 150, 45000, "Gresik", "Jawa Timur", "pcs"),
    mat(7, "Perca kulit sapi samak campur", "Kulit", 120, 35000, "Sidoarjo", "Jawa Timur", "kg"),
]


def rs(i, nama, kat, kw, bpu, sat, susut, modal, langkah="Langkah contoh.", k3=None):
    return dict(id_resep=i, nama_produk=nama, kategori_material=kat, kata_kunci_material=kw,
                bahan_per_unit=bpu, satuan=sat, persen_susut=susut, estimasi_modal=modal,
                langkah_singkat=langkah, catatan_k3=k3)


RESEP = [
    rs(1, "Tote bag dari spanduk bekas", "Spanduk", "spanduk", 0.6, "m2", 0.2, 3_500_000,
       "Cuci, potong pola, jahit.", "Pakai masker saat mencuci."),
    rs(2, "Pouch dan dompet multifungsi dari spanduk", "Spanduk", "spanduk", 0.15, "m2", 0.15, 3_000_000),
    rs(3, "Tas belanja dari karung plastik PP", "Plastik", "karung plastik|karung pp", 0.3, "kg", 0.15, 2_500_000),
    rs(4, "Paving dan conblock dari lelehan tutup botol", "Plastik", "tutup botol", 1.2, "kg", 0.05, 10_000_000),
    rs(5, "Baglog jamur tiram dari serbuk gergaji", "Kayu", "serbuk gergaji", 1.0, "kg", 0.05, 8_000_000),
    rs(6, "Meja dan rak dari pallet bekas", "Kayu", "pallet", 3.0, "pcs", 0.1, 5_000_000),
    rs(7, "Dompet kartu dan gantungan kunci dari perca kulit", "Kulit", "kulit", 0.08, "kg", 0.15, 4_000_000),
]


class FakeCatalog:
    def materials(self):
        return [dict(m) for m in MATERIALS]

    def resep(self):
        return [dict(r) for r in RESEP]


class FakeEmbedder:
    """Bag-of-words hashing: cukup untuk menguji alur, bukan kualitas semantik."""
    D = 256

    def _vec(self, text):
        v = np.zeros(self.D)
        for w in re.findall(r"[a-z0-9]+", text.lower()):
            v[hash(w) % self.D] += 1
        n = np.linalg.norm(v)
        return v / n if n else v

    def passages(self, texts):
        return np.array([self._vec(t) for t in texts])

    def query(self, text):
        return self._vec(text)


def new_dm():
    kg = KnowledgeGraph.from_recipes(RESEP)
    return DialogManager(FakeCatalog(), Recommender(FakeEmbedder(), RESEP), kg=kg), State()


RESEP_KG = RESEP + [
    rs(8, "Tas tote dan pouch dari kain perca", "Tekstil", "kain perca|kain katun",
       0.5, "kg", 0.1, 2_000_000, "Sortir, cuci, potong pola, jahit.", "Pakai masker."),
    rs(9, "Boneka dan bantal dari kain perca", "Tekstil", "kain perca|kain katun",
       0.3, "kg", 0.1, 1_500_000, "Sortir, cuci, potong, jahit, isi.", "Pakai masker."),
    rs(10, "Keset dan alas duduk dari kain perca", "Tekstil", "kain perca|denim",
       0.4, "kg", 0.12, 1_800_000, "Sortir, cuci, potong, anyam.", None),
]

MATERIALS_KG = MATERIALS + [
    mat(8, "Kain perca katun campur warna", "Tekstil", 80, 12000, "Sidoarjo", "Jawa Timur", "kg"),
    mat(9, "Kain perca denim bekas", "Tekstil", 50, 15000, "Surabaya", "Jawa Timur", "kg"),
]


class FakeCatalogKG(FakeCatalog):
    def materials(self):
        return [dict(m) for m in MATERIALS_KG]

    def resep(self):
        return [dict(r) for r in RESEP_KG]


def new_kg_dm():
    kg = KnowledgeGraph.from_recipes(RESEP_KG)
    return DialogManager(FakeCatalogKG(), Recommender(FakeEmbedder(), RESEP_KG), kg=kg), State()


# ---------- tes ----------
def test_modal():
    cases = {
        "modal 5 juta": 5_000_000, "sekitar 5jt": 5_000_000, "2,5 juta": 2_500_000,
        "500rb": 500_000, "500 ribu": 500_000, "Rp 5.000.000": 5_000_000,
        "modalnya 10 jutaan": 10_000_000, "budget 5-10 juta": 5_000_000,
        "modal 2.500.000": 2_500_000, "Rp500000": 500_000,
    }
    for text, want in cases.items():
        got = parse_modal(text)
        assert got == want, f"parse_modal({text!r}) = {got}, harusnya {want}"
    assert parse_modal("aku mau produksi 100 tas") is None
    assert parse_modal("butuh 5 kg bahan") is None


def test_kota_kuantitas():
    assert extract_kota("aku di Surabaya") == "Surabaya"
    assert extract_kota("tinggal di sby") == "Surabaya"
    assert extract_kota("pakai batu bata") is None
    assert extract_kota("di kota Batu") == "Batu"
    assert parse_quantity("produksi 100 tas, modal 5 juta") == 100
    assert parse_quantity("yang nomor 2, hitung 50 unit") == 50
    assert parse_quantity("modal 5 juta") is None
    s = extract_slots("modal kecil di Malang")
    assert s.kota == "Malang" and s.modal == 3_000_000 and s.modal_asumsi


def test_kalkulator():
    assert hitung_kebutuhan(100, 0.6, 0.2, "m2") == 75.0
    assert hitung_kebutuhan(10, 3, 0.1, "pcs") == 34.0
    items, total, kurang = rencana_beli(75, [m for m in MATERIALS if "Spanduk" in m["nama_material"]])
    assert kurang == 0 and abs(total - 75 * 4000) < 1e-6      # termurah dulu (4.000/m2)
    items, total, kurang = rencana_beli(900, [m for m in MATERIALS if m["kategori"] == "Spanduk"])
    assert abs(kurang - 100) < 1e-6                            # stok total 800 m2


def test_dialog_utama():
    dm, st = new_dm()
    r = dm.handle(st, "aku ingin membuat bisnis green UMKM dari material sisa, tapi masih bingung bisnis apa")
    assert r.intent == "ask_slots" and "kota" in r.text and "modal" in r.text
    r = dm.handle(st, "aku di Surabaya, modal sekitar 5 jutaan")
    assert r.intent == "rekomendasi" and st.fase == "rekomendasi"
    assert st.kota == "Surabaya" and st.modal == 5_000_000
    assert len(st.last_recs) == 3 and r.material_ids
    first = dm.reco.by_id[st.last_recs[0]]["nama_produk"]
    r = dm.handle(st, "yang pertama, gimana cara bikinnya?")
    assert r.intent == "cara" and first in r.text and st.selected_resep == st.last_recs[0]
    r = dm.handle(st, "kalau mau produksi 100 unit butuh bahan berapa?")
    assert r.intent == "hitung" and "Total bahan" in r.text
    r = dm.handle(st, "modalnya berapa untuk ini?")
    assert r.intent == "modal_q" and "Rp" in r.text
    r = dm.handle(st, "gimana langkah memulai usahanya?")
    assert r.intent == "mulai" and "NIB" in r.text


def test_hitung_tote_bag():
    dm, st = new_dm()
    st.kota, st.provinsi, st.modal = "Surabaya", "Jawa Timur", 5_000_000
    st.fase, st.last_recs = "rekomendasi", [1, 3, 5]
    r = dm.handle(st, "hitung kebutuhan bahan tote bag untuk 100 pcs")
    assert "75 m2" in r.text, r.text            # 100 x 0,6 / 0,8
    assert "Rp 300.000" in r.text, r.text       # 75 m2 x 4.000 (termurah)


def test_tanya_qty_dulu():
    dm, st = new_dm()
    st.kota, st.provinsi, st.modal = "Surabaya", "Jawa Timur", 5_000_000
    st.fase, st.last_recs = "rekomendasi", [1, 3, 5]
    r = dm.handle(st, "yang kedua, hitung kebutuhan bahannya")
    assert r.intent == "hitung" and "berapa unit" in r.text and st.awaiting == ["qty"]
    r = dm.handle(st, "200")
    assert r.intent == "hitung" and "Total bahan" in r.text and st.awaiting == []


def test_kota_tanpa_katalog():
    dm, st = new_dm()
    dm.handle(st, "mau usaha dari bahan sisa")
    r = dm.handle(st, "di Jakarta modal 5 juta")
    assert r.intent == "rekomendasi" and "seluruh katalog" in r.text


def test_modal_kurang():
    dm, st = new_dm()
    dm.handle(st, "mau usaha")
    r = dm.handle(st, "Surabaya, modal 500 ribu")
    assert "paling terjangkau" in r.text and len(st.last_recs) == 2


def test_modal_dilewati_dan_batas_tanya():
    dm, st = new_dm()
    dm.handle(st, "mau usaha")
    r = dm.handle(st, "Surabaya, belum tau modalnya")
    assert r.intent == "rekomendasi" and st.modal_dilewati
    dm, st = new_dm()
    dm.handle(st, "mau usaha")
    r = dm.handle(st, "hmm entahlah")
    assert r.intent == "ask_slots"
    r = dm.handle(st, "hmm masih bingung")
    assert r.intent == "rekomendasi"            # setelah 2x bertanya, lanjut tanpa slot


def test_ubah_slot_rekomendasi_ulang():
    dm, st = new_dm()
    dm.handle(st, "mau usaha"); dm.handle(st, "Surabaya modal 5 juta")
    r = dm.handle(st, "gimana kalau modalku 15 juta?")
    assert r.intent in ("rekomendasi", "mulai", "cara") or st.modal == 15_000_000
    assert st.modal == 15_000_000


def test_di_luar_topik():
    dm, st = new_dm()
    dm.handle(st, "mau usaha"); dm.handle(st, "Surabaya modal 5 juta")
    r = dm.handle(st, "siapa presiden pertama indonesia?")
    assert r.intent in ("fallback", "pilih"), r.intent


def test_state_serialisasi():
    dm, st = new_dm()
    dm.handle(st, "mau usaha"); dm.handle(st, "Surabaya modal 5 juta")
    st2 = State.from_dict(st.to_dict())
    assert st2 == st


def test_router_regresi():
    # kalimat pembuka "mulai usaha" bukan pertanyaan langkah
    dm, st = new_dm()
    r = dm.handle(st, "pengen mulai usaha ramah lingkungan dari barang bekas, tapi bingung")
    assert r.task == "tanya_slot", r.task
    # pertanyaan pengetahuan di awal percakapan tidak dipaksa jadi tanya kota/modal
    dm, st = new_dm()
    r = dm.handle(st, "apa bedanya plastik HDPE sama PET?")
    assert r.task == "bebas", r.task
    # ganti modal setelah rekomendasi -> rekomendasi ulang (bukan 'cara')
    dm, st = new_dm()
    dm.handle(st, "mau usaha"); dm.handle(st, "Surabaya modal 5 juta")
    r = dm.handle(st, "kalau modalnya 15 juta gimana?")
    assert r.task == "rekomendasi" and st.modal == 15_000_000, r.task
    # memilih lewat nama produk yang mengandung kata minat ('tas') tidak memicu rekomendasi ulang
    r = dm.handle(st, "mau coba tote bag")
    assert r.task == "cara" and r.facts["baru_dipilih"], r.task
    # kata 'pertama' dalam kalimat biasa bukan pilihan nomor 1
    r = dm.handle(st, "siapa presiden pertama indonesia?")
    assert r.task == "bebas", r.task
    # 'gimana cara' di luar topik tidak dijawab sebagai cara membuat produk
    r = dm.handle(st, "gimana cara hack wifi tetangga")
    assert r.task == "bebas", r.task


def test_fakta_lengkap():
    dm, st = new_dm()
    dm.handle(st, "mau usaha")
    r = dm.handle(st, "Surabaya modal 5 juta")
    assert r.task == "rekomendasi" and r.facts["wilayah"]["level"] == "kota"
    assert all(x["bahan"] for x in r.facts["rekomendasi"])
    r = dm.handle(st, "yang pertama")
    assert r.task == "cara" and r.facts["k3"] is not None or r.facts["langkah"]
    r = dm.handle(st, "hitung untuk 100 pcs")
    assert r.task == "hitung" and r.facts["kebutuhan"] > 0 and "total_biaya" in r.facts


def test_kg_potensi():
    kg = KnowledgeGraph.from_recipes(RESEP)
    assert kg.pathways_for_category("Spanduk")
    assert kg.pathways_for_text("mau olah spanduk bekas")
    assert kg.pathways_for_material({"kategori": "Kayu", "nama_material": "Pallet kayu bekas"})

    dm, st = new_dm()
    st.kota = "Surabaya"
    st.provinsi = "Jawa Timur"
    r = dm.handle(st, "potensi pemanfaatan spanduk bekas")
    assert r.intent == "material_utilization" and r.task == "kg_pemanfaatan", (r.intent, r.task)
    assert r.facts["jenis"] == "pemanfaatan_material" and r.facts["jalur"]
    assert "resep referensi" in r.text.lower()


def test_scenario_1_eksplorasi_ide():
    dm, st = new_kg_dm()
    r = dm.handle(st, "Aku ingin membuat produk kerajinan ramah lingkungan.")
    assert r.intent == "exploration" and r.task == "kg_eksplorasi", (r.intent, r.task)
    assert not r.material_ids
    assert r.facts["jenis"] == "eksplorasi_ide"
    assert "resep referensi" in r.text.lower()


def test_scenario_2_pengembangan_produk():
    dm, st = new_kg_dm()
    r = dm.handle(st, "Aku ingin membuat pouch dari limbah.")
    assert r.intent == "product_development" and r.task == "kg_produk", (r.intent, r.task)
    assert not r.material_ids
    assert r.facts["jenis"] == "pengembangan_produk"
    assert "pouch" in r.text.lower()


def test_scenario_3_material_untuk_produk():
    dm, st = new_kg_dm()
    r = dm.handle(st, "Material apa yang dapat digunakan untuk membuat paving block?")
    assert r.intent == "product_development" and r.task == "kg_produk", (r.intent, r.task)
    assert not r.material_ids
    assert r.facts["jenis"] == "pengembangan_produk"
    assert "paving" in r.text.lower()


def test_scenario_4_alternatif_material():
    dm, st = new_kg_dm()
    r = dm.handle(st, "Kalau kain perca tidak tersedia, apa alternatifnya?")
    assert r.intent == "alternative_discovery" and r.task == "kg_alternatif", (r.intent, r.task)
    assert not r.material_ids
    assert r.facts["jenis"] == "alternatif_material"
    assert r.facts["alternatif"]
    assert "kain" in r.text.lower()


def test_scenario_5_penjelasan_proses():
    dm, st = new_kg_dm()
    r = dm.handle(st, "Jelaskan proses pengolahan kain perca menjadi tas.")
    assert r.intent == "process_explanation" and r.task == "kg_proses", (r.intent, r.task)
    assert not r.material_ids
    assert r.facts["jenis"] == "penjelasan_proses"
    assert st.fokus_kategori == "Tekstil"
    assert "tas" in r.text.lower()


def test_scenario_6_katalog_setelah_konteks_kg():
    dm, st = new_kg_dm()
    dm.handle(st, "Jelaskan proses pengolahan kain perca menjadi tas.")
    r = dm.handle(st, "Sekarang carikan material yang tersedia di Sidoarjo.")
    assert r.intent == "marketplace_search", r.intent
    assert r.task == "katalog"
    assert r.material_ids
    assert st.kota == "Sidoarjo"
    assert "Tekstil" in (r.facts.get("filter", {}).get("kategori") or [])


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    gagal = 0
    for t in tests:
        try:
            t()
            print(f"  OK    {t.__name__}")
        except AssertionError as e:
            gagal += 1
            print(f"  GAGAL {t.__name__}: {e}")
    print(f"\n{len(tests) - gagal}/{len(tests)} tes lulus")
    raise SystemExit(1 if gagal else 0)
