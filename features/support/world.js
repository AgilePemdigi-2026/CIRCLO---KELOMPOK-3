const fs = require('node:fs');
const path = require('node:path');
const { setWorldConstructor, Before, After, BeforeAll, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('@playwright/test');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ROLE = (process.env.CHAT_ROLE || 'buyer').toLowerCase();
if (!['buyer', 'seller'].includes(ROLE)) throw new Error('CHAT_ROLE harus buyer atau seller.');

setDefaultTimeout(30 * 1000);

let browser;
BeforeAll(async function () {
  browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
});
AfterAll(async function () {
  await browser?.close();
});

class ChatWorld {
  constructor() {
    this.role = ROLE;
    this.baseUrl = BASE_URL;
  }
}
setWorldConstructor(ChatWorld);

// Kondisi awal setiap skenario: data demo dikembalikan, browser baru, role diset lewat dev-role.
Before(async function () {
  const res = await fetch(`${BASE_URL}/api/percakapan/reset`, { method: 'POST' }).catch(() => null);
  if (!res || !res.ok) {
    throw new Error(`Server di ${BASE_URL} belum siap atau tidak berjalan dengan CHAT_DEMO=1. Jalankan: npm run dev:chat-demo`);
  }
  this.context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await this.context.addInitScript((role) => window.localStorage.setItem('circlo:dev-role', role), ROLE);
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
    { role: ROLE },
  );
});

After(async function (scenario) {
  if (scenario.result?.status === 'FAILED' && this.page) {
    const dir = path.join('test-results');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${scenario.pickle.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${ROLE}.png`);
    await this.page.screenshot({ path: file, fullPage: true }).catch(() => {});
  }
  await this.context?.close();
});
