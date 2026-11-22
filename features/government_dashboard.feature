# Sumber: README Sprint 3 - Dashboard Government (KPI Laporan, Chart, Insight AI).
# Alur mengikuti app/monitoring/page.jsx, components/GovernmentDashboard.jsx,
# app/api/government/route.js, dan app/api/government/insight/route.js.

@government
Feature: Dashboard Government
  Sebagai Pemerintah, saya ingin memantau distribusi dan penyerapan material
  agar dapat menilai aktivitas ekosistem daur ulang.

  Scenario: Pemerintah melihat KPI laporan ekosistem
    Given I am logged in as a "Government"
    And I am on "/monitoring"
    Then I should see "Monitoring Ekosistem"
    And I should see "Wawasan AI"
    And I should see "Ton Dialihkan"
    And the government KPI "Ton Dialihkan" should show "2,4"
    And the government KPI "Kecocokan Berhasil (pesanan)" should show "48"
    And the government KPI "Pengelola Aktif" should show "12"

  Scenario: Pemerintah melihat chart distribusi material dan titik panas
    Given I am logged in as a "Government"
    And I am on "/monitoring"
    Then I should see "Statistik Distribusi Material"
    And I should see "Material Terserap: 24"
    And I should see "Material Belum Terserap: 36"
    And the distribution chart should list category "Tekstil" with "12 terserap, 18 belum terserap"
    And I should see "30 listing"
    And the activity hotspot should show "Surabaya" with 18 listings and 9 orders

  Scenario: Pemerintah melihat insight AI pada dashboard
    Given I am logged in as a "Government"
    And I am on "/monitoring"
    Then I should see "Wawasan AI"
    And I should see "dibuat oleh AI"
    And I should see "Wilayah Surabaya mendominasi aktivitas dengan 18 listing dan 9 pesanan."

  Scenario: Pemerintah menyaring laporan berdasarkan periode
    Given I am logged in as a "Government"
    And I am on "/monitoring"
    Then I should see "Kecocokan Berhasil (pesanan)"
    When I select "7 hari terakhir" from "Periode Monitoring"
    Then I should see "Data Berdasarkan Periode: 7 hari terakhir"

  Scenario: Pemerintah menyaring laporan berdasarkan kategori material
    Given I am logged in as a "Government"
    And I am on "/monitoring"
    Then I should see "Kecocokan Berhasil (pesanan)"
    When I select "Tekstil" from "Kategori Material"
    Then I should see "Statistik Berdasarkan Kategori: Tekstil"
    And the distribution chart should list category "Tekstil" with "12 terserap, 18 belum terserap"

  Scenario: Pemerintah mengekspor laporan monitoring
    Given I am logged in as a "Government"
    And I am on "/monitoring"
    Then I should see "Kecocokan Berhasil (pesanan)"
    When I export the monitoring report
    Then the downloaded monitoring report should be a CSV

  Scenario: Buyer tidak dapat mengakses dashboard Government
    Given I am logged in as a "Buyer"
    And I am on "/monitoring"
    Then I should see "Halaman ini khusus Pemerintah/Admin."
    And I should see "Ke halaman login"
    And I should not see "Wawasan AI"
