// Menjalankan seluruh BDD CIRCLO.
//   npm run test:bdd                       -> menyalakan server BDD sendiri (port 3100)
//   BASE_URL=http://localhost:3000 npm run test:bdd -> memakai server yang sudah hidup
// Server wajib berjalan dengan CHAT_DEMO=1, BDD_DEMO=1, NEXT_PUBLIC_BDD_DEMO=1.
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const external = Boolean(process.env.BASE_URL);
const port = process.env.PORT || '3100';
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
const cucumberPackage = require.resolve('@cucumber/cucumber/package.json');
const cucumberBin = path.join(path.dirname(cucumberPackage), 'bin', 'cucumber.js');
let server;

async function ready(timeoutMs = 180000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const ok = await fetch(`${baseUrl}/api/percakapan/reset`, { method: 'POST' })
      .then((response) => response.ok)
      .catch(() => false);
    if (ok) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server ${baseUrl} tidak siap dalam ${timeoutMs / 1000} detik`);
}

function runCucumber(args, extraEnv) {
  return spawnSync(process.execPath, [cucumberBin, ...args], {
    stdio: 'inherit',
    env: { ...process.env, BASE_URL: baseUrl, ...extraEnv },
  });
}

(async () => {
  let failed = false;

  try {
    if (!external) {
      const nextBin = require.resolve('next/dist/bin/next');
      server = spawn(process.execPath, [nextBin, 'dev', '-p', port], {
        stdio: 'ignore',
        env: {
          ...process.env,
          CHAT_DEMO: '1',
          BDD_DEMO: '1',
          NEXT_PUBLIC_BDD_DEMO: '1',
        },
      });
    }

    await ready();

    console.log('\n=== BDD CIRCLO: alur utama ===');
    if (runCucumber(['--tags', 'not @chat']).status !== 0) failed = true;

    for (const role of ['buyer', 'seller']) {
      console.log(`\n=== BDD Chat sebagai ${role.toUpperCase()} ===`);
      if (runCucumber(['--tags', '@chat'], { CHAT_ROLE: role }).status !== 0) failed = true;
    }
  } catch (error) {
    console.error(error.message);
    failed = true;
  } finally {
    server?.kill();
  }

  process.exit(failed ? 1 : 0);
})();
