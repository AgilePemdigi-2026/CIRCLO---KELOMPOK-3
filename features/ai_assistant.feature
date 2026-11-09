Feature: Asisten Material AI
  Sebagai Buyer, saya ingin menjelaskan kebutuhan material dengan bahasa
  sehari-hari agar mendapat rekomendasi material yang relevan.

  Scenario: Buyer membuka halaman asisten material
    Given I am on "/cari-material"
    Then I should see "Mencari Kebutuhan & Material"
    And I should see "CIRCLO AI"

  Scenario: Buyer mengirim kebutuhan material dan menerima rekomendasi
    Given I am on "/cari-material"
    When I send the material request "Saya butuh kain katun untuk membuat tas"
    Then I should see "Saya merekomendasikan"
    And I should see "Kain Katun Hitam"
    And I should see "Pesan"
