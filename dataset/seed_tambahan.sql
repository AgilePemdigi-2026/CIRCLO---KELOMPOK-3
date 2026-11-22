-- =====================================================================
-- SEED TAMBAHAN Circlo: +7 penjual, +71 material, +63 resep
-- Jalankan SETELAH schema_supabase.sql, step1_ai_schema.sql, step2_seed_data.sql
-- Aman dijalankan ulang (ON CONFLICT DO NOTHING). Struktur tabel TIDAK berubah.
--
-- PENTING: semua harga, stok, dan angka resep adalah DUMMY / ESTIMASI KASAR untuk
-- pengembangan dan demo. Ganti dengan data asli (survei penjual, pelaku UMKM)
-- sebelum dipakai di luar kebutuhan perkuliahan.
--
-- Setelah menjalankan file ini, buat embedding material baru:
--     python step2_embed_materials.py
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Penjual dummy tambahan
-- ---------------------------------------------------------------------
INSERT INTO penjual (nama_seller, email_seller, password_seller, status_seller, alamat_seller)
VALUES
 ('Sby Kain dan Konveksi Hub', 'surabaya2@seed.circlo.test', 'DUMMY-GANTI-DENGAN-HASH', true, 'Wonokromo, Surabaya, Jawa Timur'),
 ('Eco Warehouse Margomulyo',  'surabaya3@seed.circlo.test', 'DUMMY-GANTI-DENGAN-HASH', true, 'Margomulyo, Surabaya, Jawa Timur'),
 ('Waru Daur Kreasi',          'sidoarjo2@seed.circlo.test', 'DUMMY-GANTI-DENGAN-HASH', true, 'Waru, Sidoarjo, Jawa Timur'),
 ('Batu Agro Limbah',          'batu@seed.circlo.test',      'DUMMY-GANTI-DENGAN-HASH', true, 'Batu, Jawa Timur'),
 ('Pasuruan Industri Lestari', 'pasuruan@seed.circlo.test',  'DUMMY-GANTI-DENGAN-HASH', true, 'Rembang, Pasuruan, Jawa Timur'),
 ('Kediri Material Hub',       'kediri@seed.circlo.test',    'DUMMY-GANTI-DENGAN-HASH', true, 'Kota Kediri, Jawa Timur'),
 ('Jember Hasil Bumi',         'jember@seed.circlo.test',    'DUMMY-GANTI-DENGAN-HASH', true, 'Jember, Jawa Timur')
ON CONFLICT (email_seller) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Material tambahan
--    kolom: email penjual, nama, kategori, stok, harga/satuan, lokasi,
--           deskripsi, kota, provinsi, satuan
--    Nama "Kain Katun Hitam", "Denim Sisa Produksi", "Botol PET Bekas",
--    "Plastik PET Daur Ulang" sengaja sama dengan skenario user story /search.
-- ---------------------------------------------------------------------
INSERT INTO material
    (id_seller, nama_material, kategori, stok, status_material, harga,
     lokasi, deskripsi_material, kota, provinsi, satuan)
SELECT p.id_seller, v.nama, v.kategori, v.stok, true, v.harga,
       v.lokasi, v.deskripsi, v.kota, v.provinsi, v.satuan
FROM (VALUES
-- ===== SURABAYA (kain dan konveksi) =====
('surabaya2@seed.circlo.test','Kain Katun Hitam','Tekstil',120,12000,'Wonokromo, Surabaya','Sisa roll kain katun hitam dari produksi seragam, lebar sekitar 110 cm. Cocok untuk tote bag, apron, dan sarung bantal.','Surabaya','Jawa Timur','meter'),
('surabaya2@seed.circlo.test','Denim Sisa Produksi','Tekstil',150,15000,'Wonokromo, Surabaya','Potongan panjang denim sisa pabrik jeans, tebal dan kuat. Cocok untuk tote bag, ransel, dan apron.','Surabaya','Jawa Timur','meter'),
('surabaya2@seed.circlo.test','Kain Kanvas Bekas Tenda Acara','Tekstil',80,14000,'Wonokromo, Surabaya','Kain kanvas tebal bekas tenda acara, ada noda ringan. Cocok untuk tote bag, tas ransel, dan alas.','Surabaya','Jawa Timur','meter'),
('surabaya2@seed.circlo.test','Kain Blacu Mori Sisa Pabrik Sablon','Tekstil',200,8000,'Wonokromo, Surabaya','Kain blacu polos sisa pabrik sablon, mudah disablon. Cocok untuk tote bag polos, sarung bantal, dan kemasan kain.','Surabaya','Jawa Timur','meter'),
('surabaya2@seed.circlo.test','Kain Parasut Sisa Produksi Jaket','Tekstil',100,9000,'Wonokromo, Surabaya','Sisa kain parasut nilon dari produksi jaket, ringan dan tahan percikan air. Cocok untuk tas lipat dan ransel ringan.','Surabaya','Jawa Timur','meter'),
('surabaya2@seed.circlo.test','Perca Flanel Warna-Warni','Tekstil',90,11000,'Wonokromo, Surabaya','Perca flanel lembut aneka warna. Cocok untuk boneka, bros, dan dekorasi.','Surabaya','Jawa Timur','kg'),
('surabaya2@seed.circlo.test','Kain Sprei dan Gorden Bekas Hotel','Tekstil',300,6000,'Wonokromo, Surabaya','Linen hotel afkir berupa sprei dan gorden katun tebal, bersih. Cocok untuk tas belanja, keset, dan sarung bantal.','Surabaya','Jawa Timur','kg'),
('surabaya2@seed.circlo.test','Perca Batik Cetak Aneka Motif','Tekstil',70,14000,'Wonokromo, Surabaya','Perca batik cetak beragam motif. Cocok untuk patchwork, tas, dan aksesori.','Surabaya','Jawa Timur','kg'),
('surabaya2@seed.circlo.test','Kain Tenun Lurik Sisa Produksi','Tekstil',50,16000,'Wonokromo, Surabaya','Sisa kain tenun lurik motif garis, kuat. Cocok untuk tas, taplak, dan sampul buku.','Surabaya','Jawa Timur','meter'),
('surabaya2@seed.circlo.test','Perca Kain Tile dan Brokat Sisa Butik','Tekstil',40,25000,'Wonokromo, Surabaya','Perca kain tile dan brokat dari butik kebaya. Cocok untuk aksesori rambut, hiasan, dan kemasan hampers.','Surabaya','Jawa Timur','kg'),
('surabaya2@seed.circlo.test','Tali Webbing Sisa Produksi Tas','Tekstil',500,2500,'Wonokromo, Surabaya','Tali webbing sisa produksi tas, kuat. Cocok untuk tali tote bag, ransel, dan sabuk.','Surabaya','Jawa Timur','meter'),
('surabaya2@seed.circlo.test','Perca Kain Kaos Sisa Sablon','Tekstil',300,6000,'Wonokromo, Surabaya','Perca kain kaos katun dari sablon, elastis. Cocok untuk tali kain, keset rajut, dan lap.','Surabaya','Jawa Timur','kg'),

-- ===== SURABAYA (plastik dan spanduk) =====
('surabaya3@seed.circlo.test','Botol PET Bekas','Plastik',600,4000,'Margomulyo, Surabaya','Botol plastik PET minuman bekas campur warna, label dilepas dan sudah dicuci. Cocok untuk kerajinan, sapu botol, dan bahan daur ulang.','Surabaya','Jawa Timur','kg'),
('surabaya3@seed.circlo.test','Plastik PET Daur Ulang','Plastik',300,9000,'Margomulyo, Surabaya','Serpihan plastik PET hasil cacahan bersih, siap diproses ulang. Cocok untuk bahan baku produk cetak dan serat.','Surabaya','Jawa Timur','kg'),
('surabaya3@seed.circlo.test','Plastik HDPE Cacahan Bersih','Plastik',250,6500,'Margomulyo, Surabaya','Cacahan plastik HDPE dari jerigen dan tutup botol, bersih dan kering. Cocok untuk dilebur menjadi papan, paving, dan pot.','Surabaya','Jawa Timur','kg'),
('surabaya3@seed.circlo.test','Gelas Air Mineral Plastik PP Bekas','Plastik',180,3500,'Margomulyo, Surabaya','Gelas air mineral plastik PP bekas yang sudah dicuci. Cocok untuk pot semai, wadah kerajinan, dan bahan lebur.','Surabaya','Jawa Timur','kg'),
('surabaya3@seed.circlo.test','Plastik Bubble Wrap Bekas','Plastik',90,5000,'Margomulyo, Surabaya','Bubble wrap bekas kemasan, bersih. Cocok untuk kemasan ulang, isolasi, dan kerajinan.','Surabaya','Jawa Timur','kg'),
('surabaya3@seed.circlo.test','Drum Plastik 120 Liter Bekas Bahan Pangan','Plastik',40,85000,'Margomulyo, Surabaya','Drum plastik HDPE bekas bahan pangan, sudah dicuci. Cocok untuk komposter, penampung air hujan, dan tong sampah.','Surabaya','Jawa Timur','pcs'),
('surabaya3@seed.circlo.test','Pipa PVC Sisa Proyek','Plastik',300,3000,'Margomulyo, Surabaya','Potongan pipa PVC sisa proyek instalasi, beragam diameter. Cocok untuk rak, pot gantung, dan rangka kerajinan.','Surabaya','Jawa Timur','kg'),
('surabaya3@seed.circlo.test','Pelet Plastik Sisa Reject Pabrik Injeksi','Plastik',500,8000,'Margomulyo, Surabaya','Pelet dan produk reject dari pabrik injeksi plastik. Cocok untuk dilebur dan dicetak ulang menjadi papan atau produk press.','Surabaya','Jawa Timur','kg'),
('surabaya3@seed.circlo.test','Terpal Bekas Truk dan Proyek','Spanduk',200,5500,'Margomulyo, Surabaya','Terpal bekas truk dan proyek, kuat dan tahan air, ada bekas lipatan. Cocok untuk tas, alas, dan penutup.','Surabaya','Jawa Timur','m2'),
('surabaya3@seed.circlo.test','Spanduk Vinil Baliho Besar Kondisi Sangat Baik','Spanduk',400,7500,'Margomulyo, Surabaya','Spanduk vinil baliho berukuran besar, tebal, dan hampir tanpa sobekan. Cocok untuk tas dan produk berukuran besar.','Surabaya','Jawa Timur','m2'),
('surabaya3@seed.circlo.test','Banner Mesh Jaring Bekas Pagar Proyek','Spanduk',120,4500,'Margomulyo, Surabaya','Banner mesh berpori bekas pagar proyek, ringan. Cocok untuk keranjang jaring, tas belanja, dan penutup.','Surabaya','Jawa Timur','m2'),
('surabaya3@seed.circlo.test','Tutup Botol HDPE Terpilah per Warna','Plastik',350,6000,'Margomulyo, Surabaya','Tutup botol HDPE yang sudah dipilah per warna. Cocok untuk mozaik, hiasan dinding, dan bahan lebur.','Surabaya','Jawa Timur','kg'),

-- ===== SIDOARJO (kulit, karet, kayu, busa) =====
('sidoarjo2@seed.circlo.test','Kulit Sintetis Sisa Jok Motor','Kulit',140,12000,'Waru, Sidoarjo','Sisa kulit sintetis jok motor, tebal dan kuat. Cocok untuk dompet, tatakan, dan sampul.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo2@seed.circlo.test','Perca Kulit Sapi Nabati Natural','Kulit',60,55000,'Waru, Sidoarjo','Perca kulit nabati natural yang mudah diwarnai dan diukir. Cocok untuk gantungan kunci, tali tas, dan dompet.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo2@seed.circlo.test','Kulit Domba Sisa Potongan Jaket','Kulit',40,65000,'Waru, Sidoarjo','Sisa potongan kulit domba yang lembut. Cocok untuk sampul buku, dompet kartu, dan aksesori.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo2@seed.circlo.test','Ban Luar Motor Bekas','Karet',120,15000,'Waru, Sidoarjo','Ban luar motor bekas yang sudah dibersihkan. Cocok untuk pot, ayunan, dan kursi kreatif.','Sidoarjo','Jawa Timur','pcs'),
('sidoarjo2@seed.circlo.test','Karet Sol Sepatu Sisa Pabrik','Karet',150,3500,'Waru, Sidoarjo','Sisa potongan karet sol sepatu dari pabrik. Cocok untuk alas sandal, keset, dan pijakan.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo2@seed.circlo.test','Busa Poliuretan Sisa Jok dan Kasur','Plastik',80,4000,'Waru, Sidoarjo','Sisa busa poliuretan dari jok dan kasur. Cocok untuk isi bantal lantai, pouf, dan peredam.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo2@seed.circlo.test','Papan Bekas Bekisting Proyek','Kayu',200,15000,'Waru, Sidoarjo','Papan bekisting bekas proyek, sudah dibersihkan dari paku. Cocok untuk rak, kursi, dan meja.','Sidoarjo','Jawa Timur','pcs'),
('sidoarjo2@seed.circlo.test','Balok Kayu Jati Bekas Bongkaran','Kayu',40,120000,'Waru, Sidoarjo','Balok kayu jati bekas bongkaran rumah, kuat dan awet. Cocok untuk meja kopi dan furnitur.','Sidoarjo','Jawa Timur','pcs'),
('sidoarjo2@seed.circlo.test','Bambu Bekas Scaffolding dan Pagar','Kayu',100,15000,'Waru, Sidoarjo','Bambu bekas scaffolding dan pagar, sudah kering. Cocok untuk rak, kursi, dan dekorasi.','Sidoarjo','Jawa Timur','pcs'),
('sidoarjo2@seed.circlo.test','Kain Handuk Bekas Hotel','Tekstil',120,5000,'Waru, Sidoarjo','Handuk bekas hotel yang sudah dicuci. Cocok untuk keset, lap, dan kain pembersih.','Sidoarjo','Jawa Timur','kg'),

-- ===== BATU (organik) =====
('batu@seed.circlo.test','Kulit Kopi Cascara Kering','Organik',200,4000,'Batu, Jawa Timur','Kulit buah kopi kering dari pengolahan kopi. Cocok untuk kompos dan pewarna alami.','Batu','Jawa Timur','kg'),
('batu@seed.circlo.test','Kulit Jeruk Sisa Perasan','Organik',300,1000,'Batu, Jawa Timur','Kulit jeruk segar sisa perasan. Cocok untuk eco-enzyme dan pembersih alami.','Batu','Jawa Timur','kg'),
('batu@seed.circlo.test','Kulit Pisang dan Sisa Buah Pasar','Organik',400,500,'Batu, Jawa Timur','Kulit pisang dan sisa buah dari pasar. Cocok untuk kompos dan eco-enzyme.','Batu','Jawa Timur','kg'),
('batu@seed.circlo.test','Bonggol Jagung Kering','Organik',500,700,'Batu, Jawa Timur','Bonggol jagung kering. Cocok untuk briket dan kompos.','Batu','Jawa Timur','kg'),
('batu@seed.circlo.test','Ampas Tahu Segar','Organik',600,600,'Batu, Jawa Timur','Ampas tahu segar dari pabrik tahu, perlu cepat diolah. Cocok untuk pakan ternak dan kompos.','Batu','Jawa Timur','kg'),
('batu@seed.circlo.test','Kotoran Sapi Perah Kering','Organik',1000,800,'Batu, Jawa Timur','Kotoran sapi perah yang sudah dikeringkan. Cocok untuk pupuk kandang dan media tanam.','Batu','Jawa Timur','kg'),
('batu@seed.circlo.test','Daun Kering Gugur Serasah','Organik',400,300,'Batu, Jawa Timur','Daun kering gugur bersih. Cocok untuk kompos dan mulsa.','Batu','Jawa Timur','kg'),
('batu@seed.circlo.test','Ampas Teh Kering','Organik',100,3000,'Batu, Jawa Timur','Ampas teh yang sudah dikeringkan. Cocok untuk kompos dan campuran media tanam.','Batu','Jawa Timur','kg'),
('batu@seed.circlo.test','Cangkang Telur Bersih Kering','Organik',80,3000,'Batu, Jawa Timur','Cangkang telur bersih dan kering. Cocok untuk campuran pupuk kalsium dan hiasan mozaik.','Batu','Jawa Timur','kg'),
('batu@seed.circlo.test','Serat Pelepah Pisang Kering','Organik',100,4500,'Batu, Jawa Timur','Serat pelepah pisang kering. Cocok untuk anyaman, tali, dan kertas seni.','Batu','Jawa Timur','kg'),
('batu@seed.circlo.test','Eceng Gondok Kering','Organik',150,3500,'Batu, Jawa Timur','Eceng gondok kering. Cocok untuk anyaman tas, keranjang, dan tikar.','Batu','Jawa Timur','kg'),

-- ===== PASURUAN (kertas, logam, kaca) =====
('pasuruan@seed.circlo.test','Kertas Kraft Bekas Karung Semen','Kertas',400,2000,'Rembang, Pasuruan','Kertas kraft bekas karung semen, kuat. Cocok untuk kantong belanja, kertas kado, dan pembungkus.','Pasuruan','Jawa Timur','kg'),
('pasuruan@seed.circlo.test','Egg Tray Karton Bekas','Kertas',250,1800,'Rembang, Pasuruan','Egg tray karton bekas yang bersih. Cocok untuk peredam suara, pot semai, dan bubur kertas.','Pasuruan','Jawa Timur','kg'),
('pasuruan@seed.circlo.test','Majalah dan Katalog Bekas','Kertas',300,2200,'Rembang, Pasuruan','Majalah dan katalog bekas berwarna. Cocok untuk kerajinan gulung kertas, papier-mache, dan dekorasi.','Pasuruan','Jawa Timur','kg'),
('pasuruan@seed.circlo.test','Karton Gelombang Sisa Kemasan Besar','Kertas',600,2000,'Rembang, Pasuruan','Karton gelombang sisa kemasan besar. Cocok untuk kotak hampers, organizer, dan kerajinan.','Pasuruan','Jawa Timur','kg'),
('pasuruan@seed.circlo.test','Plat Seng Bekas Atap','Logam',200,4000,'Rembang, Pasuruan','Plat seng bekas atap, tepi tajam harus dirapikan. Cocok untuk kap lampu, hiasan, dan wadah.','Pasuruan','Jawa Timur','kg'),
('pasuruan@seed.circlo.test','Rangka Besi Hollow Sisa Pagar','Logam',400,6500,'Rembang, Pasuruan','Besi hollow sisa pagar dan kanopi. Cocok untuk rangka rak, meja, dan kursi industrial.','Pasuruan','Jawa Timur','kg'),
('pasuruan@seed.circlo.test','Tutup Botol Kaleng Crown Cap Bekas','Logam',40,5000,'Rembang, Pasuruan','Tutup botol kaleng (crown cap) bekas. Cocok untuk mozaik dan dekorasi, tepi tajam.','Pasuruan','Jawa Timur','kg'),
('pasuruan@seed.circlo.test','Sendok dan Garpu Stainless Afkir','Logam',30,20000,'Rembang, Pasuruan','Sendok dan garpu stainless afkir. Cocok untuk hiasan, gantungan, dan kerajinan.','Pasuruan','Jawa Timur','kg'),
('pasuruan@seed.circlo.test','Velg Sepeda Bekas','Logam',50,25000,'Rembang, Pasuruan','Velg sepeda bekas yang masih lurus. Cocok untuk lampu gantung, jam dinding, dan rak.','Pasuruan','Jawa Timur','pcs'),
('pasuruan@seed.circlo.test','Gelas Kaca Bekas Restoran','Kaca',400,2000,'Rembang, Pasuruan','Gelas kaca bekas restoran, sebagian ada goresan. Cocok untuk lilin, vas, dan lampu hias.','Pasuruan','Jawa Timur','pcs'),
('pasuruan@seed.circlo.test','Botol Kaca Kecap dan Sirup Bekas','Kaca',600,800,'Rembang, Pasuruan','Botol kaca kecap dan sirup bekas, sudah dicuci. Cocok untuk lampu hias, vas, dan wadah.','Pasuruan','Jawa Timur','pcs'),
('pasuruan@seed.circlo.test','Botol Kaca Wine dan Bir Tebal','Kaca',300,1500,'Rembang, Pasuruan','Botol kaca wine dan bir yang tebal. Cocok untuk terrarium, vas, dan lampu botol.','Pasuruan','Jawa Timur','pcs'),

-- ===== KEDIRI (kayu, logam, tekstil) =====
('kediri@seed.circlo.test','Pallet Kayu Ekspor Heat Treated Bekas','Kayu',80,55000,'Kota Kediri','Pallet ekspor bertanda perlakuan panas (heat treated), lebih aman untuk furnitur dalam ruangan.','Kediri','Jawa Timur','pcs'),
('kediri@seed.circlo.test','Papan Pallet Bongkaran Bebas Paku','Kayu',400,6000,'Kota Kediri','Papan hasil bongkar pallet, sudah bebas paku. Cocok untuk rak, papan nama, dan hiasan.','Kediri','Jawa Timur','pcs'),
('kediri@seed.circlo.test','Kayu Limbah Gergaji Slab dan Pinggiran','Kayu',500,1800,'Kota Kediri','Kayu limbah gergaji berupa slab dan pinggiran. Cocok untuk mainan, talenan, dan kerajinan.','Kediri','Jawa Timur','kg'),
('kediri@seed.circlo.test','Kayu Sengon Bekas Peti Kemas','Kayu',150,7000,'Kota Kediri','Kayu sengon bekas peti kemas, ringan dan mudah dikerjakan. Cocok untuk peti, pot, dan rak.','Kediri','Jawa Timur','pcs'),
('kediri@seed.circlo.test','Roda dan Kastor Bekas Gudang','Logam',120,8000,'Kota Kediri','Roda dan kastor bekas gudang yang masih lancar. Cocok untuk meja dorong dan furnitur pallet.','Kediri','Jawa Timur','pcs'),
('kediri@seed.circlo.test','Karung Goni Bekas Pabrik Gula','Tekstil',200,8000,'Kota Kediri','Karung goni bekas pabrik gula, kuat dan berserat. Cocok untuk tas, dekorasi, dan alas tanaman.','Kediri','Jawa Timur','pcs'),
('kediri@seed.circlo.test','Tali Tambang Nilon Bekas','Tekstil',300,4000,'Kota Kediri','Tali tambang nilon bekas, kuat. Cocok untuk makrame, keranjang tali, dan ayunan.','Kediri','Jawa Timur','meter'),

-- ===== JEMBER (hasil bumi) =====
('jember@seed.circlo.test','Kulit Buah Kakao Kering','Organik',400,600,'Jember','Kulit buah kakao kering dari pengolahan cokelat. Cocok untuk kompos dan pupuk organik.','Jember','Jawa Timur','kg'),
('jember@seed.circlo.test','Jerami Padi Bal','Organik',800,600,'Jember','Jerami padi kering dalam bentuk bal. Cocok untuk kompos, mulsa, dan media jamur merang.','Jember','Jawa Timur','kg'),
('jember@seed.circlo.test','Kulit Singkong Kering','Organik',300,500,'Jember','Kulit singkong kering. Cocok untuk kompos dan pakan ternak setelah diolah.','Jember','Jawa Timur','kg'),
('jember@seed.circlo.test','Daun Pisang Kering Klaras','Organik',200,1500,'Jember','Daun pisang kering (klaras). Cocok untuk kemasan alami, hiasan, dan kerajinan.','Jember','Jawa Timur','kg'),
('jember@seed.circlo.test','Pelepah Pinang Kering','Organik',300,1500,'Jember','Pelepah pinang kering yang bisa dipress menjadi piring dan wadah. Cocok untuk wadah kerajinan.','Jember','Jawa Timur','pcs'),
('jember@seed.circlo.test','Serutan Kayu Bersih','Kayu',300,1200,'Jember','Serutan kayu bersih dari bengkel. Cocok untuk media jamur, alas kandang, dan kompos.','Jember','Jawa Timur','kg'),
('jember@seed.circlo.test','Ampas Kopi Robusta Kering','Organik',250,3000,'Jember','Ampas kopi robusta kering. Cocok untuk scrub, pupuk, dan media jamur.','Jember','Jawa Timur','kg')
) AS v(email, nama, kategori, stok, harga, lokasi, deskripsi, kota, provinsi, satuan)
JOIN penjual p ON p.email_seller = v.email
ON CONFLICT (id_seller, nama_material) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Resep produk tambahan (63 resep, ESTIMASI KASAR)
--    bahan_per_unit memakai satuan yang sama dengan material terkait.
--    kata_kunci_material = regex (tidak peka huruf besar/kecil) untuk nama material.
--    estimasi_modal = modal awal kasar (alat + bahan awal), dalam Rupiah.
-- ---------------------------------------------------------------------
INSERT INTO resep_produk
    (nama_produk, kategori_material, kata_kunci_material, bahan_per_unit,
     satuan, persen_susut, estimasi_modal, langkah_singkat, catatan_k3)
VALUES
-- Tekstil: tas dan perlengkapan rumah
('Tote bag kain katun dan blacu dengan sablon','Tekstil','katun hitam|blacu',0.600,'meter',0.150,3500000,
 'Cuci dan setrika kain, potong sesuai pola, jahit badan dan tali, sablon desain, finishing jahitan.',
 'Gunakan tinta sablon berbasis air dan pakai masker saat menyablon.'),
('Tote bag denim dan kanvas dengan tali webbing','Tekstil','denim sisa|kanvas',0.800,'meter',0.200,3500000,
 'Potong pola, jahit badan dan lapisan dalam, pasang tali, perkuat sudut jahitan.',
 'Gunakan jarum denim dan hati-hati dengan debu serat saat memotong.'),
('Ransel lipat dari kain parasut','Tekstil','parasut',1.200,'meter',0.150,3000000,
 'Potong pola ransel, jahit rangkap di bagian tarikan, pasang tali dan resleting, lipat jadi kantong kecil.',
 'Kain licin: gunakan penjepit, bukan peniti, agar jahitan lurus.'),
('Apron dan celemek dari denim atau kanvas','Tekstil','denim sisa|kanvas|blacu',1.000,'meter',0.150,2500000,
 'Potong pola apron, jahit tepi, pasang saku dan tali leher.',
 'Cuci kain sebelum dijahit agar tidak menyusut.'),
('Sarung bantal sofa dari kain blacu atau katun','Tekstil','blacu|katun hitam',0.900,'meter',0.100,2500000,
 'Potong dua lembar, jahit tiga sisi, pasang resleting, sablon atau bordir motif.',
 'Cuci kain sebelum dijahit agar tidak menyusut.'),
('Tas dan taplak dari kain tenun lurik','Tekstil','lurik|tenun',0.900,'meter',0.100,3500000,
 'Samakan arah garis motif saat memotong, jahit sesuai produk, finishing tepi.',
 'Cek kain luntur sebelum dijahit.'),
('Makrame dan keranjang tali dari tambang bekas','Tekstil','tambang',20.000,'meter',0.100,1500000,
 'Cuci tali, rangkai simpul makrame atau lilit membentuk keranjang, rapikan ujung.',
 'Pastikan tali bersih dari minyak atau bahan kimia.'),
('Tas belanja dari linen hotel bekas','Tekstil','sprei|gorden',0.500,'kg',0.100,2500000,
 'Cuci dan setrika, potong pola, jahit rangkap, pasang tali.',
 'Pastikan linen sudah dicuci bersih sebelum diolah.'),
('Keset rajut dari perca kain kaos','Tekstil','kaos',0.600,'kg',0.100,2000000,
 'Gunting kain kaos menjadi tali panjang, rajut atau anyam menjadi keset, finishing tepi.',
 'Beri alas antislip di bagian bawah.'),
('Keset dan lap dari handuk bekas hotel','Tekstil','handuk',0.500,'kg',0.100,1500000,
 'Cuci, potong ukuran seragam, jahit tepi, tambahkan alas antislip.',
 'Pastikan handuk sudah dicuci bersih dan dijemur kering.'),
('Tas patchwork dari perca batik','Tekstil','batik',0.350,'kg',0.150,3500000,
 'Pilah perca per motif, potong persegi, jahit patchwork, lapisi dan jahit menjadi tas.',
 'Cuci perca terlebih dahulu agar tidak luntur.'),
('Boneka dan bros dari perca flanel','Tekstil','flanel',0.200,'kg',0.150,2000000,
 'Potong pola kecil, jahit tangan atau mesin, isi dakron, beri detail wajah dan peniti.',
 'Untuk produk anak, pastikan jahitan kuat dan tanpa komponen kecil yang mudah lepas.'),
('Aksesori rambut dan hampers dari kain tile dan brokat','Tekstil','tile|brokat',0.150,'kg',0.200,2000000,
 'Potong dan lipat kain, jahit tepi, pasang jepit atau karet, kemas dalam kotak hampers.',
 'Kain halus mudah berserabut: gunakan gunting tajam.'),
-- Spanduk dan terpal
('Tote bag dan tas serbaguna dari terpal bekas','Spanduk','terpal',0.800,'m2',0.200,3000000,
 'Cuci dan jemur, potong pola, jahit rangkap atau tempel dengan heat sealer, pasang tali.',
 'Pakai masker saat mencuci. Jangan untuk produk yang menyentuh makanan.'),
('Keranjang dan tas belanja dari banner mesh','Spanduk','mesh',0.500,'m2',0.100,2000000,
 'Potong pola, jahit tepi, pasang tali, perkuat dasar keranjang.',
 'Rapikan tepi potongan agar tidak melukai tangan.'),
-- Kulit
('Dompet dan tatakan dari kulit sintetis jok','Kulit','jok motor|sintetis',0.120,'kg',0.200,3000000,
 'Potong pola, jahit atau rekatkan, haluskan tepi, finishing.',
 'Gunakan lem di ruangan berventilasi baik.'),
('Gantungan kunci dan tali tas dari kulit nabati','Kulit','nabati',0.060,'kg',0.150,3500000,
 'Potong strip kulit, basahi dan cetak motif, pasang kait, warnai dan lapisi finishing.',
 'Gunakan sarung tangan dan ventilasi baik saat memakai pewarna kulit.'),
('Sampul buku dan dompet kartu dari kulit domba','Kulit','domba',0.080,'kg',0.200,4000000,
 'Pilih bagian bebas cacat, potong pola, jahit tangan, finishing tepi.',
 'Gunakan pisau potong dengan alas dan hati-hati.'),
-- Plastik dan busa
('Komposter dan pot besar dari drum plastik bekas','Plastik','drum plastik',1.000,'pcs',0.050,2000000,
 'Cuci drum, lubangi untuk sirkulasi dan drainase, pasang kran atau tutup, letakkan di tempat teduh.',
 'Pastikan drum bekas bahan pangan, bukan bekas bahan kimia.'),
('Papan dan balok plastik dari cacahan HDPE','Plastik','cacahan|pelet',4.500,'kg',0.050,20000000,
 'Cacah dan bersihkan, lebur dengan mesin ekstruder atau press, cetak papan, dinginkan, rapikan tepi.',
 'Asap lelehan plastik berbahaya: pakai respirator, ventilasi baik, sarung tangan tahan panas.'),
('Pot semai dan wadah kerajinan dari gelas air mineral','Plastik','gelas air mineral',0.150,'kg',0.050,1000000,
 'Cuci gelas, lubangi dasar, isi media tanam atau rangkai menjadi hiasan.',
 'Gunakan hanya untuk tanaman hias atau semai, bukan wadah makanan.'),
('Rak dan pot gantung dari pipa PVC sisa','Plastik','pipa pvc',3.000,'kg',0.100,3000000,
 'Potong pipa, amplas, rakit dengan sambungan atau lem, cat atau biarkan natural.',
 'Jangan membakar PVC; pakai masker saat mengamplas.'),
('Pouf dan bantal lantai dari busa sisa','Plastik','busa',1.500,'kg',0.100,2500000,
 'Cacah busa menjadi serpihan, isi ke sarung kain yang sudah dijahit, tutup resleting.',
 'Busa mudah terbakar: jauhkan dari api dan gunakan masker saat mencacah.'),
('Pot gantung dan lampu hias dari botol PET','Plastik','botol pet',0.200,'kg',0.100,1500000,
 'Potong botol sesuai pola, bakar tepi dengan sangat hati-hati atau amplas, rangkai dan beri cat.',
 'Jangan memanaskan PET tanpa ventilasi; pakai sarung tangan saat memotong.'),
('Produk cetak dari serpihan PET daur ulang','Plastik','plastik pet daur ulang',1.000,'kg',0.050,15000000,
 'Keringkan serpihan, panaskan dan cetak dengan mesin press atau injeksi kecil, dinginkan dan rapikan.',
 'Suhu tinggi dan asap: gunakan respirator dan ventilasi baik.'),
('Mozaik dan hiasan dinding dari tutup botol berwarna','Plastik','tutup botol',0.500,'kg',0.100,1000000,
 'Pilah tutup per warna, susun pola, tempel pada papan dasar dengan lem kuat.',
 'Gunakan lem di ruangan berventilasi.'),
-- Kayu dan bambu
('Rak dinding dan kursi dari papan bekisting','Kayu','bekisting',4.000,'pcs',0.100,4000000,
 'Cabut paku, amplas, potong, rakit dengan sekrup, pernis atau cat.',
 'Periksa sisa paku dan pakai masker saat mengamplas.'),
('Meja kopi dari balok kayu jati bekas','Kayu','jati',3.000,'pcs',0.050,6000000,
 'Bersihkan dan amplas balok, rakit dengan sambungan kayu, finishing dengan pernis atau minyak kayu.',
 'Gunakan masker dan kacamata saat mengamplas dan memotong.'),
('Rak buku dan kursi dari bambu bekas','Kayu','bambu',6.000,'pcs',0.150,4000000,
 'Potong bambu, haluskan, rakit dengan sambungan atau baut, pernis.',
 'Rapikan serat tajam; pakai sarung tangan.'),
('Meja dan rak dari pallet ekspor heat treated','Kayu','ekspor|heat treated',2.000,'pcs',0.100,5000000,
 'Amplas pallet, rakit sesuai desain, tambahkan kaki atau roda, pernis.',
 'Pilih pallet bertanda heat treated untuk pemakaian dalam ruangan.'),
('Rak mini dan papan nama dari papan pallet','Kayu','papan pallet',6.000,'pcs',0.150,3000000,
 'Amplas papan, potong, rakit, tulis atau pirografi nama, finishing.',
 'Pakai masker saat mengamplas.'),
('Mainan edukatif dan talenan dari kayu limbah gergaji','Kayu','limbah gergaji|slab',1.500,'kg',0.300,6000000,
 'Pilih kayu keras, potong dan haluskan, rakit atau rekatkan, lapisi minyak aman.',
 'Mainan anak: pastikan tepi halus dan finishing aman.'),
('Peti dan pot kayu dari kayu sengon bekas peti','Kayu','sengon',4.000,'pcs',0.100,3500000,
 'Bongkar peti, amplas, potong ukuran, rakit, finishing anti-lembap.',
 'Cabut paku dengan hati-hati dan pakai sarung tangan.'),
-- Organik dan pertanian
('Eco-enzyme pembersih dari kulit jeruk dan buah','Organik','kulit jeruk|kulit pisang',0.300,'kg',0.100,2000000,
 'Campur sisa buah, gula, dan air dengan perbandingan tetap dalam wadah tertutup, fermentasi beberapa bulan, saring dan kemas.',
 'Buka tutup wadah secara berkala untuk melepas gas dan jangan diminum.'),
('Kompos dan pupuk organik dari serasah dan limbah hasil bumi','Organik','serasah|daun kering|kakao|jerami|singkong|ampas teh',2.500,'kg',0.100,6000000,
 'Cacah bahan, susun berlapis, tambahkan aktivator, aduk berkala, ayak dan kemas.',
 'Gunakan masker dan sarung tangan; jaga kelembapan agar tidak berbau.'),
('Pupuk kandang kemasan dari kotoran sapi','Organik','kotoran sapi',1.200,'kg',0.100,5000000,
 'Keringkan, ayak, campur dengan aktivator, kemas dalam karung berlabel.',
 'Gunakan masker dan sarung tangan; cuci tangan setelah bekerja.'),
('Briket dari bonggol jagung','Organik','bonggol jagung',3.000,'kg',0.100,8000000,
 'Karbonisasi dalam drum, haluskan, campur perekat tapioka, cetak dan keringkan. 1 unit = 1 kg briket.',
 'Lakukan di area terbuka; waspadai asap dan bara api.'),
('Pakan ternak fermentasi dari ampas tahu','Organik','ampas tahu',1.000,'kg',0.100,3000000,
 'Tiriskan ampas, campur bahan fermentasi, simpan tertutup beberapa hari, kemas.',
 'Pastikan bahan segar dan tidak berbau busuk; konsultasikan komposisi dengan peternak.'),
('Anyaman tas dan keranjang dari eceng gondok','Organik','eceng gondok',0.800,'kg',0.150,3500000,
 'Jemur sampai kering, pilin atau anyam, bentuk tas atau keranjang, lapisi vernis.',
 'Pastikan bahan benar-benar kering agar tidak berjamur.'),
('Kertas seni dan tali dari serat pelepah pisang','Organik','pelepah pisang',0.500,'kg',0.200,4000000,
 'Rebus dan lunakkan serat, pukul menjadi pulp, cetak lembaran atau pilin menjadi tali, jemur.',
 'Hati-hati dengan air panas saat merebus.'),
('Pewarna alami tekstil dari cascara dan kulit kopi','Organik','cascara|kulit kopi',0.400,'kg',0.100,3000000,
 'Rebus bahan, saring, rendam kain dengan mordan, bilas dan keringkan. 1 unit = 1 liter larutan pewarna.',
 'Gunakan panci khusus pewarna, bukan peralatan makan.'),
('Hiasan mozaik dan pupuk kalsium dari cangkang telur','Organik','cangkang telur',0.200,'kg',0.150,1500000,
 'Cuci dan keringkan, hancurkan sesuai kebutuhan, tempel sebagai mozaik atau haluskan sebagai pupuk.',
 'Cuci bersih untuk menghindari bau dan bakteri.'),
('Kemasan dan hiasan dari daun pisang kering','Organik','klaras|daun pisang',0.200,'kg',0.200,1500000,
 'Jemur, setrika tipis, potong, bentuk sebagai pembungkus atau hiasan.',
 'Jauhkan dari api saat dikeringkan.'),
('Piring dan wadah dari pelepah pinang','Organik','pelepah pinang',2.000,'pcs',0.100,12000000,
 'Bersihkan dan rendam, potong, press panas dengan cetakan, rapikan tepi.',
 'Mesin press panas: gunakan sarung tangan tahan panas.'),
-- Kertas
('Kantong belanja dan kertas kado dari kertas kraft karung semen','Kertas','kraft',0.400,'kg',0.200,2000000,
 'Bersihkan, setrika, potong, lipat dan rekatkan menjadi kantong, pasang tali.',
 'Pakai masker karena sisa debu semen; pastikan kertas sudah bersih.'),
('Pot semai dan peredam suara dari egg tray','Kertas','egg tray',0.500,'kg',0.100,1500000,
 'Rendam dan hancurkan menjadi bubur kertas, cetak, keringkan, lapisi finishing.',
 'Gunakan blender khusus, bukan peralatan dapur makanan.'),
('Hiasan dan papier-mache dari majalah bekas','Kertas','majalah|katalog',0.400,'kg',0.100,1000000,
 'Gulung atau sobek kertas, rekatkan dengan lem kanji, bentuk, keringkan, cat.',
 'Gunakan lem aman dan ventilasi baik.'),
('Kotak hampers dari karton gelombang','Kertas','gelombang',1.000,'kg',0.150,3000000,
 'Potong pola, lipat dan rekatkan, lapisi kertas atau kain, tambahkan stempel merek.',
 'Gunakan cutter dengan alas dan hati-hati.'),
-- Logam
('Lampu gantung dan jam dinding dari velg sepeda','Logam','velg',1.000,'pcs',0.050,3500000,
 'Bersihkan karat, cat, pasang fitting lampu atau mesin jam, gantung.',
 'Pastikan pemasangan listrik oleh orang yang paham dan sesuai standar.'),
('Rak dan kursi industrial dari besi hollow sisa','Logam','hollow',5.000,'kg',0.100,12000000,
 'Potong, las, gerinda, cat anti karat, pasang papan kayu.',
 'Las dan gerinda butuh APD lengkap: helm las, sarung tangan, sepatu, ventilasi.'),
('Mozaik dan hiasan dari tutup botol kaleng','Logam','crown cap',0.300,'kg',0.100,1000000,
 'Ratakan tutup, susun pola, tempel pada papan dasar, lapisi pernis.',
 'Tepi tajam: pakai sarung tangan.'),
('Hiasan dan gantungan dari sendok garpu stainless','Logam','stainless',0.150,'kg',0.100,2000000,
 'Bengkokkan atau potong dengan alat, haluskan, rangkai menjadi hiasan atau gantungan.',
 'Pakai kacamata dan sarung tangan saat memotong logam.'),
('Kap lampu dan hiasan dari plat seng bekas','Logam','plat seng',1.000,'kg',0.200,5000000,
 'Ratakan, gunting atau tatah motif, bentuk, haluskan tepi, pasang fitting.',
 'Tepi seng sangat tajam: pakai sarung tangan tebal dan rapikan tepi.'),
('Meja dorong dari pallet dan roda bekas','Logam','roda|kastor',4.000,'pcs',0.050,6000000,
 'Pasang roda ke rangka pallet, perkuat dengan baut, amplas dan pernis.',
 'Pastikan roda terpasang kuat dan rem berfungsi.'),
-- Kaca
('Lampu hias dari botol kaca kecap dan sirup','Kaca','kecap|sirup',3.000,'pcs',0.100,2500000,
 'Potong atau bor botol dengan alat khusus, amplas tepi, pasang kabel dan fitting lampu.',
 'Pakai kacamata, sarung tangan tahan potong, dan masker; pecahan kaca berbahaya.'),
('Vas dan lampu tidur dari gelas kaca bekas','Kaca','gelas kaca',6.000,'pcs',0.100,3000000,
 'Cuci gelas, rangkai atau cat bagian luar, isi lilin atau lampu LED.',
 'Pakai sarung tangan; hindari gelas retak.'),
('Terrarium dan vas dari botol kaca wine tebal','Kaca','wine',2.000,'pcs',0.100,3000000,
 'Potong bagian leher dengan alat pemotong botol, amplas tepi, isi media dan tanaman.',
 'Pakai kacamata dan sarung tangan; amplas tepi sampai halus.'),
-- Karet
('Pot, kursi, dan ayunan dari ban luar bekas','Karet','ban luar',1.000,'pcs',0.050,2000000,
 'Cuci ban, potong atau rakit, cat, isi media tanam atau pasang tali ayunan.',
 'Jangan untuk tanaman yang dimakan; pastikan ban bersih.'),
('Sandal dan alas dari karet sol sepatu','Karet','sol sepatu',0.500,'kg',0.200,4000000,
 'Potong pola, haluskan, rekatkan lapisan, pasang tali.',
 'Pakai lem di ruangan berventilasi.'),
('Matras bermain dan keset dari karet EVA sisa','Karet','eva',1.500,'kg',0.100,3000000,
 'Potong menjadi bentuk puzzle atau persegi, haluskan tepi, kemas.',
 'Untuk matras anak, pastikan tepi halus dan tanpa bahan lepas.'),
-- Tambahan untuk material yang belum punya resep
('Sabuk dan tali tas dari tali webbing sisa','Tekstil','webbing',1.200,'meter',0.050,1500000,
 'Potong webbing sesuai panjang, bakar atau segel ujung dengan hati-hati, jahit pengait dan ring.',
 'Segel ujung dengan api kecil di area berventilasi, jauhkan dari bahan mudah terbakar.'),
('Tas pendingin dan kemasan isolasi dari bubble wrap','Plastik','bubble wrap',0.200,'kg',0.100,2000000,
 'Lapisi bubble wrap di antara dua kain, jahit atau rekatkan tepi, pasang resleting.',
 'Gunakan hanya untuk kemasan dan wadah tertutup, bukan kontak langsung dengan makanan.'),
('Media tanam jamur dari serutan kayu','Kayu','serutan',1.000,'kg',0.050,8000000,
 'Campur serutan kayu dengan dedak dan kapur, kemas dalam plastik, sterilisasi, inokulasi bibit, inkubasi.',
 'Sterilisasi memakai uap panas: hati-hati dengan tekanan dan suhu.')
ON CONFLICT (nama_produk) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Cek hasil
-- ---------------------------------------------------------------------
-- SELECT kota, count(*) FROM material GROUP BY kota ORDER BY 2 DESC;
-- SELECT kategori, count(*) FROM material GROUP BY kategori ORDER BY 2 DESC;
-- SELECT count(*) FROM resep_produk;
-- SELECT count(*) FROM material WHERE embedding IS NULL;   -- harus 0 setelah embed ulang
