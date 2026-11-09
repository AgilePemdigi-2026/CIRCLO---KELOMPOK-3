const fs = require('node:fs');
const path = require('node:path');
const { setWorldConstructor, Before, After, BeforeAll, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('@playwright/test');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const CHAT_ROLE = (process.env.CHAT_ROLE || 'buyer').toLowerCase();
if (!['buyer', 'seller'].includes(CHAT_ROLE)) throw new Error('CHAT_ROLE harus buyer atau seller.');

const fixtures = require(path.join(__dirname, '..', '..', 'lib', 'bdd', 'fixtures.json'));

const clone = (value) => JSON.parse(JSON.stringify(value));

const USERS = {
  'buyer@circlo.test': {
    password: 'buyer123',
    token: 'bdd-buyer-token',
    role: 'buyer',
    user: {
      id: 'bdd-buyer-1',
      email: 'buyer@circlo.test',
      email_confirmed_at: '2026-01-01T00:00:00.000Z',
      user_metadata: {
        nama: 'Budi Buyer',
        full_name: 'Budi Buyer',
        role: 'buyer',
        phone: '081234567890',
        address: 'Jl. Raya Surabaya No. 10, Surabaya',
      },
    },
  },
  'seller@circlo.test': {
    password: 'seller123',
    token: 'bdd-seller-token',
    role: 'seller',
    user: {
      id: 'bdd-seller-1',
      email: 'seller@circlo.test',
      email_confirmed_at: '2026-01-01T00:00:00.000Z',
      user_metadata: {
        nama: 'Sari Seller',
        full_name: 'Sari Seller',
        role: 'seller',
        phone: '081298765432',
        address: 'Jl. Industri No. 8, Sidoarjo',
      },
    },
  },
  'government@circlo.test': {
    password: 'gov123',
    token: 'bdd-government-token',
    role: 'government',
    user: {
      id: 'bdd-government-1',
      email: 'government@circlo.test',
      email_confirmed_at: '2026-01-01T00:00:00.000Z',
      user_metadata: {
        nama: 'Gita Pemerintah',
        full_name: 'Gita Pemerintah',
        role: 'government',
      },
    },
  },
};

const USERS_BY_TOKEN = Object.fromEntries(
  Object.values(USERS).map((item) => [item.token, item.user]),
);

const PUBLIC_MATERIAL_FIELDS = [
  'id_material',
  'nama_material',
  'kategori',
  'deskripsi_material',
  'kondisi_seller',
  'stok',
  'satuan',
  'harga',
  'lokasi',
  'kota',
  'provinsi',
  'foto_url',
  'status_material',
];

function publicMaterial(material) {
  const row = {};
  for (const field of PUBLIC_MATERIAL_FIELDS) row[field] = material[field];
  row.tersedia = material.status_material !== false && Number(material.stok) > 0;
  return row;
}

function authUserFor(route) {
  const authorization = route.request().headers().authorization || '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  return USERS_BY_TOKEN[token] || null;
}

function jsonBody(route) {
  try {
    return route.request().postDataJSON() || {};
  } catch {
    return {};
  }
}

setDefaultTimeout(30 * 1000);

let browser;
BeforeAll(async function () {
  browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
});
AfterAll(async function () {
  await browser?.close();
});

class CircloWorld {
  constructor() {
    this.role = null;
    this.baseUrl = BASE_URL;
    this.chatRole = CHAT_ROLE;
  }

  resetState() {
    this.state = {
      user: null,
      materials: clone(fixtures.materials),
      buyerOrders: clone(fixtures.buyerOrders),
      sellerOrders: clone(fixtures.sellerOrders),
      cart: [],
      lastOrderRequest: null,
      orderPostCount: 0,
    };
  }

  async loginAs(role) {
    const account = USERS[`${role}@circlo.test`];
    if (!account) throw new Error(`Akun BDD untuk role ${role} tidak tersedia.`);

    this.state.user = account.user;
    this.role = role;

    await this.context.addInitScript(
      ({ sessionKey, devKey, roleName, user, token }) => {
        localStorage.setItem(
          sessionKey,
          JSON.stringify({ role: roleName, user, access_token: token }),
        );
        localStorage.setItem(devKey, roleName);
      },
      {
        sessionKey: 'circlo:bdd-session',
        devKey: 'circlo:dev-role',
        roleName: role,
        user: account.user,
        token: account.token,
      },
    );

    await this.page.goto(this.baseUrl + this.dashboardPath(role), {
      waitUntil: 'domcontentloaded',
    });
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  dashboardPath(role) {
    return {
      buyer: '/buyer',
      seller: '/seller',
      government: '/government',
    }[role] || '/buyer';
  }

  async fulfillJson(route, status, body) {
    await route.fulfill({
      status,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      },
      body: JSON.stringify(body),
    });
  }

  async handleAuth(route) {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      });
    }

    if (url.pathname.endsWith('/signup') && method === 'POST') {
      const body = jsonBody(route);
      const email = String(body.email || '').toLowerCase();
      const existing = USERS[email];

      if (existing) {
        return this.fulfillJson(route, 200, {
          ...existing.user,
          identities: [],
        });
      }

      const user = {
        id: `bdd-new-${Date.now()}`,
        email,
        email_confirmed_at: '2026-01-01T00:00:00.000Z',
        user_metadata: body.data || {},
        identities: [{ id: `identity-${Date.now()}`, provider: 'email' }],
      };
      return this.fulfillJson(route, 200, { user, session: null });
    }

    if (url.pathname.endsWith('/token') && method === 'POST') {
      const body = jsonBody(route);
      const grantType = url.searchParams.get('grant_type');

      if (grantType === 'refresh_token') {
        const refreshToken = String(body.refresh_token || '');
        const role = refreshToken.replace('bdd-refresh-', '');
        const account = USERS[`${role}@circlo.test`];
        if (!account) return this.fulfillJson(route, 400, { error: 'Invalid Refresh Token' });
        return this.fulfillJson(route, 200, this.sessionFor(account));
      }

      const email = String(body.email || '').toLowerCase();
      const password = String(body.password || '');
      const account = USERS[email];

      if (!account || account.password !== password) {
        return this.fulfillJson(route, 400, {
          error: 'Invalid login credentials',
          error_description: 'Invalid login credentials',
          msg: 'Invalid login credentials',
        });
      }

      this.state.user = account.user;
      return this.fulfillJson(route, 200, this.sessionFor(account));
    }

    if (url.pathname.endsWith('/user') && method === 'GET') {
      const user = authUserFor(route);
      if (!user) return this.fulfillJson(route, 401, { message: 'invalid claim: missing sub claim' });
      return this.fulfillJson(route, 200, user);
    }

    if (url.pathname.endsWith('/logout') && method === 'POST') {
      return route.fulfill({ status: 204 });
    }

    return this.fulfillJson(route, 404, { message: 'Auth endpoint not mocked' });
  }

  sessionFor(account) {
    return {
      access_token: account.token,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: `bdd-refresh-${account.role}`,
      user: account.user,
    };
  }

  materialDetail(material, id) {
    const seller = fixtures.sellers.find(
      (item) => Number(item.id_seller) === Number(material.id_seller),
    ) || fixtures.sellers[0];

    const available = this.state.materials.filter(
      (item) => Number(item.id_material) !== Number(id) &&
        item.status_material !== false &&
        Number(item.stok) > 0,
    );
    const sameCategory = available.filter((item) => item.kategori === material.kategori);
    const rekomendasi = (sameCategory.length > 0 ? sameCategory : available).slice(0, 3);

    return {
      order: {
        id_pesanan: Number(id),
        tgl_pesan: '2026-10-12T10:45:00.000Z',
        status_pesanan: 'Dikonfirmasi',
        metode_kirim: 'Dikirim',
      },
      items: [
        {
          id_detail: 1,
          id_material: Number(id),
          nama_material: material.nama_material,
          kategori: material.kategori,
          label: 'Daur Ulang',
          grade: 'A',
          foto_url: material.foto_url,
          satuan: material.satuan,
          harga: material.harga,
          kuantitas_pesan: 2,
          subtotal: Number(material.harga || 0) * 2,
        },
      ],
      seller: {
        id_seller: seller.id_seller,
        nama: seller.nama_seller,
        alamat: 'Jl. Industri No. 8',
        terverifikasi: true,
        rating: 98,
      },
      lokasi: {
        nama: 'Gudang CIRCLO',
        alamat: 'Jl. Industri No. 8',
        kota: material.kota || 'Surabaya',
        provinsi: material.provinsi || 'Jawa Timur',
      },
      ringkasan: {
        subtotal: Number(material.harga || 0) * 2,
        biaya_layanan: 15000,
        total: Number(material.harga || 0) * 2 + 15000,
      },
      riwayat: [
        {
          id: 1,
          status_update: 'Pesanan dibuat, menunggu konfirmasi penjual',
          waktu_update: '2026-10-12T10:45:00.000Z',
        },
        {
          id: 2,
          status_update: 'Dikonfirmasi penjual',
          waktu_update: '2026-10-12T14:15:00.000Z',
        },
      ],
      rekomendasi: rekomendasi.map(publicMaterial),
    };
  }

  orderDetailFrom(order) {
    const first = order.items?.[0] || {};
    const material = this.state.materials.find(
      (item) => Number(item.id_material) === Number(first.id_material),
    ) || this.state.materials[0];

    return {
      order: {
        id_pesanan: order.id_pesanan,
        tgl_pesan: order.tgl_pesan,
        status_pesanan: order.status_pesanan,
        metode_kirim: order.metode_kirim,
      },
      items: (order.items || []).map((item) => ({
        ...item,
        foto_url: material.foto_url,
        grade: 'A',
      })),
      seller: {
        id_seller: 1,
        nama: 'Sari Seller',
        alamat: 'Jl. Industri No. 8',
        terverifikasi: true,
        rating: 98,
      },
      lokasi: {
        nama: 'Gudang CIRCLO',
        alamat: 'Jl. Industri No. 8',
        kota: first.kota || 'Surabaya',
        provinsi: 'Jawa Timur',
      },
      ringkasan: {
        subtotal: Number(order.total_estimasi || 0),
        biaya_layanan: 15000,
        total: Number(order.total_estimasi || 0) + 15000,
      },
      riwayat: order.status_pesanan === 'Dibatalkan'
        ? [
            { id: 1, status_update: 'Pesanan dibuat, menunggu konfirmasi penjual', waktu_update: order.tgl_pesan },
            { id: 2, status_update: 'Dibatalkan oleh pembeli', waktu_update: '2026-10-15T10:00:00.000Z' },
          ]
        : order.status_pesanan === 'Menunggu Konfirmasi'
          ? [{ id: 1, status_update: 'Pesanan dibuat, menunggu konfirmasi penjual', waktu_update: order.tgl_pesan }]
          : [
              { id: 1, status_update: 'Pesanan dibuat, menunggu konfirmasi penjual', waktu_update: order.tgl_pesan },
              { id: 2, status_update: 'Dikonfirmasi penjual', waktu_update: '2026-10-13T09:00:00.000Z' },
            ],
    };
  }

  async handleOrders(route, url, method) {
    const user = authUserFor(route);
    if (!user) return this.fulfillJson(route, 401, { error: 'Silakan login terlebih dahulu.' });

    const segments = url.pathname.split('/').filter(Boolean);
    const id = segments.length >= 3 ? Number(segments[2]) : null;
    const action = segments[3] || null;

    if (method === 'GET' && !id) {
      if (url.searchParams.get('scope') === 'seller') {
        const orders = this.state.sellerOrders;
        return this.fulfillJson(route, 200, {
          role: 'seller',
          seller: { id_seller: 1, nama_seller: 'Sari Seller' },
          summary: {
            pending: orders.filter((order) => /menunggu/i.test(order.status_pesanan)).length,
            ready: orders.filter((order) => /dikonfirmasi|disalurkan/i.test(order.status_pesanan)).length,
            completed: orders.filter((order) => /selesai/i.test(order.status_pesanan)).length,
            impact_kg: 3,
            completed_units: 3,
          },
          orders,
        });
      }

      return this.fulfillJson(route, 200, {
        role: 'buyer',
        orders: this.state.buyerOrders,
      });
    }

    if (method === 'POST' && !id) {
      const body = jsonBody(route);
      this.state.lastOrderRequest = body;
      this.state.orderPostCount += 1;
      const material = this.state.materials.find(
        (item) => Number(item.id_material) === Number(body.id_material),
      ) || this.state.materials[0];
      const quantity = Number(body.kuantitas || 1);
      const newOrder = {
        id_pesanan: 99,
        id_buyer: 1,
        total_estimasi: Number(material.harga || 0) * quantity,
        metode_kirim: body.metode_kirim || 'Dikirim',
        status_pesanan: 'Menunggu Konfirmasi',
        tgl_pesan: new Date().toISOString(),
        items: [
          {
            id_detail: 99,
            id_material: material.id_material,
            nama_material: material.nama_material,
            kategori: material.kategori,
            satuan: material.satuan,
            harga: material.harga,
            kuantitas_pesan: quantity,
            subtotal: Number(material.harga || 0) * quantity,
            kota: material.kota,
          },
        ],
      };
      this.state.buyerOrders.unshift(newOrder);
      return this.fulfillJson(route, 200, {
        success: true,
        id_pesanan: 99,
        message: 'Pesanan berhasil dibuat.',
      });
    }

    const buyerOrder = this.state.buyerOrders.find((order) => Number(order.id_pesanan) === id);
    const sellerOrder = this.state.sellerOrders.find((order) => Number(order.id_pesanan) === id);

    if (method === 'GET' && id && !action) {
      const order = buyerOrder || sellerOrder;
      if (!order) return this.fulfillJson(route, 404, { error: 'Pesanan tidak ditemukan.' });
      return this.fulfillJson(route, 200, this.orderDetailFrom(order));
    }

    if (method === 'POST' && action === 'cancel') {
      const order = buyerOrder || sellerOrder;
      if (!order) return this.fulfillJson(route, 404, { error: 'Pesanan tidak ditemukan.' });
      order.status_pesanan = 'Dibatalkan';
      return this.fulfillJson(route, 200, { success: true, message: 'Pesanan berhasil dibatalkan.' });
    }

    if (method === 'PATCH' && id && !action) {
      const order = sellerOrder || buyerOrder;
      if (!order) return this.fulfillJson(route, 404, { error: 'Pesanan tidak ditemukan.' });
      const body = jsonBody(route);
      order.status_pesanan = {
        confirm: 'Dikonfirmasi',
        reject: 'Ditolak',
        ship: 'Disalurkan',
        complete: 'Selesai',
      }[body.action] || order.status_pesanan;
      return this.fulfillJson(route, 200, {
        success: true,
        message: `Pesanan #${order.id_pesanan} berhasil diperbarui.`,
      });
    }

    return this.fulfillJson(route, 404, { error: 'Endpoint pesanan tidak dikenal.' });
  }

  async handleApi(route) {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const pathname = url.pathname;

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      });
    }

    if (pathname === '/api/katalog') {
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      const kategori = url.searchParams.get('kategori') || '';
      const kota = (url.searchParams.get('kota') || '').trim().toLowerCase();

      let rows = this.state.materials;
      if (q) {
        rows = rows.filter((material) =>
          [material.nama_material, material.kategori, material.deskripsi_material]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q)),
        );
      }
      if (kategori) rows = rows.filter((material) => material.kategori === kategori);
      if (kota) {
        rows = rows.filter((material) =>
          String(material.kota || '').toLowerCase().includes(kota),
        );
      }

      return this.fulfillJson(route, 200, {
        rows: rows.map(publicMaterial),
        kategori: [...new Set(this.state.materials.map((material) => material.kategori))],
      });
    }

    if (pathname.startsWith('/api/orders')) {
      return this.handleOrders(route, url, method);
    }

    if (pathname === '/api/classify-material') {
      return this.fulfillJson(route, 200, clone(fixtures.classification));
    }

    if (pathname === '/api/chat') {
      const text = [
        'event: meta',
        `data: ${JSON.stringify({ materials: [publicMaterial(this.state.materials[0])] })}`,
        '',
        'event: delta',
        `data: ${JSON.stringify({ text: 'Saya merekomendasikan **Kain Katun Hitam** dari Surabaya. Material ini cocok untuk proyek tekstil daur ulang dan stoknya masih tersedia.' })}`,
        '',
        'event: done',
        'data: {}',
        '',
        '',
      ].join('\n');
      return route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        },
        body: text,
      });
    }

    if (pathname === '/api/profile') {
      const user = authUserFor(route);
      if (!user) return this.fulfillJson(route, 401, { error: 'Sesi login tidak valid.' });
      const body = jsonBody(route);
      const next = {
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...(body.fullName ? { full_name: body.fullName, nama: body.fullName } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.address !== undefined ? { address: body.address } : {}),
          ...(body.avatarDataUrl ? { avatar_url: body.avatarDataUrl } : {}),
        },
      };
      this.state.user = next;
      return this.fulfillJson(route, 200, { user: next });
    }

    if (pathname === '/api/materials') {
      const user = authUserFor(route);
      if (!user) return this.fulfillJson(route, 401, { error: 'Sesi login tidak valid.' });

      if (method === 'GET') {
        return this.fulfillJson(route, 200, {
          rows: this.state.materials.map((material) => ({ ...material })),
        });
      }

      if (method === 'POST') {
        const body = jsonBody(route);
        const material = {
          id_material: 100 + this.state.materials.length,
          id_seller: 1,
          nama_material: body.nama || body.name || 'Material Baru',
          kategori: body.kategori || 'Belum diklasifikasikan',
          deskripsi_material: body.deskripsi || body.description || '',
          kondisi_seller: body.kondisi_seller || body.condition || '',
          stok: Number(body.jumlah ?? body.quantity ?? 0),
          satuan: body.satuan || 'kg',
          harga: Number(body.harga ?? body.price ?? 0),
          lokasi: body.lokasi || body.location || '',
          kota: String(body.lokasi || body.location || '').split(',')[0].trim(),
          provinsi: 'Jawa Timur',
          foto_url: body.foto || body.foto_url || '',
          status_material: true,
          skor: 70,
        };
        this.state.materials.push(material);
        return this.fulfillJson(route, 200, {
          ok: true,
          id_material: material.id_material,
          foto_url: material.foto_url,
        });
      }

      if (method === 'PATCH') {
        const body = jsonBody(route);
        const material = this.state.materials.find(
          (item) => Number(item.id_material) === Number(body.id),
        );
        if (material) {
          Object.assign(material, {
            ...(body.deskripsi !== undefined ? { deskripsi_material: body.deskripsi } : {}),
            ...(body.jumlah !== undefined ? { stok: Number(body.jumlah) } : {}),
          });
        }
        return this.fulfillJson(route, 200, {
          ok: true,
          id_material: material?.id_material || body.id,
          foto_url: material?.foto_url || '',
        });
      }
    }

    if (pathname === '/api/cart') {
      const user = authUserFor(route);
      if (!user) return this.fulfillJson(route, 401, { error: 'Silakan login sebagai Buyer.' });

      if (method === 'GET') return this.fulfillJson(route, 200, { items: this.state.cart });
      if (method === 'POST') {
        const body = jsonBody(route);
        this.state.cart.push({
          id_material: Number(body.id_material),
          kuantitas: Number(body.jumlah ?? body.kuantitas ?? 1),
        });
        return this.fulfillJson(route, 200, {
          success: true,
          message: 'Material berhasil ditambahkan ke keranjang.',
        });
      }
      return this.fulfillJson(route, 200, { success: true });
    }

    return route.continue();
  }
}

setWorldConstructor(CircloWorld);

// Kondisi awal setiap skenario: browser baru, state API BDD, mock Supabase/API,
// dan role Chat hanya untuk skenario yang bertag @chat.
Before(async function (scenario) {
  const isChat = scenario.pickle.tags.some((tag) => tag.name === '@chat');

  if (isChat) {
    const res = await fetch(`${BASE_URL}/api/percakapan/reset`, { method: 'POST' }).catch(() => null);
    if (!res || !res.ok) {
      throw new Error(`Server di ${BASE_URL} belum siap atau tidak berjalan dengan CHAT_DEMO=1. Jalankan: npm run test:bdd`);
    }
  }

  this.resetState();
  this.role = isChat ? CHAT_ROLE : null;
  this.context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  if (isChat) {
    await this.context.addInitScript(
      (role) => window.localStorage.setItem('circlo:dev-role', role),
      CHAT_ROLE,
    );
  }

  await this.context.route(/\/auth\/v1\//, (route) => this.handleAuth(route));
  await this.context.route('**/api/**', (route) => this.handleApi(route));

  this.page = await this.context.newPage();
});

// "User fails to send a message because of connection problems": semua POST pesan gagal terkirim.
Before({ tags: '@koneksi_putus' }, async function () {
  await this.context.route('**/api/percakapan/*/pesan', (route) =>
    route.request().method() === 'POST' ? route.abort('internetdisconnected') : route.continue(),
  );
});

// "User retries sending a failed message": sudah ada satu pesan gagal di percakapan teratas.
Before({ tags: '@pesan_gagal_tertunda' }, async function () {
  await this.context.addInitScript(
    ({ role }) => {
      const key = `circlo:chat-outbox:${role}`;
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(
        key,
        JSON.stringify([{ client_id: 'seed-gagal-1', conversation_id: 'c-ecotextile', text: 'Apakah material masih tersedia?', created_at: new Date().toISOString() }]),
      );
    },
    { role: CHAT_ROLE },
  );
});

After(async function (scenario) {
  if (scenario.result?.status === 'FAILED' && this.page) {
    const dir = path.join('test-results');
    fs.mkdirSync(dir, { recursive: true });
    const label = this.role || 'guest';
    const file = path.join(dir, `${scenario.pickle.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${label}.png`);
    await this.page.screenshot({ path: file, fullPage: true }).catch(() => {});
  }
  await this.context?.close();
});
