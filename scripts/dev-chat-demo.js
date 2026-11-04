// Menjalankan "next dev" dengan data chat demo (tanpa Supabase). Dipakai untuk menjalankan BDD secara manual.
const { spawn } = require('node:child_process');

const next = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [next, 'dev', '-p', process.env.PORT || '3000'], {
  stdio: 'inherit',
  env: { ...process.env, CHAT_DEMO: '1' },
});
child.on('exit', (code) => process.exit(code ?? 0));
