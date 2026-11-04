// Menjalankan BDD Chat untuk role Buyer dan Seller.
//   node scripts/run-chat-bdd.js                 -> menyalakan server demo sendiri (port 3100)
//   BASE_URL=http://localhost:3000 node scripts/run-chat-bdd.js   -> memakai server yang sudah hidup (harus CHAT_DEMO=1)
const { spawn, spawnSync } = require('node:child_process');

const roles = (process.argv[2] || 'buyer,seller').split(',');
const external = Boolean(process.env.BASE_URL);
const port = process.env.PORT || '3100';
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
let server;

async function ready(timeoutMs = 180000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const ok = await fetch(`${baseUrl}/api/percakapan/reset`, { method: 'POST' }).then((r) => r.ok).catch(() => false);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server ${baseUrl} tidak siap dalam ${timeoutMs / 1000} detik`);
}

(async () => {
  let failed = false;
  try {
    if (!external) {
      const next = require.resolve('next/dist/bin/next');
      server = spawn(process.execPath, [next, 'dev', '-p', port], { stdio: 'ignore', env: { ...process.env, CHAT_DEMO: '1' } });
    }
    await ready();
    for (const role of roles) {
      console.log(`\n=== BDD Chat sebagai ${role.toUpperCase()} ===`);
      const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['cucumber-js'], {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: { ...process.env, CHAT_ROLE: role, BASE_URL: baseUrl },
      });
      if (r.status !== 0) failed = true;
    }
  } catch (e) {
    console.error(e.message);
    failed = true;
  } finally {
    server?.kill();
  }
  process.exit(failed ? 1 : 0);
})();
