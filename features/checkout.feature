Feature: Checkout Pesanan
  Sebagai Buyer, saya ingin memesan material dengan jumlah dan alamat yang
  benar agar pesanan dapat diproses Seller.

  Scenario: Buyer membuka checkout dari detail material
    Given I am logged in as a "Buyer"
    And I am on "/checkout?id=1&nama=Kain%20Katun%20Hitam&harga=3000&stok=250&satuan=kg"
    Then I should see "Tentukan Jumlah Pesanan"
    And I should see "Stok tersedia: 250 kg"

  Scenario: Buyer gagal lanjut jika jumlah melebihi stok
    Given I am logged in as a "Buyer"
    And I am on "/checkout?id=1&nama=Kain%20Katun%20Hitam&harga=3000&stok=250&satuan=kg"
    When I set the order quantity to "999"
    And I press "Lanjut"
    Then I should see "Stok hanya tersedia 250 kg."

  Scenario: Buyer gagal lanjut jika nomor HP tidak valid
    Given I am logged in as a "Buyer"
    And I am on "/checkout?id=1&nama=Kain%20Katun%20Hitam&harga=3000&stok=250&satuan=kg"
    When I press "Lanjut"
    And I fill in "Nama Penerima" with "Budi Buyer"
    And I fill in "Nomor HP" with "12345"
    And I fill in "Alamat Lengkap" with "Jl. Raya Surabaya No. 10"
    And I fill in "Kota/Kabupaten" with "Surabaya"
    And I fill in "Provinsi" with "Jawa Timur"
    And I fill in "Kode Pos" with "60286"
    And I press "Lanjut"
    Then I should see "Nomor HP harus diawali 08"

  Scenario: Buyer berhasil membuat pesanan
    Given I am logged in as a "Buyer"
    And I am on "/checkout?id=1&nama=Kain%20Katun%20Hitam&harga=3000&stok=250&satuan=kg"
    When I set the order quantity to "2"
    And I press "Lanjut"
    And I fill in "Nama Penerima" with "Budi Buyer"
    And I fill in "Nomor HP" with "081234567890"
    And I fill in "Alamat Lengkap" with "Jl. Raya Surabaya No. 10"
    And I fill in "Kota/Kabupaten" with "Surabaya"
    And I fill in "Provinsi" with "Jawa Timur"
    And I fill in "Kode Pos" with "60286"
    And I press "Lanjut"
    Then I should see "Pembayaran"
    And I should see "Virtual Account (BRI)"
    When I press "Buat Pesanan"
    Then I should be on "/orders"
    And I should see "Daftar Pesanan"
    And I should see "Kain Katun Hitam"
    And I should see "Pesanan #99"
    And the last order request should contain:
      | field       | value                                                                                                              |
      | id_material | 1                                                                                                                |
      | kuantitas   | 2                                                                                                                |
      | metode_kirim| Dikirim                                                                                                          |
      | alamat      | Penerima: Budi Buyer, No. HP: 081234567890, Jl. Raya Surabaya No. 10, Surabaya, Jawa Timur, 60286              |

  Scenario: Buyer gagal lanjut jika jumlah pesanan nol
    Given I am logged in as a "Buyer"
    And I am on "/checkout?id=1&nama=Kain%20Katun%20Hitam&harga=3000&stok=250&satuan=kg"
    When I set the order quantity to "0"
    And I press "Lanjut"
    Then I should see "Jumlah pesanan harus berupa bilangan bulat lebih dari 0."

  Scenario: Buyer gagal lanjut jika data alamat wajib kosong
    Given I am logged in as a "Buyer"
    And I am on "/checkout?id=1&nama=Kain%20Katun%20Hitam&harga=3000&stok=250&satuan=kg"
    When I press "Lanjut"
    And I press "Lanjut"
    Then I should see "Nama penerima minimal 3 karakter."
    And I should see "Nomor HP harus diawali 08 dan terdiri dari 10–13 digit."
    And I should see "Alamat lengkap minimal 10 karakter."
    And I should see "Kota/Kabupaten minimal 3 karakter."
    And I should see "Provinsi minimal 3 karakter."
    And I should see "Kode pos harus terdiri dari 5 angka."

  Scenario: Buyer memilih pembayaran QRIS dan membuat pesanan
    Given I am logged in as a "Buyer"
    And I am on "/checkout?id=1&nama=Kain%20Katun%20Hitam&harga=3000&stok=250&satuan=kg"
    When I set the order quantity to "2"
    And I press "Lanjut"
    And I fill in "Nama Penerima" with "Budi Buyer"
    And I fill in "Nomor HP" with "081234567890"
    And I fill in "Alamat Lengkap" with "Jl. Raya Surabaya No. 10"
    And I fill in "Kota/Kabupaten" with "Surabaya"
    And I fill in "Provinsi" with "Jawa Timur"
    And I fill in "Kode Pos" with "60286"
    And I press "Lanjut"
    And I press "QRIS"
    Then the checkout confirmation should show payment method "QRIS"
    And I should see "Pindai menggunakan aplikasi e-Wallet"
    When I press "Buat Pesanan"
    Then I should be on "/orders"
    And I should see "Pesanan #99"
    And the last order request should contain:
      | field        | value                                                                                                 |
      | id_material  | 1                                                                                                     |
      | kuantitas    | 2                                                                                                     |
      | metode_kirim | Dikirim                                                                                               |

  Scenario: Buyer memilih ambil di tempat tanpa mengisi alamat
    Given I am logged in as a "Buyer"
    And I am on "/checkout?id=1&nama=Kain%20Katun%20Hitam&harga=3000&stok=250&satuan=kg"
    When I set the order quantity to "2"
    And I select "Ambil di tempat" from "Metode Pengiriman"
    And I press "Lanjut"
    Then I should see "Alamat pengiriman tidak diperlukan."
    When I press "Lanjut"
    Then the checkout confirmation should show delivery method "Ambil di tempat"
    And the checkout confirmation should show payment method "Virtual Account (BRI)"
    When I press "Buat Pesanan"
    Then I should be on "/orders"
    And I should see "Pesanan #99"
    And the last order request should contain:
      | field        | value            |
      | id_material  | 1                |
      | kuantitas    | 2                |
      | metode_kirim | Ambil di tempat  |
