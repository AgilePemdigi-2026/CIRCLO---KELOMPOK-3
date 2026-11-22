const { Given, When, Then } = require('@cucumber/cucumber');

const WAIT_MS = 10 * 1000;

async function waitUntil(check, message, timeout = WAIT_MS) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await check().catch(() => false)) return;
    if (Date.now() > deadline) throw new Error(message);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function materialBy(name, world) {
  const material = world.state.materials.find((item) => item.nama_material === name);
  if (!material) throw new Error(`Material fixture "${name}" tidak ditemukan.`);
  return material;
}

function cartItem(world, name) {
  return world.page.getByTestId('cart-item').filter({ hasText: name }).first();
}

function normalize(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

Given('the buyer cart contains {string} with quantity {int}', function (name, quantity) {
  const material = materialBy(name, this);
  const existing = this.state.cart.find(
    (item) => Number(item.id_material) === Number(material.id_material),
  );

  if (existing) {
    existing.kuantitas = quantity;
    return;
  }

  this.state.cart.push({
    id_keranjang: 700 + this.state.cart.length + 1,
    id_material: material.id_material,
    kuantitas: quantity,
    nama_material: material.nama_material,
    kategori: material.kategori,
    harga: material.harga,
    stok: material.stok,
    satuan: material.satuan,
    lokasi: material.lokasi,
    status_material: material.status_material,
  });
});

When('I open the cart', async function () {
  await this.page.goto(`${this.baseUrl}/cart`, { waitUntil: 'domcontentloaded' });
  await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await this.page.getByRole('heading', { name: 'Keranjang Saya' }).waitFor({ timeout: WAIT_MS });
});

When('I add {string} to the cart from the catalog with quantity {int}', async function (name, quantity) {
  const card = this.page.locator('main li').filter({ hasText: name }).first();
  await card.waitFor({ state: 'visible', timeout: WAIT_MS });
  await card.getByRole('button', { name: 'Keranjang', exact: true }).click();

  const dialog = this.page.getByRole('dialog', { name: 'Tambah ke Keranjang' });
  await dialog.waitFor({ state: 'visible', timeout: WAIT_MS });
  await dialog.locator('#jumlah-katalog').fill(String(quantity));
  await dialog.getByRole('button', { name: 'Tambah ke Keranjang', exact: true }).click();

  await waitUntil(
    async () => this.page.getByRole('status').filter({ hasText: 'berhasil ditambahkan ke keranjang' }).first().isVisible(),
    'Notifikasi berhasil menambahkan material ke keranjang tidak terlihat.',
  );
});

When('I add the material to the cart from the detail panel with quantity {int}', async function (quantity) {
  await this.page.getByRole('button', { name: 'Keranjang', exact: true }).click();

  const dialog = this.page.getByRole('dialog', { name: 'Tambah ke Keranjang' });
  await dialog.waitFor({ state: 'visible', timeout: WAIT_MS });
  await dialog.locator('#jumlah-keranjang').fill(String(quantity));
  await dialog.getByRole('button', { name: 'Masukkan', exact: true }).click();

  await waitUntil(
    async () => this.page.getByRole('status').filter({ hasText: 'berhasil ditambahkan ke keranjang!' }).first().isVisible(),
    'Notifikasi berhasil menambahkan material dari detail tidak terlihat.',
  );
});

When('I increase the quantity of {string} in the cart', async function (name) {
  const item = cartItem(this, name);
  await item.getByRole('button', { name: 'Tambah jumlah' }).click();
});

When('I remove {string} from the cart', async function (name) {
  const item = cartItem(this, name);
  await item.getByRole('button', { name: 'Hapus', exact: true }).click();

  const dialog = this.page.getByRole('dialog', { name: 'Hapus Material?' });
  await dialog.waitFor({ state: 'visible', timeout: WAIT_MS });
  await dialog.getByRole('button', { name: 'Ya, Hapus', exact: true }).click();

  await waitUntil(
    async () => this.page.getByRole('status').filter({ hasText: 'Material berhasil dihapus dari keranjang.' }).first().isVisible(),
    'Notifikasi berhasil menghapus material tidak terlihat.',
  );
});

When('I select all available materials in the cart', async function () {
  await this.page.getByRole('checkbox', { name: 'Pilih semua material tersedia' }).check();
});

When('I press {string} and accept the browser confirmation', async function (label) {
  this.page.once('dialog', (dialog) => dialog.accept());
  await this.page.getByRole('button', { name: label, exact: true }).first().click();
});

Then('the cart item {string} should show quantity {int}', async function (name, quantity) {
  const value = cartItem(this, name).getByTestId('cart-quantity');
  await waitUntil(
    async () => normalize(await value.innerText()) === String(quantity),
    `Jumlah material "${name}" tidak menjadi ${quantity}.`,
  );
});

Then('the cart item {string} should show subtotal {string}', async function (name, expected) {
  const value = cartItem(this, name).getByTestId('cart-subtotal');
  await waitUntil(
    async () => normalize(await value.innerText()) === normalize(expected),
    `Subtotal material "${name}" tidak sesuai "${expected}".`,
  );
});

Then('the cart item {string} should not offer checkout', async function (name) {
  const links = cartItem(this, name).getByRole('link', { name: 'Checkout', exact: true });
  if ((await links.count()) > 0) {
    throw new Error(`Material "${name}" seharusnya tidak menawarkan tombol Checkout.`);
  }
});

Then('the cart should offer {string}', async function (name) {
  const link = this.page.getByRole('link', { name, exact: true }).first();
  await waitUntil(
    async () => link.isVisible(),
    `Tautan "${name}" tidak tersedia di keranjang.`,
  );
});

Then('the last cart checkout should contain {int} materials with delivery method {string}', function (count, method) {
  const body = this.state.lastCartCheckoutRequest;
  if (!body) throw new Error('Tidak ada request checkout keranjang yang terkirim.');

  if (!Array.isArray(body.items) || body.items.length !== count) {
    throw new Error(`Jumlah material checkout diharapkan ${count}, diterima ${body.items?.length}.`);
  }

  if (body.metode_kirim !== method) {
    throw new Error(`Metode kirim diharapkan "${method}", diterima "${body.metode_kirim}".`);
  }

  for (const item of body.items) {
    if (!Number.isSafeInteger(Number(item.id_keranjang)) || Number(item.kuantitas) < 1) {
      throw new Error('Payload checkout berisi item keranjang yang tidak valid.');
    }
  }
});

Then('the buyer cart should be empty', function () {
  if (this.state.cart.length !== 0) {
    throw new Error(`Keranjang seharusnya kosong, masih ada ${this.state.cart.length} material.`);
  }
});
