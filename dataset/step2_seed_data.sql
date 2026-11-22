-- =====================================================================
-- STEP 2a - Data dummy Circlo (Jawa Timur)
-- Jalankan SETELAH schema_supabase.sql dan step1_ai_schema.sql
-- Aman dijalankan ulang (memakai ON CONFLICT DO NOTHING).
--
-- PENTING: semua harga, stok, dan angka resep adalah DUMMY/ESTIMASI KASAR
-- untuk keperluan pengembangan dan demo. Ganti dengan data asli
-- sebelum dipakai di luar kebutuhan perkuliahan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Penyesuaian kecil untuk resep & anti-duplikat
-- ---------------------------------------------------------------------
-- kata_kunci_material = regex (case-insensitive) untuk mencocokkan resep
-- ke nama_material, mis. 'spanduk' atau 'jerigen|ember'.
ALTER TABLE resep_produk
    ADD COLUMN IF NOT EXISTS kata_kunci_material text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_material_seller_nama
    ON material (id_seller, nama_material);
CREATE UNIQUE INDEX IF NOT EXISTS uq_resep_nama
    ON resep_produk (nama_produk);

-- ---------------------------------------------------------------------
-- 1. Penjual dummy (5 kota, masing-masing punya "kekuatan" material)
-- ---------------------------------------------------------------------
INSERT INTO penjual (nama_seller, email_seller, password_seller, status_seller, alamat_seller)
VALUES
 ('Daur Rungkut Surabaya',  'surabaya@seed.circlo.test',  'DUMMY-GANTI-DENGAN-HASH', true, 'Gudang Rungkut, Surabaya, Jawa Timur'),
 ('Perca Hub Tanggulangin', 'sidoarjo@seed.circlo.test',  'DUMMY-GANTI-DENGAN-HASH', true, 'Tanggulangin, Sidoarjo, Jawa Timur'),
 ('Gresik Scrap Mandiri',   'gresik@seed.circlo.test',    'DUMMY-GANTI-DENGAN-HASH', true, 'Kebomas, Gresik, Jawa Timur'),
 ('Malang Eco Supply',      'malang@seed.circlo.test',    'DUMMY-GANTI-DENGAN-HASH', true, 'Singosari, Malang, Jawa Timur'),
 ('Mojo Kertas Lestari',    'mojokerto@seed.circlo.test', 'DUMMY-GANTI-DENGAN-HASH', true, 'Sooko, Mojokerto, Jawa Timur')
ON CONFLICT (email_seller) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Material dummy (50 item)
--    kolom: email penjual, nama, kategori, stok, harga/satuan, lokasi,
--           deskripsi, kota, provinsi, satuan
-- ---------------------------------------------------------------------
INSERT INTO material
    (id_seller, nama_material, kategori, stok, status_material, harga,
     lokasi, deskripsi_material, kota, provinsi, satuan)
SELECT p.id_seller, v.nama, v.kategori, v.stok, true, v.harga,
       v.lokasi, v.deskripsi, v.kota, v.provinsi, v.satuan
FROM (VALUES
-- ===== SURABAYA: spanduk & plastik =====
('surabaya@seed.circlo.test','Spanduk vinil bekas kondisi baik','Spanduk',500,6000,'Gudang Rungkut, Surabaya','Spanduk vinil bekas event dan baliho, tebal, tanpa sobekan besar. Cocok untuk tas, pouch, dan alas anti air. Belum dicuci.','Surabaya','Jawa Timur','m2'),
('surabaya@seed.circlo.test','Spanduk vinil bekas ada sobekan kecil','Spanduk',300,4000,'Gudang Rungkut, Surabaya','Spanduk bekas dengan sobekan kecil di tepi, masih banyak area utuh untuk dipotong. Harga lebih murah untuk produksi massal.','Surabaya','Jawa Timur','m2'),
('surabaya@seed.circlo.test','Spanduk banner roll-up bekas (albatros)','Spanduk',150,5000,'Gudang Rungkut, Surabaya','Bahan banner roll-up bekas, permukaan halus dan lentur. Cocok untuk dompet, map, dan sampul.','Surabaya','Jawa Timur','m2'),
('surabaya@seed.circlo.test','Botol PET bening bekas bersih','Plastik',800,4500,'Gudang Rungkut, Surabaya','Botol air mineral PET bening, label sudah dilepas dan dicuci. Cocok untuk kerajinan, sapu botol, atau didaur ulang menjadi serat.','Surabaya','Jawa Timur','kg'),
('surabaya@seed.circlo.test','Tutup botol HDPE campur warna','Plastik',400,5500,'Gudang Rungkut, Surabaya','Tutup botol HDPE campur warna, sudah dicuci. Cocok untuk dilebur menjadi paving, papan, atau produk cetak.','Surabaya','Jawa Timur','kg'),
('surabaya@seed.circlo.test','Galon air bekas','Plastik',150,15000,'Gudang Rungkut, Surabaya','Galon air isi ulang bekas, tidak bocor, ada goresan ringan. Cocok untuk planter, tempat penyimpanan non-pangan, dan furnitur kreatif.','Surabaya','Jawa Timur','pcs'),
('surabaya@seed.circlo.test','Kemasan sachet multilayer bersih','Plastik',120,3000,'Gudang Rungkut, Surabaya','Sachet kopi, deterjen, dan sampo yang sudah dicuci dan dikeringkan. Cocok untuk anyaman tas, dompet, dan dekorasi.','Surabaya','Jawa Timur','kg'),
('surabaya@seed.circlo.test','Jerigen HDPE bekas','Plastik',80,12000,'Gudang Rungkut, Surabaya','Jerigen 5 dan 10 liter bekas, sudah dicuci, tidak untuk wadah makanan. Cocok untuk pot, tempat sampah, dan penampung.','Surabaya','Jawa Timur','pcs'),
('surabaya@seed.circlo.test','Ember plastik bekas cat sudah dicuci','Plastik',200,8000,'Gudang Rungkut, Surabaya','Ember plastik bekas cat tembok, sudah dibersihkan. Cocok untuk pot tanaman dan organizer, bukan untuk wadah makanan.','Surabaya','Jawa Timur','pcs'),
('surabaya@seed.circlo.test','Karung plastik PP bekas','Plastik',250,5000,'Gudang Rungkut, Surabaya','Karung plastik anyaman PP bekas beras atau pupuk, sudah dicuci dan dijemur. Cocok untuk tas belanja dan karung anyam.','Surabaya','Jawa Timur','kg'),

-- ===== SIDOARJO: kulit & tekstil =====
('sidoarjo@seed.circlo.test','Perca kulit sapi samak campur','Kulit',120,35000,'Tanggulangin, Sidoarjo','Sisa potongan kulit sapi samak dari industri tas, beragam warna dan ukuran. Cocok untuk dompet, gantungan kunci, dan aksesori.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo@seed.circlo.test','Perca kulit sintetis PU','Kulit',200,18000,'Tanggulangin, Sidoarjo','Sisa potongan kulit sintetis PU dari produksi tas dan sepatu. Lebih murah, cocok untuk produk fashion skala besar.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo@seed.circlo.test','Potongan kulit samak ukuran sedang grade B','Kulit',80,45000,'Tanggulangin, Sidoarjo','Potongan kulit samak ukuran sedang dengan sedikit cacat permukaan. Cocok untuk ikat pinggang, tali tas, dan sampul.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo@seed.circlo.test','Perca kain katun konveksi campur','Tekstil',500,8000,'Tanggulangin, Sidoarjo','Perca kain katun dari konveksi, beragam motif dan warna. Cocok untuk patchwork, tas, dan pouch.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo@seed.circlo.test','Perca kain denim bekas pabrik','Tekstil',300,10000,'Tanggulangin, Sidoarjo','Sisa potongan denim dari pabrik jeans, tebal dan kuat. Cocok untuk tas, celemek, dan sarung bantal.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo@seed.circlo.test','Perca kain satin polyester','Tekstil',200,9000,'Tanggulangin, Sidoarjo','Sisa satin dan polyester dari produksi busana. Cocok untuk scrunchie, bandana, dan hiasan.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo@seed.circlo.test','Perca kain fleece','Tekstil',120,9500,'Tanggulangin, Sidoarjo','Sisa potongan kain fleece yang lembut. Cocok untuk boneka, bantal, dan isi bantal hewan peliharaan.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo@seed.circlo.test','Benang sisa produksi (cones)','Tekstil',60,15000,'Tanggulangin, Sidoarjo','Benang sisa produksi konveksi dalam gulungan cones, beragam warna. Cocok untuk rajut, makrame, dan bordir.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo@seed.circlo.test','Kain jersey sisa potongan kaos','Tekstil',400,7000,'Tanggulangin, Sidoarjo','Sisa potongan kain jersey dari produksi kaos, elastis. Cocok untuk keset rajut, kain lap, dan tali kain.','Sidoarjo','Jawa Timur','kg'),
('sidoarjo@seed.circlo.test','Karung goni bekas','Tekstil',150,7000,'Tanggulangin, Sidoarjo','Karung goni bekas hasil bumi, kuat dan berserat. Cocok untuk tas, dekorasi, dan alas tanaman.','Sidoarjo','Jawa Timur','pcs'),

-- ===== GRESIK: logam, kayu, kaca, karet =====
('gresik@seed.circlo.test','Pallet kayu bekas ukuran standar','Kayu',150,45000,'Kebomas, Gresik','Pallet kayu bekas ukuran standar sekitar 100x120 cm, kokoh. Cocok untuk meja, rak, dan furnitur kreatif.','Gresik','Jawa Timur','pcs'),
('gresik@seed.circlo.test','Pallet kayu bekas ukuran kecil rusak ringan','Kayu',120,25000,'Kebomas, Gresik','Pallet kayu bekas ukuran kecil dengan kerusakan ringan di beberapa papan. Cocok untuk dibongkar menjadi papan.','Gresik','Jawa Timur','pcs'),
('gresik@seed.circlo.test','Potongan kayu sisa mebel','Kayu',600,2500,'Kebomas, Gresik','Potongan kayu sisa produksi mebel, beragam ukuran. Cocok untuk talenan, mainan edukatif, dan hiasan.','Gresik','Jawa Timur','kg'),
('gresik@seed.circlo.test','Drum bekas 200 liter non-B3 sudah dibersihkan','Logam',60,150000,'Kebomas, Gresik','Drum 200 liter bekas, sudah dibersihkan dan tidak pernah berisi bahan berbahaya (non-B3). Cocok untuk tempat sampah, meja, dan furnitur industrial.','Gresik','Jawa Timur','pcs'),
('gresik@seed.circlo.test','Besi siku dan plat sisa potongan workshop','Logam',500,7000,'Kebomas, Gresik','Sisa potongan besi siku dan plat dari bengkel las. Cocok untuk rak, kaki meja, dan rangka.','Gresik','Jawa Timur','kg'),
('gresik@seed.circlo.test','Kaleng aluminium bekas minuman','Logam',100,12000,'Kebomas, Gresik','Kaleng aluminium bekas minuman, sudah dibilas. Cocok untuk kerajinan dan dilebur.','Gresik','Jawa Timur','kg'),
('gresik@seed.circlo.test','Botol kaca bening campuran','Kaca',700,1500,'Kebomas, Gresik','Botol kaca bening campuran ukuran, label sudah dilepas. Cocok untuk gelas potong, lampu hias, dan vas.','Gresik','Jawa Timur','kg'),
('gresik@seed.circlo.test','Botol kaca berwarna hijau dan coklat','Kaca',500,1500,'Kebomas, Gresik','Botol kaca berwarna hijau dan coklat, bersih. Cocok untuk lampu hias dan dekorasi.','Gresik','Jawa Timur','kg'),
('gresik@seed.circlo.test','Toples kaca bekas','Kaca',300,2500,'Kebomas, Gresik','Toples kaca bekas dengan atau tanpa tutup, sudah dicuci. Cocok untuk lilin, terrarium, dan wadah kering.','Gresik','Jawa Timur','pcs'),
('gresik@seed.circlo.test','Ban dalam bekas motor dan truk','Karet',200,6000,'Kebomas, Gresik','Ban dalam bekas yang sudah dicuci, ada tambalan kecil. Cocok untuk dompet, tas, gelang, dan alas.','Gresik','Jawa Timur','kg'),

-- ===== MALANG: organik & kayu =====
('malang@seed.circlo.test','Ampas kopi basah dari kafe','Organik',300,1500,'Singosari, Malang','Ampas kopi basah dari kafe, perlu segera dikeringkan. Cocok untuk media tanam jamur dan kompos.','Malang','Jawa Timur','kg'),
('malang@seed.circlo.test','Ampas kopi kering siap pakai','Organik',150,3500,'Singosari, Malang','Ampas kopi yang sudah dikeringkan dan diayak. Cocok untuk scrub, lilin aromaterapi, dan pupuk.','Malang','Jawa Timur','kg'),
('malang@seed.circlo.test','Serbuk gergaji kayu','Kayu',800,1500,'Singosari, Malang','Serbuk gergaji kayu bersih dari penggergajian. Cocok untuk media jamur tiram (baglog), briket, dan alas kandang.','Malang','Jawa Timur','kg'),
('malang@seed.circlo.test','Sekam padi','Organik',1000,800,'Singosari, Malang','Sekam padi kering. Cocok untuk arang sekam, media tanam, dan campuran bata.','Malang','Jawa Timur','kg'),
('malang@seed.circlo.test','Ampas apel hasil pengolahan jus','Organik',200,1000,'Singosari, Malang','Ampas apel basah dari industri jus dan keripik. Cocok untuk kompos dan pakan ternak setelah diolah.','Malang','Jawa Timur','kg'),
('malang@seed.circlo.test','Tempurung kelapa bersih','Organik',400,2500,'Singosari, Malang','Tempurung kelapa bersih dan kering. Cocok untuk briket arang, kerajinan, dan wadah.','Malang','Jawa Timur','kg'),
('malang@seed.circlo.test','Jerami padi kering','Organik',500,800,'Singosari, Malang','Jerami padi kering. Cocok untuk mulsa, kompos, dan media jamur merang.','Malang','Jawa Timur','kg'),
('malang@seed.circlo.test','Sabut kelapa (cocofiber)','Organik',300,1800,'Singosari, Malang','Sabut kelapa kering. Cocok untuk cocopeat, media tanam, dan keset.','Malang','Jawa Timur','kg'),
('malang@seed.circlo.test','Pallet kayu bekas 100x100','Kayu',100,40000,'Singosari, Malang','Pallet kayu bekas 100x100 cm, kondisi baik. Cocok untuk meja dan rak.','Malang','Jawa Timur','pcs'),
('malang@seed.circlo.test','Potongan MDF dan triplek sisa','Kayu',300,2000,'Singosari, Malang','Potongan MDF dan triplek sisa produksi furnitur. Cocok untuk kerajinan, organizer, dan mainan.','Malang','Jawa Timur','kg'),

-- ===== MOJOKERTO: kertas & lainnya =====
('mojokerto@seed.circlo.test','Kardus bekas bersih','Kertas',1500,2000,'Sooko, Mojokerto','Kardus bekas bersih dan kering, sudah dilipat. Cocok untuk organizer, mainan, dan bahan pulp.','Mojokerto','Jawa Timur','kg'),
('mojokerto@seed.circlo.test','Kertas HVS kantor bekas','Kertas',600,2500,'Sooko, Mojokerto','Kertas HVS bekas cetak satu sisi, tanpa staples. Cocok untuk kertas daur ulang handmade dan notebook.','Mojokerto','Jawa Timur','kg'),
('mojokerto@seed.circlo.test','Kertas koran bekas','Kertas',400,2200,'Sooko, Mojokerto','Kertas koran bekas bersih. Cocok untuk pulp, papier-mache, dan kemasan.','Mojokerto','Jawa Timur','kg'),
('mojokerto@seed.circlo.test','Roll inti kertas (tube core)','Kertas',400,3000,'Sooko, Mojokerto','Inti gulungan kertas berbentuk tabung, kuat. Cocok untuk organizer, pot semai, dan dekorasi.','Mojokerto','Jawa Timur','pcs'),
('mojokerto@seed.circlo.test','Karton duplex sisa potongan pabrik packaging','Kertas',700,2600,'Sooko, Mojokerto','Sisa potongan karton duplex dari pabrik kemasan. Cocok untuk organizer, kotak, dan kerajinan.','Mojokerto','Jawa Timur','kg'),
('mojokerto@seed.circlo.test','Kemasan karton minuman (Tetra Pak) bersih','Kertas',200,3500,'Sooko, Mojokerto','Kemasan karton minuman multilayer yang sudah dicuci dan dikeringkan. Cocok untuk dompet, tatakan, dan papan press panas.','Mojokerto','Jawa Timur','kg'),
('mojokerto@seed.circlo.test','Botol HDPE sampo dan sabun bekas','Plastik',250,4000,'Sooko, Mojokerto','Botol HDPE bekas sampo dan sabun cair, sudah dibilas. Cocok untuk dicacah dan dilebur, atau kerajinan.','Mojokerto','Jawa Timur','kg'),
('mojokerto@seed.circlo.test','Sisa kain batik','Tekstil',100,12000,'Sooko, Mojokerto','Sisa potongan kain batik cap dan printing dari produksi rumahan. Cocok untuk patchwork dan aksesori.','Mojokerto','Jawa Timur','kg'),
('mojokerto@seed.circlo.test','Kaleng makanan bekas sudah dibersihkan','Logam',250,3000,'Sooko, Mojokerto','Kaleng makanan bekas, sudah dicuci dan tepi tajam diratakan. Cocok untuk pot, tempat pensil, dan lampu hias.','Mojokerto','Jawa Timur','kg'),
('mojokerto@seed.circlo.test','Karet EVA sisa sandal','Karet',120,4000,'Sooko, Mojokerto','Sisa potongan karet EVA dari produksi sandal, lentur. Cocok untuk matras, alas, dan mainan.','Mojokerto','Jawa Timur','kg')
) AS v(email, nama, kategori, stok, harga, lokasi, deskripsi, kota, provinsi, satuan)
JOIN penjual p ON p.email_seller = v.email
ON CONFLICT (id_seller, nama_material) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Resep produk (30 resep, ESTIMASI KASAR)
--    bahan_per_unit memakai satuan yang sama dengan material terkait.
--    estimasi_modal = modal awal kasar (alat + bahan awal), dalam Rupiah.
-- ---------------------------------------------------------------------
INSERT INTO resep_produk
    (nama_produk, kategori_material, kata_kunci_material, bahan_per_unit,
     satuan, persen_susut, estimasi_modal, langkah_singkat, catatan_k3)
VALUES
-- Spanduk (m2)
('Tote bag dari spanduk bekas','Spanduk','spanduk',0.600,'m2',0.200,3500000,
 'Cuci dan jemur spanduk, potong sesuai pola, jahit tepi dan sisi, pasang tali dan lapisan dalam.',
 'Pakai masker saat mencuci spanduk. Hindari untuk produk yang menyentuh makanan.'),
('Pouch dan dompet multifungsi dari spanduk','Spanduk','spanduk',0.150,'m2',0.150,3000000,
 'Pilih bagian spanduk dengan cetakan menarik, potong pola kecil, jahit dan pasang resleting.',
 'Hindari bagian cetakan yang mengelupas.'),
('Alas piknik anti air dari spanduk','Spanduk','spanduk',2.000,'m2',0.100,2500000,
 'Cuci, potong ukuran 1,5x1,2 m, jahit tepi atau rekatkan dengan heat sealer, tambahkan tali pengikat.',
 'Tidak untuk dipakai langsung di atas makanan tanpa alas lain.'),
-- Plastik
('Paving dan conblock dari lelehan tutup botol','Plastik','tutup botol',1.200,'kg',0.050,10000000,
 'Cacah tutup botol, lebur bersama pasir sekitar suhu 150-200 C, cetak dengan press, dinginkan.',
 'Asap lelehan plastik berbahaya: pakai respirator, area terbuka berventilasi, sarung tangan tahan panas.'),
('Planter vertikal dari galon bekas','Plastik','galon',1.000,'pcs',0.050,1500000,
 'Potong galon, lubangi untuk drainase, cat atau hias, pasang rangka gantung.',
 'Gunakan galon yang tidak pernah berisi bahan kimia.'),
('Tas dan dompet anyaman dari kemasan sachet','Plastik','sachet',0.250,'kg',0.250,1500000,
 'Gunting sachet menjadi strip, lipat dan anyam, jahit atau rekatkan, beri lapisan dalam kain.',
 'Pastikan sachet bersih dan kering sebelum diolah.'),
('Sapu dari botol PET bekas','Plastik','botol pet',0.400,'kg',0.100,2000000,
 'Potong botol menjadi strip serat, ikat pada gagang kayu atau bambu.',
 'Gunakan sarung tangan saat memotong. Tepi potongan bisa tajam.'),
('Pot dan tempat sampah dari jerigen atau ember bekas','Plastik','jerigen|ember',1.000,'pcs',0.050,1500000,
 'Potong sesuai desain, lubangi drainase, amplas tepi, cat atau tempel motif.',
 'Jangan untuk wadah makanan karena bekas bahan kimia atau cat.'),
('Tas belanja dari karung plastik PP','Plastik','karung plastik|karung pp',0.300,'kg',0.150,2500000,
 'Cuci dan jemur, potong pola, jahit rangkap, pasang tali dan lapisan dalam.',
 'Pastikan karung tidak bekas bahan kimia atau pestisida.'),
-- Tekstil
('Patchwork pouch dan tas dari perca kain','Tekstil','katun|satin|batik',0.300,'kg',0.150,3500000,
 'Pilah perca per warna, potong persegi, jahit patchwork, lapisi dan jahit menjadi tas atau pouch.',
 'Cuci perca terlebih dahulu agar tidak luntur.'),
('Keset rajut dari kain jersey','Tekstil','jersey',0.500,'kg',0.100,2500000,
 'Gunting jersey menjadi tali panjang, rajut atau anyam menjadi keset, finishing tepi.',
 'Gunakan bahan antislip di bagian bawah.'),
('Boneka dan bantal dari perca fleece','Tekstil','fleece',0.350,'kg',0.120,3000000,
 'Potong pola, jahit, isi dengan dakron atau perca halus, tutup jahitan.',
 'Untuk produk anak, pastikan jahitan kuat dan tanpa komponen kecil yang mudah lepas.'),
('Tas dan celemek dari denim bekas','Tekstil','denim',0.600,'kg',0.200,4000000,
 'Cuci, potong pola, jahit dengan jarum denim, tambahkan saku dan tali.',
 'Gunakan jarum denim dan hati-hati dengan debu serat saat memotong.'),
('Tas dan dekorasi dari karung goni','Tekstil','goni',1.000,'pcs',0.100,2500000,
 'Cuci dan jemur, potong pola, jahit dan tambahkan lapisan dalam atau tali.',
 'Debu goni bisa mengiritasi, pakai masker saat memotong.'),
-- Kulit
('Dompet kartu dan gantungan kunci dari perca kulit','Kulit','kulit',0.080,'kg',0.150,4000000,
 'Pilih perca bebas cacat, potong dengan pisau pola, jahit tangan atau mesin, finishing tepi dan pewarna.',
 'Gunakan ventilasi baik saat memakai lem dan cat kulit.'),
-- Kayu
('Meja dan rak dari pallet bekas','Kayu','pallet',3.000,'pcs',0.100,5000000,
 'Bongkar dan amplas pallet, rakit kerangka, cat atau pernis, pasang kaki atau roda.',
 'Pastikan pallet tidak bekas bahan kimia dan bebas paku menonjol.'),
('Talenan dan aksesori dapur dari potongan kayu','Kayu','potongan kayu|mdf|triplek',1.200,'kg',0.300,6000000,
 'Pilih kayu keras, potong dan rekatkan, amplas halus, lapisi minyak food grade.',
 'Gunakan hanya kayu tanpa bahan kimia. Jangan pakai MDF atau triplek untuk produk kontak makanan.'),
('Baglog jamur tiram dari serbuk gergaji','Kayu','serbuk gergaji',1.000,'kg',0.050,8000000,
 'Campur serbuk gergaji, dedak, dan kapur, kemas dalam plastik, sterilisasi, inokulasi bibit, inkubasi.',
 'Sterilisasi memakai uap panas: hati-hati dengan tekanan dan suhu.'),
-- Organik
('Briket arang dari tempurung kelapa','Organik','tempurung',3.000,'kg',0.100,8000000,
 'Karbonisasi tempurung dalam drum, haluskan, campur perekat tapioka, cetak dan keringkan. 1 unit = 1 kg briket.',
 'Lakukan di area terbuka. Waspadai asap dan bara api.'),
('Cocopeat dan media tanam dari sabut kelapa','Organik','sabut kelapa',1.000,'kg',0.200,10000000,
 'Cacah sabut, ayak, cuci untuk mengurangi tanin, keringkan, kemas atau press menjadi blok.',
 'Mesin pencacah berbahaya: gunakan pelindung dan jangan masukkan tangan.'),
('Scrub dan lilin aromaterapi dari ampas kopi','Organik','ampas kopi',0.100,'kg',0.100,2000000,
 'Keringkan dan ayak ampas kopi, campur dengan bahan dasar (minyak atau lilin soya), cetak dan kemas.',
 'Uji alergi kulit dan gunakan bahan kosmetik aman. Perlu izin edar untuk produk kosmetik.'),
('Arang sekam dan media tanam dari sekam padi','Organik','sekam',2.000,'kg',0.150,5000000,
 'Bakar sekam secara terkendali tanpa abu, padamkan, kemas sebagai arang sekam.',
 'Lakukan di area terbuka dan jauh dari bahan mudah terbakar.'),
-- Kertas
('Notebook dari kertas daur ulang handmade','Kertas','hvs|koran',0.150,'kg',0.200,4000000,
 'Rendam dan blender kertas menjadi pulp, cetak lembaran, keringkan, jilid menjadi notebook.',
 'Gunakan blender khusus, bukan peralatan dapur makanan.'),
('Organizer dan kotak dari karton sisa','Kertas','kardus|karton',0.800,'kg',0.150,2000000,
 'Potong karton sesuai pola, rekatkan, lapisi kertas atau kain hias.',
 'Gunakan cutter dengan hati-hati.'),
('Dompet dan tatakan dari kemasan Tetra Pak','Kertas','tetra',0.120,'kg',0.200,2500000,
 'Cuci dan keringkan, potong, tekan dengan heat press untuk lapisan kuat, jahit atau rekatkan.',
 'Suhu heat press tinggi: gunakan sarung tangan dan jangan melebihi suhu aman.'),
-- Kaca
('Lampu hias dan gelas dari botol kaca','Kaca','botol kaca',0.450,'kg',0.150,5000000,
 'Potong botol dengan alat pemotong, amplas tepi, pasang kabel lampu atau finishing sebagai gelas.',
 'Pakai kacamata, sarung tangan tahan potong, dan masker. Pecahan kaca berbahaya.'),
('Lilin dan terrarium dari toples kaca','Kaca','toples',1.000,'pcs',0.050,3000000,
 'Cuci toples, isi dengan lilin soya atau media terrarium, tambahkan dekorasi, kemas.',
 'Jangan menuang lilin panas ke kaca tebal yang dingin tanpa pemanasan awal.'),
-- Logam
('Rak dan meja industrial dari besi siku sisa','Logam','besi',4.000,'kg',0.100,15000000,
 'Potong dan las kerangka, gerinda, cat anti karat, pasang papan kayu atau kaca.',
 'Las dan gerinda membutuhkan APD lengkap: helm las, sarung tangan, sepatu, dan ventilasi.'),
('Tempat sampah dan meja dari drum bekas','Logam','drum',1.000,'pcs',0.050,8000000,
 'Potong drum sesuai desain, haluskan tepi, cat dan beri kaki.',
 'Pastikan drum non-B3 dan sudah dibersihkan. Tepi potongan sangat tajam.'),
-- Karet
('Dompet, tas, dan gelang dari ban dalam bekas','Karet','ban dalam',0.400,'kg',0.150,3000000,
 'Cuci dan keringkan, potong pola, jahit dengan benang kuat atau rekatkan, finishing tepi.',
 'Cuci bersih untuk menghilangkan bau dan kotoran. Gunakan masker saat memotong.')
ON CONFLICT (nama_produk) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Cek hasil
-- ---------------------------------------------------------------------
-- SELECT kota, count(*) AS jumlah_material FROM material GROUP BY kota ORDER BY 2 DESC;
-- SELECT * FROM v_stat_material_daerah ORDER BY kota, total_stok DESC;
-- SELECT count(*) FROM resep_produk;