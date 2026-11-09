Feature: Profil Pengguna
  Sebagai Buyer, saya ingin melihat dan memperbarui profil agar informasi akun
  tetap akurat.

  Scenario: Buyer melihat profil
    Given I am logged in as a "Buyer"
    And I am on "/profile"
    Then I should see "Profil Saya"
    And I should see "Budi Buyer"
    And I should see "buyer@circlo.test"
    And I should see "Buyer"

  Scenario: Buyer memperbarui nama dan nomor HP
    Given I am logged in as a "Buyer"
    And I am on "/profile"
    When I press "Edit Profil"
    And I fill in "Nama Lengkap" with "Budi Pembeli"
    And I fill in "Nomor HP" with "081234567891"
    And I fill in "Alamat" with "Jl. Baru No. 20, Surabaya"
    And I press "Simpan Perubahan"
    Then I should see "Profil berhasil diperbarui!"
    And I should see "Budi Pembeli"

  Scenario: Buyer gagal menyimpan nomor HP tidak valid
    Given I am logged in as a "Buyer"
    And I am on "/profile"
    When I press "Edit Profil"
    And I fill in "Nama Lengkap" with "Budi Buyer"
    And I fill in "Nomor HP" with "12345"
    And I press "Simpan Perubahan"
    Then I should see "Nomor HP tidak valid"

  Scenario: Seller melihat profil
    Given I am logged in as a "Seller"
    And I am on "/profile"
    Then I should see "Profil Saya"
    And I should see "Sari Seller"
    And I should see "seller@circlo.test"
    And I should see "Akun Seller"
    And I should see "Material Saya"

  Scenario: Seller memperbarui informasi profil
    Given I am logged in as a "Seller"
    And I am on "/profile"
    When I press "Edit Profil"
    And I fill in "Nama Lengkap" with "Sari Penjual"
    And I fill in "Nomor HP" with "081298765433"
    And I fill in "Alamat" with "Jl. Baru No. 9, Sidoarjo"
    And I press "Simpan Perubahan"
    Then I should see "Profil berhasil diperbarui!"
    And I should see "Sari Penjual"
    And I should see "081298765433"
