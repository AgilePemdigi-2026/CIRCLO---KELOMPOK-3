const { Given, When, Then } = require('@cucumber/cucumber');

const WAIT_MS = 10 * 1000;

// Beberapa kalimat di SRS adalah penanda umum, bukan teks di layar. Di sini dipetakan ke data mockup.
// (Buyer punya 3 percakapan; Seller hanya punya satu, dengan buyer "Pembeli Demo".)
const GLOSSARY = {
  buyer: { 'Percakapan dengan Pengguna': 'Siti Rahma', 'Percakapan yang Sudah Berlangsung': 'EcoTextile Hub Surabaya' },
  seller: { 'Percakapan dengan Pengguna': 'Pembeli Demo', 'Percakapan yang Sudah Berlangsung': 'Pembeli Demo' },
};
// "/dashboard" pada SRS = Beranda sesuai role.
const DASHBOARD = { buyer: '/buyer', seller: '/seller' };

const resolveName = (world, text) => (GLOSSARY[world.role] || {})[text] || text;

// Mencoba beberapa cara menemukan elemen (seperti Capybara: teks, label, name, id, placeholder, title).
async function waitFor(candidates, timeout = WAIT_MS) {
  const deadline = Date.now() + timeout;
  for (;;) {
    for (const loc of candidates) {
      const first = loc.first();
      if (await first.isVisible().catch(() => false)) return first;
    }
    if (Date.now() > deadline) return null;
    await new Promise((r) => setTimeout(r, 100));
  }
}

const attr = (name) => name.replace(/["\\]/g, '\\$&');

Given('I am on {string}', async function (path) {
  const target = path === '/dashboard' ? DASHBOARD[this.role] : path;
  await this.page.goto(`${this.baseUrl}${target}`, { waitUntil: 'domcontentloaded' });
});

When('I follow {string}', async function (text) {
  const name = resolveName(this, text);
  const p = this.page;
  const link = await waitFor([
    p.getByRole('link', { name, exact: true }),
    p.getByRole('link', { name }),
    p.getByRole('button', { name }),
    p.getByTitle(name),
  ]);
  if (!link) throw new Error(`Tautan "${name}" tidak ditemukan di ${p.url()}`);
  await link.click();
  await p.waitForLoadState('networkidle');
});

When('I fill in {string} with {string}', async function (field, value) {
  const p = this.page;
  const input = await waitFor([
    p.getByLabel(field, { exact: true }),
    p.locator(`[name="${attr(field)}"]`),
    p.locator(`[id="${attr(field)}"]`),
    p.getByPlaceholder(field),
  ]);
  if (!input) throw new Error(`Kolom "${field}" tidak ditemukan di ${p.url()}`);
  await input.fill(value);
});

When('I press {string}', async function (label) {
  const p = this.page;
  const button = await waitFor([
    p.getByRole('button', { name: label, exact: true }),
    p.locator(`button[name="${attr(label)}"]`),
    p.locator(`button[id="${attr(label)}"]`),
    p.getByTitle(label, { exact: true }),
    p.getByText(label, { exact: true }),
  ]);
  if (!button) throw new Error(`Tombol "${label}" tidak ditemukan di ${p.url()}`);
  await button.click();
});

// "See" = teks terlihat di halaman, atau label aksesibilitas (aria-label) / placeholder yang terlihat.
Then('I should see {string}', async function (text) {
  const p = this.page;
  const found = await waitFor([p.getByText(text), p.getByLabel(text, { exact: true }), p.getByPlaceholder(text), p.getByTitle(text)]);
  if (!found) throw new Error(`Tidak melihat "${text}" di ${p.url()}`);
});
