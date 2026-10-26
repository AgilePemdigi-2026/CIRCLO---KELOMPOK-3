-- Insert resep produk untuk kategori Tekstil/Kain
-- Jalankan di Supabase SQL Editor

INSERT INTO resep_produk (nama_produk, kategori_material, kata_kunci_material, bahan_per_unit, satuan, persen_susut, estimasi_modal, langkah_singkat, catatan_k3) VALUES
('Tote bag dari perca kain', 'Tekstil', 'perca kain|kain katun|denim|jersey|sisa potongan', 0.3, 'kg', 0.15, 2500000,
 'Cuci perca, potong pola tote bag, jahit sisi dan tali pegangan. Bisa tambah kantong dalam.',
 'Pakai masker saat memotong dan menjahit serat halus.'),

('Pouch dan dompet dari sisa kain', 'Tekstil', 'perca kain|kain katun|denim|sisa potongan|patchwork', 0.08, 'kg', 0.1, 1500000,
 'Potong kain kecil, jahit jadi pouch/dompet, pasang resleting atau snap button.',
 'Hati-hati gunting dan jarum jahit.'),

('Alas duduk/kursi dari denim bekas', 'Tekstil', 'denim|kain jeans|perca denim|kain tebal', 0.5, 'kg', 0.1, 3000000,
 'Potong denim sesuai ukuran bantal, jahit 3 sisi, isi busa/katun, jahit tutup.',
 'Denim tebal, pakai jarum jahit kuat.'),

('Boneka mainan dari sisa kain', 'Tekstil', 'perca kain|kain katun|sisa potongan|flanel|jersey', 0.1, 'kg', 0.2, 2000000,
 'Gambar pola boneka, potong 2 layer, jahit terbalik, balik, isi, jahit tutup.',
 'Pastikan tidak ada bagian kecil yang mudah lepas untuk anak.'),

('Sapu tangan/towel dari jersey sisa kaos', 'Tekstil', 'jersey|kain kaos|sisa potongan kaos|kain menyerap', 0.15, 'kg', 0.1, 1000000,
 'Potong persegi, jahit pinggiran agar tidak rontok benang, bisa bordir logo.',
 'Cocok untuk kain jersey yang menyerap air.');

-- Resep Plastik yang pakai Botol PET / HDPE
INSERT INTO resep_produk (nama_produk, kategori_material, kata_kunci_material, bahan_per_unit, satuan, persen_susut, estimasi_modal, langkah_singkat, catatan_k3) VALUES
('Sapu botol dari botol PET bekas', 'Plastik', 'botol PET|PET bening|botol plastik', 0.5, 'pcs', 0.05, 500000,
 'Potong botol jadi serpihan, masukan ke rangka sapu, ikat rapat.',
 'Gunakan gunting tajam, hati-hati tepi tajam.'),

('Planter/gantung tanaman dari botol PET', 'Plastik', 'botol PET|PET bening|botol plastik|planter', 0.5, 'pcs', 0.05, 300000,
 'Potong botol, buat lubang drainase, cat/dekorasi, pasang tali gantung.',
 'Pastikan lubang drainase cukup besar.'),

('Paving/plastik cetak dari tutup HDPE', 'Plastik', 'tutup botol|HDPE|tutup plastik|daur ulang plastik', 2.0, 'kg', 0.05, 8000000,
 'Lelehkan tutup HDPE di oven/lelehan, tuang ke cetakan paving, dinginkan.',
 'Wajib masker VOC, ventilasi baik, suhu leleh ~180°C.'),

('Tas belanja dari karung plastik PP', 'Plastik', 'karung plastik|karung PP|polypropylene|tas belanja', 0.4, 'kg', 0.1, 2000000,
 'Cuci karung, potong pola, jahit dengan benang nylon kuat, buat pegangan.',
 'Gunakan mesin jahit industri untuk karung tebal.');

-- Resep Kayu
INSERT INTO resep_produk (nama_produk, kategori_material, kata_kunci_material, bahan_per_unit, satuan, persen_susut, estimasi_modal, langkah_singkat, catatan_k3) VALUES
('Meja kecil dari pallet kayu', 'Kayu', 'pallet|kayu pallet|kayu bekas|meja', 2.0, 'pcs', 0.15, 4000000,
 'Bongkar pallet, cuci, gosok, potong ukuran, rakit meja, cat/varnish.',
 'Pakai masker kayu, kacamata, sarung tangan.'),

('Rak dinding dari sisa pallet', 'Kayu', 'pallet|kayu pallet|kayu bekas|rak', 1.5, 'pcs', 0.15, 2500000,
 'Bongkar pallet, potong ukuran rak, pasang bracket dinding.',
 'Pastikan bracket kuat menopang beban.'),

('Baglog jamur dari serbuk gergaji', 'Kayu', 'serbuk gergaji|sawdust|baglog|jamur', 1.5, 'kg', 0.05, 5000000,
 'Campur serbuk + bran + gula, sterilkan, inokulasi spora jamur, inkubasi.',
 'Sterilisasi wajib pakai autoklav/pressure cooker.');

-- Resep Kertas
INSERT INTO resep_produk (nama_produk, kategori_material, kata_kunci_material, bahan_per_unit, satuan, persen_susut, estimasi_modal, langkah_singkat, catatan_k3) VALUES
('Kertas daur ulang handmade', 'Kertas', 'kardus|karton|kertas bekas|daur ulang kertas', 1.2, 'kg', 0.2, 3000000,
 'Rendam kertas, blender jadi pulp, cetak di mold, tekan, keringkan.',
 'Hati-hati blender air panas.'),

('Notebook dari kardus bekas', 'Kertas', 'kardus|karton|kertas bekas|notebook|buku', 0.3, 'kg', 0.1, 2000000,
 'Potong kardus jadi cover, kertas dalam dari sisa cetak, jahit/rapikan pinggir.',
 'Gunakan jahitan benang kuat.');

-- Resep Kaca
INSERT INTO resep_produk (nama_produk, kategori_material, kata_kunci_material, bahan_per_unit, satuan, persen_susut, estimasi_modal, langkah_singkat, catatan_k3) VALUES
('Vas bunga dari botol kaca', 'Kaca', 'botol kaca|kaca bekas|botol minuman|vas', 1.0, 'pcs', 0.05, 1000000,
 'Bersihkan botol, buat label/dekorasi, bisa cat atau wrap kain.',
 'Hati-hati pecahan kaca, pakai sarung tangan.');

-- Resep Logam
INSERT INTO resep_produk (nama_produk, kategori_material, kata_kunci_material, bahan_per_unit, satuan, persen_susut, estimasi_modal, langkah_singkat, catatan_k3) VALUES
('Asbak/penyimpanan dari kaleng bekas', 'Logam', 'kaleng|besi bekas|kaleng minuman|asbak', 0.5, 'pcs', 0.05, 500000,
 'Bersihkan kaleng, cat/dekorasi, buat lubang jika perlu.',
 'Tepi kaleng tajam, gunting bersih atau lipat ke dalam.');

-- Resep Karet
INSERT INTO resep_produk (nama_produk, kategori_material, kata_kunci_material, bahan_per_unit, satuan, persen_susut, estimasi_modal, langkah_singkat, catatan_k3) VALUES
('Alas kaki/sepatu dari ban bekas', 'Karet', 'ban|ban bekas|karet ban|alas kaki', 2.0, 'pcs', 0.1, 3000000,
 'Potong ban, bentuk alas kaki, jahit/tempel pelapis nyaman.',
 'Potong ban butuh pisau sangat tajam/mesin khusus.');

-- Resep Kulit
INSERT INTO resep_produk (nama_produk, kategori_material, kata_kunci_material, bahan_per_unit, satuan, persen_susut, estimasi_modal, langkah_singkat, catatan_k3) VALUES
('Dompet kartu dari perca kulit', 'Kulit', 'perca kulit|kulit sapi|kulit sintetis|dompet', 0.05, 'kg', 0.15, 2000000,
 'Potong pola dompet, jahit slot kartu, jahit sisi, pasang snap button.',
 'Gunakan jarum jahit kulit dan benang nylon.');