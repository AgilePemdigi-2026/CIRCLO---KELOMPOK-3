// Konfigurasi Cucumber. Jalankan server dengan data demo dulu (npm run dev:chat-demo),
// atau pakai: npm run test:chat (server dijalankan otomatis).
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['features/support/**/*.js', 'features/step_definitions/**/*.js'],
    format: ['progress-bar', 'summary'],
    publishQuiet: true,
  },
};
