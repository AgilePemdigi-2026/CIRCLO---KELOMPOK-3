Feature: Dashboard dan Pesanan Seller
  Sebagai Seller, saya ingin memantau performa serta mengelola pesanan agar
  material tersalurkan dengan baik.

  Scenario: Seller melihat dashboard penjual
    Given I am logged in as a "Seller"
    And I am on "/seller"
    Then I should see "Dashboard Penjual"
    And I should see "Pesanan Tertunda"
    And I should see "Pesanan Aktif"
    And I should see "Kain Katun Hitam"

  Scenario: Seller melihat ringkasan KPI
    Given I am logged in as a "Seller"
    And I am on "/seller/kpi"
    Then I should see "KPI Ringkasan Penjualan"
    And I should see "Total Penjualan"
    And I should see "Pesanan Masuk"

  Scenario: Seller membuka pengelolaan katalog
    Given I am logged in as a "Seller"
    And I am on "/seller/catalog"
    Then I should see "Kelola Katalog"
    And I should see "Tambah Material"
    And I should see "Belum ada material"

  Scenario: Seller memfilter riwayat pesanan
    Given I am logged in as a "Seller"
    And I am on "/seller/orders"
    Then I should see "Riwayat Pesanan"
    And I should see "Kain Katun Hitam"
    And I should see "Palet Kayu Bekas"
    When I press "Menunggu Konfirmasi"
    Then I should see "Kain Katun Hitam"
    And I should not see "Palet Kayu Bekas"

  Scenario: Seller mengonfirmasi pesanan yang menunggu
    Given I am logged in as a "Seller"
    And I am on "/seller"
    When I press "Konfirmasi Pesanan"
    Then I should see "Konfirmasi pesanan?"
    When I press "Ya, Konfirmasi"
    Then I should see "berhasil diperbarui"
    And I should see "Dikonfirmasi"
