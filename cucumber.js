// Konfigurasi Cucumber. Untuk menjalankan seluruh suite, pakai npm run test:bdd
// (server BDD dijalankan otomatis). Untuk server sendiri, jalankan dengan
// CHAT_DEMO=1 BDD_DEMO=1 NEXT_PUBLIC_BDD_DEMO=1 lalu npm run test:bdd:raw.
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['features/support/**/*.js', 'features/step_definitions/**/*.js'],
    format: ['progress-bar', 'summary'],
    publishQuiet: true,
  },
};
