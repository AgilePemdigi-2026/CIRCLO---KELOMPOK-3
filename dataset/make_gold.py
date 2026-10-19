"""Membuat dataset/gold_examples.jsonl: contoh jawaban EMAS yang ditulis tangan (patokan gaya + few-shot).
Ubah / tambah contoh di sini lalu jalankan:  python dataset/make_gold.py
Setiap contoh harus lolos validate.py (dicek otomatis di akhir)."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import validate  # noqa: E402

P_TOTE = {"produk": "Tote bag dari spanduk bekas", "langkah": "Cuci dan jemur spanduk, potong sesuai pola, jahit tepi dan sisi, pasang tali dan lapisan dalam.", "k3": "Pakai masker saat mencuci spanduk. Hindari untuk produk yang menyentuh makanan.", "modal_awal": 3500000, "bahan": [{"nama": "Spanduk vinil bekas ada sobekan kecil", "harga": 4000, "satuan": "m2", "stok": 300, "kota": "Surabaya"}, {"nama": "Spanduk banner roll-up bekas (albatros)", "harga": 5000, "satuan": "m2", "stok": 150, "kota": "Surabaya"}]}
P_SAPU = {"produk": "Sapu dari botol PET bekas", "langkah": "Potong botol menjadi strip serat, ikat pada gagang kayu atau bambu.", "k3": "Gunakan sarung tangan saat memotong. Tepi potongan bisa tajam.", "modal_awal": 2000000, "bahan": [{"nama": "Botol PET bening bekas bersih", "harga": 4500, "satuan": "kg", "stok": 800, "kota": "Surabaya"}]}
REK3 = [
    {"no": 1, "produk": "Tote bag dari spanduk bekas", "modal_awal": 3500000, "status_modal": "cukup", "bahan": [{"nama": "Spanduk vinil bekas ada sobekan kecil", "harga": 4000, "satuan": "m2", "stok": 300, "kota": "Surabaya"}]},
    {"no": 2, "produk": "Sapu dari botol PET bekas", "modal_awal": 2000000, "status_modal": "cukup", "bahan": [{"nama": "Botol PET bening bekas bersih", "harga": 4500, "satuan": "kg", "stok": 800, "kota": "Surabaya"}]},
    {"no": 3, "produk": "Patchwork pouch dan tas dari perca kain", "modal_awal": 3500000, "status_modal": "cukup", "bahan": [{"nama": "Perca kain katun konveksi campur", "harga": 8000, "satuan": "kg", "stok": 500, "kota": "Sidoarjo"}]},
]

G = []


def add(task, kind, facts, prev, user, answer):
    G.append({"id": f"gold-{len(G) + 1:02d}", "task": task, "kind": kind, "facts": facts,
              "prev_user": prev, "user_text": user, "answer": answer, "group": "gold"})


add("tanya_slot", "ask_slot", {"kurang": ["kota", "modal"], "kota": None, "modal": None, "pertama_kali": True},
    [], "ada ide usaha dari limbah atau bahan sisa nggak?",
    "Ada banyak peluangnya! Biar idenya pas dengan material yang tersedia, boleh tahu kamu berada di kota mana dan kira-kira modal awalnya berapa?")
add("tanya_slot", "ask_slot", {"kurang": ["modal"], "kota": "Sidoarjo", "modal": None, "pertama_kali": True},
    [], "pengen usaha dari bahan sisa, aku di Sidoarjo",
    "Oke, di Sidoarjo ya. Kira-kira modal awal yang disiapkan berapa? Perkiraan juga boleh, misalnya 5 juta.")
add("tanya_slot", "ask_slot", {"kurang": ["kota"], "kota": None, "modal": 15000000, "pertama_kali": True},
    [], "bingung mau usaha apa, modalnya Rp 15.000.000",
    "Dengan modal sekitar Rp 15.000.000 pilihanmu cukup luas. Kamu berada di kota mana, supaya aku bisa cek stok material terdekat?")
add("rekomendasi", "rekomendasi",
    {"wilayah": {"kota_user": "Surabaya", "dipakai": "Surabaya", "level": "kota", "kategori_terbanyak": [{"kategori": "Plastik", "listing": 7}, {"kategori": "Spanduk", "listing": 3}]},
     "modal_user": 5000000, "modal_asumsi": False, "modal_kurang": False, "minat": None, "rekomendasi": REK3},
    ["ide usaha green yang modalnya terjangkau apa ya", "aku di surabaya"], "modal awal 5 jutaan an",
    "Di Surabaya, material yang paling banyak tersedia adalah plastik dan spanduk. Dengan modal sekitar Rp 5.000.000, ini 3 ide yang cocok:\n"
    "1. Tote bag dari spanduk bekas (estimasi modal awal Rp 3.500.000): spanduk vinil bekas ada sobekan kecil, Rp 4.000/m2, stok 300 m2 di Surabaya.\n"
    "2. Sapu dari botol PET bekas (estimasi Rp 2.000.000): botol PET bening bersih, Rp 4.500/kg, stok 800 kg di Surabaya.\n"
    "3. Patchwork pouch dan tas dari perca kain (estimasi Rp 3.500.000): perca kain katun, Rp 8.000/kg, stok 500 kg, tapi dari Sidoarjo.\n"
    "Mau aku jelaskan cara membuat salah satunya atau hitung kebutuhan bahannya?")
add("rekomendasi", "rekomendasi_ulang",
    {"wilayah": {"kota_user": "Sidoarjo", "dipakai": "Sidoarjo", "level": "kota", "kategori_terbanyak": [{"kategori": "Tekstil", "listing": 7}, {"kategori": "Kulit", "listing": 3}]},
     "modal_user": 500000, "modal_asumsi": False, "modal_kurang": True, "minat": "fashion",
     "rekomendasi": [{"no": 1, "produk": "Planter vertikal dari galon bekas", "modal_awal": 1500000, "status_modal": "kurang", "bahan": [{"nama": "Galon air bekas", "harga": 15000, "satuan": "pcs", "stok": 150, "kota": "Surabaya"}]},
                     {"no": 2, "produk": "Tas dan dompet anyaman dari kemasan sachet", "modal_awal": 1500000, "status_modal": "kurang", "bahan": [{"nama": "Kemasan sachet multilayer bersih", "harga": 3000, "satuan": "kg", "stok": 120, "kota": "Surabaya"}]}]},
    ["bingung mau usaha apa yang ramah lingkungan, bisa bantu?", "malang, modal 500 ribu, pengennya yang berhubungan dengan fashion"], "sebenernya aku di Sidoarjo",
    "Oke, aku pakai stok Sidoarjo. Dengan modal sekitar Rp 500.000, semua resep kami masih di atas modalmu, jadi ini dua opsi paling terjangkau (bahannya masih dari Surabaya):\n"
    "1. Planter vertikal dari galon bekas, estimasi modal awal Rp 1.500.000. Galon bekas Rp 15.000/pcs, stok 150 pcs.\n"
    "2. Tas dan dompet anyaman dari kemasan sachet, estimasi Rp 1.500.000. Sachet bersih Rp 3.000/kg, stok 120 kg. Ini paling dekat dengan minat fashionmu.\n"
    "Kamu bisa mulai dari skala kecil dulu. Mau kuhitung kebutuhan bahan untuk jumlah kecil?")
add("rekomendasi", "rekomendasi",
    {"wilayah": {"kota_user": "Jember", "dipakai": "Jawa Timur", "level": "provinsi", "kategori_terbanyak": [{"kategori": "Plastik", "listing": 8}, {"kategori": "Tekstil", "listing": 8}]},
     "modal_user": 15000000, "modal_asumsi": False, "modal_kurang": False, "minat": None, "rekomendasi": REK3},
    [], "Jember, modal 15jt",
    "Belum ada penjual di Jember, jadi aku pakai stok se-Jawa Timur (terbanyak: plastik dan tekstil). Dengan modal sekitar Rp 15.000.000, ini 3 ide yang cocok:\n"
    "1. Tote bag dari spanduk bekas (estimasi modal awal Rp 3.500.000): spanduk vinil bekas ada sobekan kecil, Rp 4.000/m2, stok 300 m2, dari Surabaya.\n"
    "2. Sapu dari botol PET bekas (estimasi Rp 2.000.000): botol PET bening bersih, Rp 4.500/kg, stok 800 kg, dari Surabaya.\n"
    "3. Patchwork pouch dan tas dari perca kain (estimasi Rp 3.500.000): perca kain katun, Rp 8.000/kg, stok 500 kg, dari Sidoarjo.\n"
    "Bahannya dari kota lain, jadi ongkir perlu kamu perhitungkan. Mau lanjut ke salah satunya?")
add("cara", "pilih", dict(P_TOTE, baru_dipilih=True),
    ["ada ide usaha dari limbah atau bahan sisa nggak", "dari Sidoarjo kak, belum tau modalnya"], "yang ketiga deh",
    "Oke, tote bag dari spanduk bekas. Langkahnya: cuci dan jemur spanduk, potong sesuai pola, jahit tepi dan sisi, lalu pasang tali dan lapisan dalam. "
    "Pakai masker saat mencuci, dan jangan dipakai untuk produk yang menyentuh makanan. "
    "Bahannya ada di katalog: spanduk vinil bekas ada sobekan kecil, Rp 4.000/m2 (Surabaya). Mau aku hitung kebutuhan bahan untuk jumlah produksi tertentu?")
add("cara", "cara",
    {"produk": "Tas belanja dari karung plastik PP", "langkah": "Cuci dan jemur, potong pola, jahit rangkap, pasang tali dan lapisan dalam.", "k3": "Pastikan karung tidak bekas bahan kimia atau pestisida.", "modal_awal": 2500000, "bahan": [{"nama": "Karung plastik PP bekas", "harga": 5000, "satuan": "kg", "stok": 250, "kota": "Surabaya"}], "baru_dipilih": False},
    ["jember modal 5jt kak, pengennya yang berhubungan dengan fashion", "yang tas belanja aja"], "cara pengolahannya gmn?",
    "Cara membuat tas belanja dari karung plastik PP: cuci dan jemur karungnya, potong sesuai pola, jahit rangkap supaya kuat, lalu pasang tali dan lapisan dalam. "
    "Pastikan karungnya bukan bekas bahan kimia atau pestisida. "
    "Bahan di katalog: karung plastik PP bekas, Rp 5.000/kg, stok 250 kg (Surabaya). Mau dihitung kebutuhan bahannya?")
add("hitung", "hitung",
    {"produk": "Sapu dari botol PET bekas", "jumlah_unit": 50, "bahan_per_unit": 0.4, "satuan": "kg", "susut_persen": 10, "kebutuhan": 22.3, "ada_bahan": True, "modal_user": 10000000,
     "rencana_beli": [{"nama": "Botol PET bening bekas bersih", "jumlah": 22.3, "harga": 4500, "biaya": 100350, "kota": "Surabaya"}], "total_biaya": 100350, "kekurangan": 0, "melebihi_modal": False},
    ["punya dana 10jt", "yang sapu aja"], "butuh berapa bahan buat 50 buah?",
    "Untuk 50 sapu dari botol PET bekas: 50 x 0,4 kg dibagi (1 - 10% susut) = 22,3 kg botol PET. "
    "Belanjanya: botol PET bening bersih 22,3 kg x Rp 4.500 = Rp 100.350 (Surabaya). "
    "Total bahan sekitar Rp 100.350, ini estimasi dan belum termasuk alat, tenaga, dan ongkir.")
add("hitung", "hitung",
    {"produk": "Dompet, tas, dan gelang dari ban dalam bekas", "jumlah_unit": 1000, "bahan_per_unit": 0.4, "satuan": "kg", "susut_persen": 15, "kebutuhan": 470.6, "ada_bahan": True, "modal_user": None,
     "rencana_beli": [{"nama": "Ban dalam bekas motor dan truk", "jumlah": 200, "harga": 6000, "biaya": 1200000, "kota": "Gresik"}], "total_biaya": 1200000, "kekurangan": 270.6, "melebihi_modal": False},
    ["di gresik kak, belum tau modalnya", "tertarik sama dompet, tas,"], "hitung kebutuhan bahan untuk 1000 biji",
    "Untuk 1.000 dompet, tas, dan gelang dari ban dalam bekas: 1.000 x 0,4 kg dibagi (1 - 15% susut) = 470,6 kg. "
    "Stok ban dalam bekas di Gresik baru 200 kg (Rp 6.000/kg, total Rp 1.200.000), jadi kurang 270,6 kg. "
    "Biaya bahan yang tersedia sekitar Rp 1.200.000 (estimasi). Coba kurangi target produksi atau tunggu restock.")
add("hitung", "hitung",
    {"produk": "Organizer dan kotak dari karton sisa", "jumlah_unit": 2500, "bahan_per_unit": 0.8, "satuan": "kg", "susut_persen": 15, "kebutuhan": 2353, "ada_bahan": True, "modal_user": 2000000,
     "rencana_beli": [{"nama": "Kardus bekas bersih", "jumlah": 1500, "harga": 2000, "biaya": 3000000, "kota": "Mojokerto"}, {"nama": "Karton duplex sisa potongan pabrik packaging", "jumlah": 700, "harga": 2600, "biaya": 1820000, "kota": "Mojokerto"}, {"nama": "Kemasan karton minuman (Tetra Pak) bersih", "jumlah": 153, "harga": 3500, "biaya": 535500, "kota": "Mojokerto"}],
     "total_biaya": 5355500, "kekurangan": 0, "melebihi_modal": True},
    ["modal rp 2.000.000", "yang pertama aja"], "2500 buah itu perlu beli bahan berapa banyak",
    "Untuk 2.500 organizer dan kotak dari karton sisa: 2.500 x 0,8 kg dibagi (1 - 15% susut) = 2.353 kg. "
    "Rencana beli, semuanya dari Mojokerto: kardus bekas 1.500 kg (Rp 3.000.000), karton duplex sisa pabrik 700 kg (Rp 1.820.000), dan kemasan karton minuman 153 kg (Rp 535.500). "
    "Total bahan sekitar Rp 5.355.500, sudah melebihi modalmu Rp 2.000.000. Mau kita hitung untuk jumlah yang lebih kecil?")
add("tanya_jumlah", "tanya_jumlah", {"produk": "Tote bag dari spanduk bekas"},
    ["saya dari jember, dana yang ada 15 jutaan", "tertarik sama tote bag"], "hitungin kebutuhan bahannya dong",
    "Boleh. Untuk tote bag dari spanduk bekas, rencananya mau produksi berapa unit?")
add("tanya_produk", "tanya_produk",
    {"opsi": [{"no": 1, "produk": "Sapu dari botol PET bekas"}, {"no": 2, "produk": "Scrub dan lilin aromaterapi dari ampas kopi"}, {"no": 3, "produk": "Organizer dan kotak dari karton sisa"}]},
    ["di Gresik, budget sekitar Rp 2.000.000"], "berapa bahan yang harus dibeli?",
    "Biar hitungannya akurat, kamu mau hitung untuk yang mana: 1) sapu dari botol PET, 2) scrub dan lilin aromaterapi dari ampas kopi, atau 3) organizer dan kotak dari karton sisa?")
add("modal", "modal",
    {"produk": "Tas dan dompet anyaman dari kemasan sachet", "estimasi_modal": 1500000, "modal_user": 300000, "selisih": 1200000, "cukup": False},
    ["modal awal Rp 300.000 an", "nomor 2 kayaknya menarik"], "modalnya berapa untuk tas?",
    "Estimasi modal awal tas dan dompet anyaman dari kemasan sachet sekitar Rp 1.500.000 (alat dan bahan awal, angka kasar). "
    "Modalmu Rp 300.000 masih kurang sekitar Rp 1.200.000. Kamu bisa mulai dari skala kecil dulu, misalnya membuat beberapa prototipe, lalu menambah modal bertahap.")
add("modal", "modal",
    {"produk": "Organizer dan kotak dari karton sisa", "estimasi_modal": 2000000, "modal_user": 2000000, "selisih": 0, "cukup": True},
    ["gresik modal rp 2.000.000 kak, aku suka furnitur", "mau coba organizer"], "modalnya berapa buat organizer min",
    "Estimasi modal awal organizer dan kotak dari karton sisa sekitar Rp 2.000.000 (alat dan bahan awal, angka kasar). "
    "Modalmu Rp 2.000.000 pas dengan kebutuhan itu, jadi belum ada cadangan. Sebaiknya sisihkan sedikit lagi untuk kemasan dan promosi.")
MULAI_POIN = ["Buat prototipe kecil dan uji pasar (pre-order atau titip jual) sebelum produksi besar.", "Hitung HPP: bahan + tenaga + alat + kemasan + ongkir, lalu tentukan harga jual dan margin.", "Urus NIB lewat OSS (oss.go.id) agar legal; produk pangan atau kosmetik butuh izin tambahan.", "Bangun cerita brand hijau: tonjolkan asal material sisa dan dampaknya.", "Jual lewat marketplace dan media sosial, lalu perbesar produksi bertahap."]
add("mulai", "mulai", {"produk": None, "k3": None, "poin_umum": MULAI_POIN},
    ["saya tertarik wirausaha dengan material sisa yang masih layak pakai, ada saran?", "Jakarta, modal Rp 50.000.000"], "gimana langkah awal memulai usahanya?",
    "Langkah umumnya begini:\n1. Buat prototipe kecil dan uji pasar lewat pre-order atau titip jual sebelum produksi besar.\n"
    "2. Hitung HPP (bahan, tenaga, alat, kemasan, ongkir), lalu tentukan harga jual dan margin.\n"
    "3. Urus NIB lewat OSS (oss.go.id) supaya usahamu legal. Produk pangan atau kosmetik butuh izin tambahan.\n"
    "4. Bangun cerita brand hijau: tonjolkan asal material sisa dan dampaknya.\n5. Jual lewat marketplace dan media sosial, lalu perbesar produksi bertahap.")
add("mulai", "bebas", {"produk": None, "k3": None, "poin_umum": MULAI_POIN},
    ["saya tertarik wirausaha dengan material sisa yang masih layak pakai, ada saran?", "Jakarta, modal Rp 50.000.000"], "izin usahanya apa aja min",
    "Yang paling dasar: urus NIB lewat OSS (oss.go.id) supaya usahamu legal. Kalau produkmu pangan atau kosmetik (misalnya scrub), biasanya butuh izin tambahan, jadi cek persyaratannya sebelum jualan. "
    "Syarat detailnya bisa berbeda tergantung jenis produk dan daerah, jadi konfirmasi juga ke dinas setempat. Sambil mengurus izin, uji pasar dulu dengan prototipe kecil dan hitung HPP sebelum produksi besar.")
add("mulai", "bebas",
    {"produk": "Dompet, tas, dan gelang dari ban dalam bekas", "k3": "Cuci bersih untuk menghilangkan bau dan kotoran. Gunakan masker saat memotong.", "poin_umum": MULAI_POIN},
    ["saya dari Gresik, dana yang ada 25 jutaan min", "nomor 2 kayaknya menarik"], "kira-kira harga jual produk ini berapa ya?",
    "Harga jual sebaiknya dihitung dari HPP: bahan + tenaga + alat + kemasan + ongkir per produk, lalu tambah margin yang wajar. "
    "Karena angka pasti produk ini belum kuhitung, mulai dari kebutuhan bahan per produk dulu, lalu uji harga lewat pre-order kecil. "
    "Untuk kualitas, cuci bersih ban dalamnya supaya tidak bau dan pakai masker saat memotong.")
add("bebas", "bebas",
    {"kota": "Surabaya", "modal_user": 50000000, "produk_terpilih": P_SAPU, "rekomendasi_terakhir": ["Tote bag dari spanduk bekas", "Sapu dari botol PET bekas", "Patchwork pouch dan tas dari perca kain"]},
    ["sekitar 50jt", "yang kedua"], "risiko kerjanya apa aja dan gmn ngatasinnya?",
    "Risiko utamanya tangan tergores tepi potongan botol yang tajam. Pakai sarung tangan saat memotong, rapikan tepi potongan, dan gunakan alat potong yang tajam di area kerja yang terang. "
    "Simpan botol dan sisa potongan di tempat terpisah supaya tidak berserakan.")
add("bebas", "bebas",
    {"kota": "Sidoarjo", "modal_user": 500000, "produk_terpilih": None, "rekomendasi_terakhir": ["Planter vertikal dari galon bekas", "Tas dan dompet anyaman dari kemasan sachet"]},
    ["di sidoarjo kak", "budget 500 ribu"], "ampas kopi nanti berjamur ga klo disimpan lama",
    "Bisa, ampas kopi basah gampang berjamur. Keringkan dulu sampai benar-benar kering (jemur atau angin-anginkan), lalu simpan di wadah tertutup rapat di tempat kering. "
    "Kalau sudah berjamur, sebaiknya jangan dipakai untuk produk yang menempel ke kulit atau makanan.")
add("bebas", "bebas",
    {"kota": "Surabaya", "modal_user": 5000000, "produk_terpilih": None, "rekomendasi_terakhir": ["Tote bag dari spanduk bekas", "Sapu dari botol PET bekas"]},
    ["Surabaya, modal 5 juta"], "apa bedanya plastik HDPE sama PET buat kerajinan?",
    "Secara umum, PET (botol air mineral, bening dan kaku) cocok dipotong jadi strip atau dipakai langsung untuk kerajinan. "
    "HDPE (tutup botol, jerigen, botol sampo; lebih lentur dan buram) cocok dilebur lalu dicetak karena titik leburnya lebih rendah. "
    "Cek jenisnya dari kode daur ulang di dasar kemasan (1 untuk PET, 2 untuk HDPE), dan jangan melebur plastik tanpa ventilasi yang baik.")
add("bebas", "luar_topik", {"kota": None, "modal_user": None, "produk_terpilih": None, "rekomendasi_terakhir": []},
    [], "cuaca besok gimana",
    "Maaf, aku khusus membantu soal usaha dan material daur ulang di Circlo, jadi untuk cuaca lebih baik cek aplikasi cuaca. Kalau mau, aku bisa bantu cari ide usaha dari material sisa.")
add("bebas", "luar_topik",
    {"kota": "Surabaya", "modal_user": 5000000, "produk_terpilih": None, "rekomendasi_terakhir": ["Tote bag dari spanduk bekas", "Sapu dari botol PET bekas", "Patchwork pouch dan tas dari perca kain"]},
    ["Surabaya, modal 5 juta"], "tolong buatin kode python buat kalkulator",
    "Maaf, soal kode Python di luar yang bisa kubantu di sini, karena aku fokus pada usaha dari material daur ulang. Kalau mau, kita lanjut bahas ide yang tadi atau hitung kebutuhan bahannya.")

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gold_examples.jsonl")
    bad = 0
    for g in G:
        st, why = validate.check(g)
        if st == "FAIL":
            bad += 1
            print(f"  {g['id']} ({g['task']}/{g['kind']}): {st} {why}")
    with open(out, "w", encoding="utf-8") as f:
        for g in G:
            f.write(json.dumps(g, ensure_ascii=False) + "\n")
    print(f"{len(G)} contoh emas -> {out}; gagal validasi: {bad}")
