Feature: Upload Material
  Sebagai Seller, saya ingin mengunggah material dan memakai AI untuk
  klasifikasi agar material dapat tampil di katalog.

  Scenario: Seller membuka halaman upload material
    Given I am logged in as a "Seller"
    And I am on "/upload-material"
    Then I should see "Upload Material"
    And I should see "AI Material Classification"

  Scenario: Upload gagal karena data wajib belum lengkap
    Given I am logged in as a "Seller"
    And I am on "/upload-material"
    When I press "Submit"
    Then I should see "Periksa kembali data material yang wajib diisi."

  Scenario: Seller memakai AI untuk mengklasifikasikan material
    Given I am logged in as a "Seller"
    And I am on "/upload-material"
    When I upload a material photo
    And I fill in "Nama Produk / Material" with "Perca Kain Katun"
    And I fill in "Description" with "Perca kain katun bersih sisa produksi"
    And I press "Bantu dengan AI"
    Then I should see "Hasil Analisis AI"
    And I should see "Tekstil"
    And I should see "Keyakinan AI: tinggi"

  Scenario: Seller berhasil menerbitkan material
    Given I am logged in as a "Seller"
    And I am on "/upload-material"
    When I upload a material photo
    And I fill in "Nama Produk / Material" with "Perca Kain Katun"
    And I fill in "Description" with "Perca kain katun bersih sisa produksi"
    And I fill in "Quantity" with "12"
    And I fill in "Price" with "5000"
    And I fill in "Condition" with "Bersih dan kering"
    And I select "kg" from "Satuan"
    And I fill in "Location" with "Surabaya"
    And I press "Submit"
    Then I should be on "/my-materials"
    And I should see "Perca Kain Katun"
