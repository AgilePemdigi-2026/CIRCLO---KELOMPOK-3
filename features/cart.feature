# Sumber: README Sprint 3 - Cart (Buyer).
# Alur mengikuti app/cart/page.jsx, app/checkout/cart/page.jsx, dan app/api/cart/route.js.

@cart
Feature: Keranjang Buyer
  Sebagai Buyer, saya ingin menyimpan material ke keranjang, mengubah jumlah,
  dan melanjutkan checkout agar dapat membeli beberapa material sekaligus.

  Scenario: Buyer membuka keranjang yang masih kosong dari navigasi
    Given I am logged in as a "Buyer"
    When I follow "Buka Keranjang Saya"
    Then I should be on "/cart"
    And I should see "Keranjang Saya"
    And I should see "Keranjang Masih Kosong"
    And I should see "Kamu belum menambahkan material."

  Scenario: Buyer menambahkan material dari Material Catalog ke keranjang
    Given I am logged in as a "Buyer"
    And I am on "/marketplace"
    When I add "Kain Katun Hitam" to the cart from the catalog with quantity 2
    Then I should see "Kain Katun Hitam (2 kg) berhasil ditambahkan ke keranjang."
    When I open the cart
    Then I should see "Kain Katun Hitam"
    And the cart item "Kain Katun Hitam" should show quantity 2
    And the cart item "Kain Katun Hitam" should show subtotal "Rp 6.000"

  Scenario: Buyer menambahkan material dari halaman detail ke keranjang
    Given I am logged in as a "Buyer"
    And I am on "/katalog/2"
    When I add the material to the cart from the detail panel with quantity 3
    Then I should see "3 pcs Palet Kayu Bekas berhasil ditambahkan ke keranjang!"
    When I open the cart
    Then the cart item "Palet Kayu Bekas" should show quantity 3

  Scenario: Buyer mengubah jumlah material di keranjang
    Given I am logged in as a "Buyer"
    And the buyer cart contains "Kain Katun Hitam" with quantity 2
    And I am on "/cart"
    When I increase the quantity of "Kain Katun Hitam" in the cart
    Then the cart item "Kain Katun Hitam" should show quantity 3
    And the cart item "Kain Katun Hitam" should show subtotal "Rp 9.000"

  Scenario: Buyer menghapus material dari keranjang
    Given I am logged in as a "Buyer"
    And the buyer cart contains "Kain Katun Hitam" with quantity 2
    And I am on "/cart"
    When I remove "Kain Katun Hitam" from the cart
    Then I should see "Material berhasil dihapus dari keranjang."
    And I should not see "Kain Katun Hitam"
    And I should see "Keranjang Masih Kosong"

  Scenario: Buyer melihat material yang sudah tidak tersedia di keranjang
    Given I am logged in as a "Buyer"
    And the buyer cart contains "Kaca Jendela Bekas" with quantity 1
    And I am on "/cart"
    Then I should see "Material tidak tersedia atau jumlah melebihi stok."
    And the cart item "Kaca Jendela Bekas" should not offer checkout

  Scenario: Buyer memilih dua material dan membuka checkout gabungan
    Given I am logged in as a "Buyer"
    And the buyer cart contains "Kain Katun Hitam" with quantity 2
    And the buyer cart contains "Palet Kayu Bekas" with quantity 1
    And I am on "/cart"
    When I select all available materials in the cart
    Then I should see "Material Dipilih"
    And the cart should offer "Checkout (2)"
    When I follow "Checkout (2)"
    Then I should be on "/checkout/cart"
    And I should see "Checkout Keranjang"
    And I should see "Kain Katun Hitam"
    And I should see "Palet Kayu Bekas"
    And I should see "Jumlah Pesanan"

  Scenario: Buyer menyelesaikan checkout gabungan dari keranjang
    Given I am logged in as a "Buyer"
    And the buyer cart contains "Kain Katun Hitam" with quantity 2
    And the buyer cart contains "Palet Kayu Bekas" with quantity 1
    And I am on "/cart"
    When I select all available materials in the cart
    And I follow "Checkout (2)"
    Then I should be on "/checkout/cart"
    When I press "Lanjut"
    And I press "Ambil di tempat"
    And I press "Lanjut"
    Then I should see "Konfirmasi Pesanan"
    And I should see "Total Pesanan"
    When I press "Buat Pesanan" and accept the browser confirmation
    Then I should be on "/orders"
    And I should see "Pesanan #98"
    And the last cart checkout should contain 2 materials with delivery method "Ambil di tempat"
    And the buyer cart should be empty

  Scenario: Seller tidak dapat memakai keranjang Buyer
    Given I am logged in as a "Seller"
    And I am on "/cart"
    Then I should see "Keranjang hanya tersedia untuk Buyer."
