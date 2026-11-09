# Sumber: UTS_SRS_Kelompok_3 - Tabel 4.10 User Story Chat Buyer-Seller.
# Isi skenario TIDAK diubah dari SRS. Tag (@...) hanya menyiapkan kondisi awal yang
# disebut di judul skenario (koneksi terputus / ada pesan gagal yang menunggu dikirim ulang).
# Dijalankan untuk role Buyer dan Seller (CHAT_ROLE=buyer|seller).

@chat
Feature: Chat Buyer-Seller
  As a Buyer or Seller, I want to communicate through the chat feature so that I can discuss materials or orders with the other party.

  Scenario: User opens the chat feature
    Given I am on "/dashboard"
    When I follow "Chat"
    Then I should see "Daftar Percakapan"

  Scenario: User opens a conversation
    Given I am on "/chat"
    And I should see "Daftar Percakapan"
    When I follow "Percakapan dengan Pengguna"
    Then I should see "Ruang Percakapan"

  Scenario: User successfully sends a new message
    Given I am on "/chat"
    When I follow "Percakapan dengan Pengguna"
    And I fill in "Message" with "Apakah material masih tersedia?"
    And I press "Send"
    Then I should see "Apakah material masih tersedia?"

  Scenario: User opens an existing conversation
    Given I am on "/chat"
    When I follow "Percakapan yang Sudah Berlangsung"
    Then I should see "Riwayat Pesan"

  Scenario: User sends a new message in an existing conversation
    Given I am on "/chat"
    When I follow "Percakapan yang Sudah Berlangsung"
    Then I should see "Riwayat Pesan"
    When I fill in "Message" with "Terima kasih informasinya"
    And I press "Send"
    Then I should see "Terima kasih informasinya"

  @koneksi_putus
  Scenario: User fails to send a message because of connection problems
    Given I am on "/chat"
    When I fill in "Message" with "Apakah material masih tersedia?"
    And I press "Send"
    Then I should see "Pesan gagal dikirim"

  @pesan_gagal_tertunda
  Scenario: User retries sending a failed message
    Given I am on "/chat"
    And I should see "Pesan gagal dikirim"
    When I press "Coba Lagi"
    Then I should see "Apakah material masih tersedia?"
