Feature: Pencarian dan Detail Material
  Sebagai Buyer, saya ingin mencari material dan melihat detailnya agar dapat
  memilih material yang sesuai kebutuhan.

  Scenario: Buyer membuka katalog material
    Given I am on "/marketplace"
    Then I should see "Material Catalog"
    And I should see "Kain Katun Hitam"
    And I should see "Palet Kayu Bekas"

  Scenario: Buyer mencari material berdasarkan kata kunci
    Given I am on "/marketplace"
    When I fill in "Kata Kunci" with "kayu"
    Then I should see "Palet Kayu Bekas"
    And I should not see "Kain Katun Hitam"

  Scenario: Buyer memfilter material berdasarkan kategori
    Given I am on "/marketplace"
    When I select "Tekstil" from "Kategori"
    Then I should see "Kain Katun Hitam"
    And I should not see "Palet Kayu Bekas"

  Scenario: Buyer membuka detail material yang tersedia
    Given I am on "/marketplace"
    When I follow "Lihat detail Kain Katun Hitam"
    Then I should be on "/katalog/1"
    And I should see "Material Details"
    And I should see "Sari Seller"
    And I should see "Kain Katun Hitam"

  Scenario: Buyer melihat material yang sudah tidak tersedia
    Given I am on "/katalog/4"
    Then I should see "Material is no longer available"
    And I should see "Material lain yang tersedia"

  Scenario: Buyer melihat material dengan informasi yang belum lengkap
    Given I am on "/katalog/5"
    Then I should see "Some information is unavailable"
    And I should see "Belum diisi: Description, Quantity, Condition, Price, Location"
