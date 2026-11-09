Feature: Registrasi Akun
  Sebagai calon pengguna, saya ingin membuat akun agar dapat menggunakan CIRCLO
  sesuai peran saya.

  Scenario: Buyer berhasil mendaftar
    Given I am on "/register"
    When I fill in "Full Name" with "Budi Baru"
    And I fill in "Email" with "buyer.baru@circlo.test"
    And I select "Buyer" from "Role"
    And I fill in "Password" with "rahasia123"
    And I submit the registration form
    Then I should see "Registration successful"
    And I should be on "/login"

  Scenario: Seller berhasil mendaftar
    Given I am on "/register"
    When I fill in "Full Name" with "Sari Baru"
    And I fill in "Email" with "seller.baru@circlo.test"
    And I select "Seller" from "Role"
    And I fill in "Password" with "rahasia123"
    And I submit the registration form
    Then I should see "Registration successful"
    And I should be on "/login"

  Scenario: Registrasi gagal karena data tidak lengkap
    Given I am on "/register"
    When I submit the registration form
    Then I should see "Registration failed. Please complete all data."

  Scenario: Registrasi gagal karena password terlalu pendek
    Given I am on "/register"
    When I fill in "Full Name" with "Budi Baru"
    And I fill in "Email" with "buyer.baru@circlo.test"
    And I fill in "Password" with "123"
    And I submit the registration form
    Then I should see "Registration failed. Password must be at least 6 characters."

  Scenario: Registrasi gagal karena email sudah terdaftar
    Given I am on "/register"
    When I fill in "Full Name" with "Budi Buyer"
    And I fill in "Email" with "buyer@circlo.test"
    And I fill in "Password" with "rahasia123"
    And I submit the registration form
    Then I should see "Registration failed. Email is already registered."
