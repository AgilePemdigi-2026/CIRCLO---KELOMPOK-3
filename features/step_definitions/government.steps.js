const { When, Then } = require('@cucumber/cucumber');

const WAIT_MS = 10 * 1000;

async function waitUntil(check, message, timeout = WAIT_MS) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await check().catch(() => false)) return;
    if (Date.now() > deadline) throw new Error(message);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function normalize(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

Then('the government KPI {string} should show {string}', async function (label, expected) {
  const card = this.page
    .locator('div.rounded-xl')
    .filter({ has: this.page.getByText(label, { exact: true }) })
    .first();

  await waitUntil(
    async () => (await card.count()) > 0 && normalize(await card.locator('p').first().innerText()) === normalize(expected),
    `KPI "${label}" tidak menampilkan "${expected}".`,
  );
});

Then('the distribution chart should list category {string} with {string}', async function (kategori, detail) {
  const bar = this.page.locator(`[title="${kategori}: ${detail}"]`).first();
  await waitUntil(
    async () => (await bar.count()) > 0 && (await bar.isVisible()),
    `Chart distribusi tidak menampilkan "${kategori}: ${detail}".`,
  );
});

Then(
  'the activity hotspot should show {string} with {int} listings and {int} orders',
  async function (kota, listing, pesanan) {
    const item = this.page
      .locator('li')
      .filter({ hasText: kota })
      .filter({ hasText: new RegExp(`${listing} listing`) })
      .filter({ hasText: new RegExp(`${pesanan} pesanan`) })
      .first();

    await waitUntil(
      async () => (await item.count()) > 0 && (await item.isVisible()),
      `Titik panas "${kota}" tidak menampilkan ${listing} listing dan ${pesanan} pesanan.`,
    );
  },
);

When('I export the monitoring report', async function () {
  const [download] = await Promise.all([
    this.page.waitForEvent('download', { timeout: WAIT_MS }),
    this.page.getByRole('button', { name: /Ekspor Laporan/ }).click(),
  ]);

  this.lastDownload = download;
});

Then('the downloaded monitoring report should be a CSV', function () {
  const filename = this.lastDownload?.suggestedFilename() || '';
  if (!/^laporan-monitoring-ekosistem-\d{4}-\d{2}-\d{2}\.csv$/.test(filename)) {
    throw new Error(`Nama file ekspor tidak sesuai: "${filename}".`);
  }
});
