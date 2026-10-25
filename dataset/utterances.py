"""Bank kalimat pembeli (Indonesia santai) + generator variasi/noise untuk dataset."""
import random
import re

OPEN_FIRST = [
    "aku ingin membuat suatu bisnis berbranding green UMKM dengan memanfaatkan material sisa, tapi masih bingung bisnis apa yang tepat",
    "pengen mulai usaha ramah lingkungan dari barang bekas, tapi bingung mau usaha apa",
    "ada ide usaha dari limbah atau bahan sisa nggak?",
    "mau bikin UMKM green pakai material daur ulang, enaknya bikin apa ya",
    "aku mau usaha yang memanfaatkan bahan bekas tapi belum tau mulai dari mana",
    "kak, rekomendasi usaha dari bahan sisa dong",
    "lagi cari ide bisnis daur ulang buat pemula",
    "saya tertarik wirausaha dengan material sisa yang masih layak pakai, ada saran?",
    "bingung mau usaha apa yang ramah lingkungan, bisa bantu?",
    "mau coba bisnis upcycle, kira-kira bahan apa yang prospek?",
    "halo, saya mahasiswa pengen punya usaha kecil dari barang bekas",
    "ide usaha green yang modalnya terjangkau apa ya",
]
KOTA_PHRASES = ["aku di {k}", "domisili {k}", "{k}", "dari {k} kak", "lokasi saya di {k}",
                "saya tinggal di {k}", "di {k} kak"]
MODAL_PHRASES = ["modal {m}", "budget {m}", "sekitar {m}", "punya dana {m}", "modalnya {m}",
                 "kira-kira {m}", "modal awal {m} an"]
COMBINED = ["{k}, modal {m}", "aku di {k} modalnya {m}", "di {k}, budget sekitar {m}",
            "saya dari {k}, dana yang ada {m}", "{k} modal {m} kak"]
MINAT_PHRASES = ["aku suka {x}", "pengennya yang berhubungan dengan {x}",
                 "kayaknya tertarik di bidang {x}", "maunya yang {x} gitu"]
MINAT_WORDS = ["tas dan dompet", "furnitur", "pertanian", "dekorasi rumah", "fashion",
               "kerajinan", "mainan", "alat tulis", "bahan bangunan", "kecantikan"]
ORDINAL_PHRASES = [("yang pertama aja", 1), ("nomor 2 kayaknya menarik", 2), ("yang ketiga deh", 3),
                   ("ide 1 boleh, jelasin", 1), ("yang kedua", 2), ("pilih nomor 1", 1), ("no 3 aja", 3)]
CARA_PHRASES = ["gimana cara bikin {p}?", "cara pengolahannya gimana?", "jelasin langkah membuat {p}",
                "proses bikin {p} gimana?", "bagaimana cara mengolah bahannya?",
                "tutorial singkat {p} dong", "teknis pembuatannya gimana kak?"]
HITUNG_PHRASES = ["kalau mau produksi {q} {u} butuh bahan berapa?", "hitung kebutuhan bahan untuk {q} {u}",
                  "{q} {u} itu perlu beli bahan berapa banyak?", "butuh berapa bahan buat {q} {u}?",
                  "bahan yang dibutuhkan untuk {q} {u} berapa ya"]
HITUNG_NOQ = ["hitungin kebutuhan bahannya dong", "butuh bahan berapa ya?", "berapa bahan yang harus dibeli?"]
MODALQ_PHRASES = ["modalnya berapa untuk {p}?", "butuh biaya berapa buat mulai?", "estimasi modal awalnya berapa?",
                  "investasi awalnya kira-kira berapa", "biayanya berapa kak?"]
MULAI_PHRASES = ["gimana langkah awal memulai usahanya?", "izin usahanya apa aja?", "cara jualnya gimana?",
                 "harga jualnya sebaiknya berapa?", "gimana strategi pemasarannya?", "perlu NIB nggak?",
                 "cara hitung HPP-nya gimana?", "mulai dari mana dulu ya?"]
BEBAS = [  # (pertanyaan, butuh_produk_terpilih)
    ("botol PET bekas itu dicuci pakai apa sebelum diolah?", False),
    ("spanduk bekas masih bau tinta, gimana ngilanginnya?", False),
    ("apa bedanya plastik HDPE sama PET buat kerajinan?", False),
    ("kain perca yang luntur masih bisa dipakai nggak?", False),
    ("pallet kayu bekas aman nggak buat furnitur dalam ruangan?", False),
    ("ban dalam bekas bisa dijahit pakai mesin jahit biasa?", False),
    ("kaleng bekas aman nggak buat wadah makanan?", False),
    ("perca kulit bisa diwarnai ulang?", False),
    ("ampas kopi nanti berjamur nggak kalau disimpan lama?", False),
    ("perlu izin khusus nggak jual produk dari bahan daur ulang?", False),
    ("gimana biar brand green-ku nggak dianggap greenwashing?", False),
    ("cara cari pelanggan pertama gimana?", False),
    ("lebih baik produksi sendiri atau rekrut pekerja dulu?", False),
    ("usaha ini cocok nggak buat pemula?", True),
    ("alat apa aja yang wajib dibeli untuk ini?", True),
    ("produk ini awet nggak kalau dipakai sehari-hari?", True),
    ("gimana cara bikin produk ini kelihatan lebih premium?", True),
    ("kira-kira harga jual produk ini berapa ya?", True),
    ("bahannya perlu dicuci dulu nggak sebelum diolah?", True),
    ("risiko kerjanya apa aja dan gimana ngatasinnya?", True),
    ("bisa dijual ke luar kota nggak, gimana pengirimannya?", True),
    ("sisa potongan bahannya bisa dimanfaatin lagi nggak?", True),
    ("gimana cara bikin kemasan yang ramah lingkungan?", True),
    ("buat bikin ini sendirian dari rumah bisa nggak?", True),
]
LUAR_TOPIK = [
    "siapa presiden pertama indonesia?", "tolong buatin kode python buat kalkulator",
    "resep nasi goreng enak apa ya", "cuaca besok gimana?", "kasih saran beli saham apa dong",
    "ceritain lelucon", "obat sakit kepala yang bagus apa?", "gimana cara hack wifi tetangga",
    "tolong kerjain PR matematika aku", "rekomendasi film yang bagus dong",
    "kamu suka warna apa?", "bantu tulis puisi cinta", "tim bola yang menang semalam siapa?",
    "gimana cara diet cepat?", "jelasin teori relativitas",
]
UNITS = ["pcs", "unit", "buah", "biji"]


def fmt_modal(v: float, rng: random.Random) -> str:
    """5_000_000 -> '5 juta' / '5jt' / '5 jutaan' / 'Rp 5.000.000'; 500_000 -> '500 ribu' / '500rb'."""
    if v >= 1_000_000:
        j = v / 1_000_000
        j = int(j) if j == int(j) else j
        js = str(j).replace(".", ",")
        return rng.choice([f"{js} juta", f"{js}jt", f"{js} jutaan", f"Rp {int(v):,}".replace(",", ".")])
    r = int(v / 1000)
    return rng.choice([f"{r} ribu", f"{r}rb", f"Rp {int(v):,}".replace(",", ".")])


def alias(nama_produk: str) -> str:
    """'Tote bag dari spanduk bekas' -> 'tote bag'; 'Paving dan conblock ...' -> 'paving'."""
    first = re.split(r" dari | dan ", nama_produk)[0]
    return first.lower()


_NOISE = {"gimana": "gmn", "nggak": "ga", "tidak": "gak", "banget": "bgt", "kalau": "klo",
          "untuk": "buat", "bagaimana": "gimana", "sebaiknya": "mending", "dong": "dong ya"}


def noisy(text: str, rng: random.Random) -> str:
    """Variasi gaya tulis: huruf kecil, singkatan, tanpa tanda tanya, sapaan 'kak/min'."""
    t = text
    if rng.random() < 0.35:
        t = t.lower()
    for k, v in _NOISE.items():
        if rng.random() < 0.25:
            t = re.sub(rf"\b{k}\b", v, t, flags=re.I)
    if rng.random() < 0.3:
        t = t.rstrip("?.!")
    if rng.random() < 0.15 and not re.search(r"\b(kak|min)\b", t, re.I):
        t = t + rng.choice([" kak", " min"])
    return t
