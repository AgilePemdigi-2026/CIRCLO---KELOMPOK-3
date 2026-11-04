// Uji route handler asli (app/api/percakapan/*) dalam mode demo, memakai Request/Response standar.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.CHAT_DEMO = '1';
const list = await import('../../app/api/percakapan/route.js');
const room = await import('../../app/api/percakapan/[id]/pesan/route.js');
const reset = await import('../../app/api/percakapan/reset/route.js');

const req = (path, { role = 'buyer', method = 'GET', body } = {}) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(role ? { 'x-demo-role': role } : {}) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
const ctx = (id) => ({ params: Promise.resolve({ id }) });

beforeEach(async () => { await reset.POST(); });

test('GET /api/percakapan tanpa sesi = 401', async () => {
  const res = await list.GET(req('/api/percakapan', { role: null }));
  assert.equal(res.status, 401);
});

test('GET /api/percakapan untuk Buyer dan Seller', async () => {
  const b = await (await list.GET(req('/api/percakapan'))).json();
  assert.equal(b.conversations.length, 3);
  const s = await (await list.GET(req('/api/percakapan', { role: 'seller' }))).json();
  assert.equal(s.conversations.length, 1);
});

test('GET riwayat pesan', async () => {
  const res = await room.GET(req('/api/percakapan/c-ecotextile/pesan'), ctx('c-ecotextile'));
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.messages.length, 4);
  assert.equal(json.conversation.material.nama, 'Sisa Kain Katun Hitam');
});

test('POST pesan = 201 dan muncul di riwayat', async () => {
  const res = await room.POST(req('/api/percakapan/c-siti/pesan', { method: 'POST', body: { text: 'Terima kasih informasinya', client_id: 'a1' } }), ctx('c-siti'));
  assert.equal(res.status, 201);
  assert.equal((await res.json()).message.text, 'Terima kasih informasinya');
  const after = await (await room.GET(req('/api/percakapan/c-siti/pesan'), ctx('c-siti'))).json();
  assert.equal(after.messages.at(-1).text, 'Terima kasih informasinya');
});

test('POST pesan kosong = 400, body rusak = 400, bukan peserta = 403, tak ada = 404', async () => {
  const bad = (body, role = 'buyer', id = 'c-siti') => room.POST(req(`/api/percakapan/${id}/pesan`, { method: 'POST', body, role }), ctx(id));
  assert.equal((await bad({ text: '   ' })).status, 400);
  assert.equal((await bad('{bukan json')).status, 400);
  assert.equal((await bad({ text: 'hai' }, 'seller')).status, 403);
  assert.equal((await bad({ text: 'hai' }, 'buyer', 'xx')).status, 404);
});

test('POST /api/percakapan membuka chat dari material', async () => {
  const res = await list.POST(req('/api/percakapan', { method: 'POST', body: { id_material: 2 } }));
  assert.equal(res.status, 200); // "buka atau buat": 200 untuk keduanya
  assert.ok((await res.json()).id);
  assert.equal((await list.POST(req('/api/percakapan', { method: 'POST', body: {} }))).status, 400);
});

test('reset mengembalikan data awal', async () => {
  await room.POST(req('/api/percakapan/c-siti/pesan', { method: 'POST', body: { text: 'sementara' } }), ctx('c-siti'));
  await reset.POST();
  const after = await (await room.GET(req('/api/percakapan/c-siti/pesan'), ctx('c-siti'))).json();
  assert.equal(after.messages.length, 1);
});
