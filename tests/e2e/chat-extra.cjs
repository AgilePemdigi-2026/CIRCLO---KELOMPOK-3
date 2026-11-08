// Uji E2E tambahan di luar skenario SRS. Jalankan saat server demo hidup:
//   BASE_URL=http://localhost:3000 node tests/e2e/chat-extra.cjs
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

async function open(browser, role, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  await ctx.addInitScript((r) => localStorage.setItem('circlo:dev-role', r), role);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(String(e)));
  await page.goto(`${BASE}/chat`);
  await page.getByRole('log', { name: 'Riwayat Pesan' }).waitFor();
  return { ctx, page };
}
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

t('pesan Buyer sampai ke Seller, dan pratinjau daftar ikut berubah', async (b) => {
  const buyer = await open(b, 'buyer');
  await buyer.page.getByLabel('Ketik pesan').fill('Saya ambil 10kg ya');
  await buyer.page.locator('#Send').click();
  await buyer.page.getByText('Saya ambil 10kg ya').first().waitFor();
  const seller = await open(b, 'seller');
  await seller.page.getByText('Saya ambil 10kg ya').first().waitFor();
  assert.match(await seller.page.locator('nav[aria-label="Percakapan"] a').first().innerText(), /Saya ambil 10kg ya/);
  assert.equal(seller.page.errors.length + buyer.page.errors.length, 0);
});

t('tombol kirim nonaktif saat kosong/spasi, aktif saat ada isi', async (b) => {
  const { page } = await open(b, 'buyer');
  assert.equal(await page.locator('#Send').isDisabled(), true);
  await page.getByLabel('Ketik pesan').fill('   ');
  assert.equal(await page.locator('#Send').isDisabled(), true);
  await page.getByLabel('Ketik pesan').fill('halo');
  assert.equal(await page.locator('#Send').isDisabled(), false);
});

t('Enter di kolom pesan mengirim pesan', async (b) => {
  const { page } = await open(b, 'buyer');
  await page.getByLabel('Ketik pesan').fill('Dikirim dengan Enter');
  await page.getByLabel('Ketik pesan').press('Enter');
  await page.getByText('Dikirim dengan Enter').first().waitFor();
});

t('pencarian percakapan menyaring daftar', async (b) => {
  const { page } = await open(b, 'buyer');
  await page.getByLabel('Cari percakapan').fill('siti');
  assert.equal(await page.locator('nav[aria-label="Percakapan"] a').count(), 1);
  await page.getByLabel('Cari percakapan').fill('zzzz');
  await page.getByText('Tidak ada percakapan yang cocok.').waitFor();
});

t('pesan gagal bertahan setelah reload, retry mengirim tepat satu kali', async (b) => {
  const { ctx, page } = await open(b, 'buyer');
  await ctx.route('**/api/percakapan/*/pesan', (r) => (r.request().method() === 'POST' ? r.abort() : r.continue()));
  await page.getByLabel('Ketik pesan').fill('Pesan penting');
  await page.locator('#Send').click();
  await page.getByText('Pesan gagal dikirim').waitFor();
  await ctx.unroute('**/api/percakapan/*/pesan');
  await page.reload();
  await page.getByText('Pesan gagal dikirim').waitFor();
  await page.getByRole('button', { name: 'Coba Lagi' }).click();
  await page.waitForFunction(() => !document.body.innerText.includes('Pesan gagal dikirim'));
  await page.reload();
  await page.getByRole('log', { name: 'Riwayat Pesan' }).getByText('Pesan penting').waitFor();
  assert.equal(await page.getByRole('log', { name: 'Riwayat Pesan' }).getByText('Pesan penting').count(), 1);
});

t('kartu material: nama, subtitle, status, tautan detail', async (b) => {
  const { page } = await open(b, 'buyer');
  await page.getByText('Batch 20kg • Sisa Industri').waitFor();
  await page.getByText('TERSEDIA', { exact: true }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Lihat Material Details' }).getAttribute('href'), '/katalog/1');
});

t('mobile: daftar dulu, buka ruang, tombol kembali', async (b) => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.addInitScript(() => localStorage.setItem('circlo:dev-role', 'buyer'));
  const p = await ctx.newPage();
  await p.goto(`${BASE}/chat`);
  const siti = p.getByRole('link', { name: /Siti Rahma/ });
  await siti.waitFor();
  assert.equal(await p.getByLabel('Ruang Percakapan').isVisible(), false);
  await siti.click();
  await p.getByLabel('Ruang Percakapan').waitFor();
  assert.equal(await siti.isVisible(), false);
  await p.getByRole('button', { name: 'Daftar Percakapan' }).click();
  await siti.waitFor();
});

t('role Government ditolak dari halaman chat', async (b) => {
  const ctx = await b.newContext(); await ctx.addInitScript(() => localStorage.setItem('circlo:dev-role', 'government'));
  const p = await ctx.newPage(); await p.goto(`${BASE}/chat`);
  await p.getByText('Halaman ini khusus Buyer / Seller').waitFor();
});

t('centang: 1 centang saat terkirim, jadi 2 centang setelah Seller membuka aplikasi', async (b) => {
  const buyer = await open(b, 'buyer');
  const log = buyer.page.getByRole('log', { name: 'Riwayat Pesan' });
  await buyer.page.getByLabel('Ketik pesan').fill('Cek centang');
  await buyer.page.locator('#Send').click();
  await log.getByRole('img', { name: 'Terkirim' }).waitFor(); // 1 centang: Seller belum membuka aplikasi
  assert.equal(await log.getByRole('img', { name: 'Diterima' }).count(), 1); // hanya riwayat awal
  await open(b, 'seller'); // Seller membuka aplikasi
  await log.getByRole('img', { name: 'Diterima' }).nth(1).waitFor({ timeout: 12000 }); // polling Buyer tiap 5 detik
  assert.equal(await log.getByRole('img', { name: 'Terkirim' }).count(), 0);
});

t('jaringan putus: "Coba Lagi" muncul, lalu pesan terkirim satu kali dengan centang', async (b) => {
  const { ctx, page } = await open(b, 'buyer');
  const log = page.getByRole('log', { name: 'Riwayat Pesan' });
  await ctx.setOffline(true);
  await page.getByLabel('Ketik pesan').fill('Pesan saat offline');
  await page.locator('#Send').click();
  await page.getByText('Pesan gagal dikirim').waitFor();
  await ctx.setOffline(false);
  await page.getByRole('button', { name: 'Coba Lagi' }).click();
  await log.getByRole('img', { name: 'Terkirim' }).waitFor();
  assert.equal(await page.getByText('Pesan gagal dikirim').count(), 0);
  assert.equal(await log.getByText('Pesan saat offline').count(), 1);
});

(async () => {
  const browser = await chromium.launch(); let failed = 0;
  for (const [name, fn] of tests) {
    await fetch(`${BASE}/api/percakapan/reset`, { method: 'POST' });
    try { await Promise.race([fn(browser), new Promise((_, r) => setTimeout(() => r(new Error('timeout 20s')), 20000))]); console.log('✔', name); }
    catch (e) { failed++; console.log('✘', name, '\n   ', e.message.split('\n')[0]); }
  }
  await browser.close(); console.log(`\n${tests.length - failed}/${tests.length} lulus`); process.exit(failed ? 1 : 0);
})();
