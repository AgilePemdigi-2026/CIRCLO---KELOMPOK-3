Feature: Pesanan Buyer
  Sebagai Buyer, saya ingin melihat daftar, status, dan membatalkan pesanan
  agar transaksi tetap terkendali.

  Scenario: Buyer melihat daftar pesanan
    Given I am logged in as a "Buyer"
    And I am on "/orders"
    Then I should see "Daftar Pesanan"
    And I should see "Kain Katun Hitam"
    And I should see "Palet Kayu Bekas"
    And I should see "Dikonfirmasi"

  Scenario: Buyer memfilter pesanan berdasarkan status
    Given I am logged in as a "Buyer"
    And I am on "/orders"
    When I press "Dikonfirmasi"
    Then I should see "Kain Katun Hitam"
    And I should not see "Palet Kayu Bekas"

  Scenario: Buyer melihat detail dan status pesanan
    Given I am logged in as a "Buyer"
    And I am on "/orders/1"
    Then I should see "Detail Pesanan #ORD-0001"
    And I should see "Riwayat Status Pesanan"
    And I should see "Dikonfirmasi"

  Scenario: Buyer membatalkan pesanan yang belum dikonfirmasi
    Given I am logged in as a "Buyer"
    And I am on "/orders/2"
    When I press "Batalkan Pesanan"
    Then I should see "Batalkan Pesanan?"
    When I press "Ya, Batalkan Pesanan"
    Then I should see "Dibatalkan"
