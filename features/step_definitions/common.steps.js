const { Given, When, Then } = require('@cucumber/cucumber');

const WAIT_MS = 20 * 1000;
const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function waitUntil(check, message, timeout = WAIT_MS) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await check().catch(() => false)) return;
    if (Date.now() > deadline) throw new Error(message);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function roleFromText(text) {
  const value = String(text || '').toLowerCase();
  if (value.includes('buyer') || value.includes('pembeli')) return 'buyer';
  if (value.includes('seller') || value.includes('penjual')) return 'seller';
  if (value.includes('government') || value.includes('pemerintah')) return 'government';
  throw new Error(`Role "${text}" tidak dikenal.`);
}

Given('I am logged in as a {string}', async function (roleText) {
  await this.loginAs(roleFromText(roleText));
});

Given('I am logged in as {string}', async function (roleText) {
  await this.loginAs(roleFromText(roleText));
});

Given('I am not logged in', async function () {
  await this.context.clearCookies();
  await this.page.goto(`${this.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await this.page.evaluate(() => {
    localStorage.removeItem('circlo:bdd-session');
    localStorage.removeItem('circlo:dev-role');
  });
  await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await this.page.waitForTimeout(300);
});

When('I fill the login email with {string}', async function (value) {
  await this.page.locator('input[type="email"]').fill(value);
});

When('I fill the login password with {string}', async function (value) {
  await this.page.locator('input[type="password"]').fill(value);
});

When('I submit the login form', async function () {
  await this.page.locator('form button[type="submit"]').click();
});

When('I submit the registration form', async function () {
  await this.page.locator('form button[type="submit"]').click();
});

When('I select {string} from {string}', async function (value, label) {
  let select = this.page.getByLabel(label, { exact: true }).first();
  if (!(await select.count())) select = this.page.getByLabel(label).first();
  if (!(await select.count())) select = this.page.locator(`select#${label}`).first();
  if (!(await select.count())) throw new Error(`Dropdown "${label}" tidak ditemukan.`);

  await select.evaluate((element, wanted) => {
    const option = [...element.options].find((item) => item.value === wanted)
      || [...element.options].find((item) => item.text.trim() === wanted)
      || [...element.options].find((item) => item.text.includes(wanted));
    if (!option) throw new Error(`Opsi "${wanted}" tidak ditemukan.`);
    element.value = option.value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
});

When('I set the order quantity to {string}', async function (value) {
  const input = this.page.locator('input[type="number"]').first();
  await input.fill(value);
});

When('I send the material request {string}', async function (text) {
  const input = this.page.getByPlaceholder('Kebutuhan Material atau Kata Kunci...');
  await input.fill(text);
  await this.page.locator('form').last().locator('button[type="submit"]').click();
});

When('I upload a material photo', async function () {
  await this.page.locator('input[type="file"]').first().setInputFiles({
    name: 'material-bdd.png',
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_1X1, 'base64'),
  });
});

When('I open the first order', async function () {
  const link = this.page.getByRole('link', { name: /Lihat Detail Pesanan|Detail Pesanan/i }).first();
  const fallback = this.page.locator('a[href^="/orders/"]').first();
  if (await link.count()) await link.click();
  else if (await fallback.count()) await fallback.click();
  else throw new Error('Tautan detail pesanan tidak ditemukan.');
  await this.page.waitForLoadState('domcontentloaded');
});

Then('I should be on {string}', async function (expectedPath) {
  await waitUntil(
    async () => {
      const url = new URL(this.page.url());
      return url.pathname === expectedPath.split('?')[0];
    },
    `Tidak berada di ${expectedPath}; URL saat ini ${this.page.url()}`,
  );
});

Then('I should not see {string}', async function (text) {
  await this.page.waitForTimeout(300);
  const locator = this.page.getByText(text, { exact: false });
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible().catch(() => false)) {
      throw new Error(`Masih melihat "${text}" di ${this.page.url()}`);
    }
  }
});

Then('I should see the heading {string}', async function (text) {
  const heading = this.page.getByRole('heading', { name: text });
  await waitUntil(
    async () => (await heading.count()) > 0 && (await heading.first().isVisible()),
    `Judul "${text}" tidak terlihat di ${this.page.url()}`,
  );
});

Then('the URL should contain {string}', async function (fragment) {
  await waitUntil(
    async () => this.page.url().includes(fragment),
    `URL ${this.page.url()} tidak memuat "${fragment}".`,
  );
});

Then('the last order request should contain:', async function (table) {
  const body = this.state.lastOrderRequest;
  if (!body) throw new Error('Tidak ada request pembuatan pesanan yang terkirim.');

  const mismatches = [];
  for (const row of table.hashes()) {
    const actual = body[row.field];
    if (String(actual) !== String(row.value)) {
      mismatches.push(`${row.field}: diharapkan "${row.value}", diterima "${actual}"`);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Payload pesanan tidak sesuai:\n- ${mismatches.join('\n- ')}`);
  }
});

async function assertConfirmationLine(page, label, expected) {
  const line = page
    .locator('p', { hasText: label })
    .filter({ hasText: expected })
    .first();

  await waitUntil(
    async () => (await line.count()) > 0 && (await line.isVisible()),
    `Konfirmasi "${label} ${expected}" tidak terlihat di ${page.url()}.`,
  );
}

Then('the checkout confirmation should show delivery method {string}', async function (value) {
  await assertConfirmationLine(this.page, 'Pengiriman:', value);
});

Then('the checkout confirmation should show payment method {string}', async function (value) {
  await assertConfirmationLine(this.page, 'Metode Pembayaran:', value);
});
