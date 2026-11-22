Feature: Login Pengguna
  Sebagai pengguna terdaftar, saya ingin masuk agar dapat mengakses dashboard
  dan fitur sesuai peran saya.

  Scenario: Buyer berhasil login
    Given I am not logged in
    And I am on "/login"
    When I fill the login email with "buyer@circlo.test"
    And I fill the login password with "buyer123"
    And I submit the login form
    Then I should be on "/buyer"
    And I should see "Material Populer"

  Scenario: Seller berhasil login
    Given I am not logged in
    And I am on "/login"
    When I fill the login email with "seller@circlo.test"
    And I fill the login password with "seller123"
    And I submit the login form
    Then I should be on "/seller"
    And I should see "Dashboard Penjual"

  Scenario: Pemerintah berhasil login
    Given I am not logged in
    And I am on "/login"
    When I press "Masuk sebagai Pemerintah"
    And I fill the login email with "government@circlo.test"
    And I fill the login password with "gov123"
    And I submit the login form
    Then I should be on "/monitoring"
    And I should see the heading "Monitoring Ekosistem"

  Scenario: Login gagal karena kredensial salah
    Given I am not logged in
    And I am on "/login"
    When I fill the login email with "buyer@circlo.test"
    And I fill the login password with "salah123"
    And I submit the login form
    Then I should see "Email atau kata sandi tidak sesuai."

  Scenario: Login gagal karena kolom kosong
    Given I am not logged in
    And I am on "/login"
    When I submit the login form
    Then I should see "Email dan kata sandi harus diisi."
