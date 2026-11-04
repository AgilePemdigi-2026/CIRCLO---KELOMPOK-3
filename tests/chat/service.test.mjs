import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatService, MAX_MESSAGE_LENGTH } from '../../lib/chat/service.js';
import { createMemoryStore } from '../../lib/chat/store.js';
import { DEMO_USERS } from '../../lib/chat/demo-data.js';

const buyer = DEMO_USERS.buyer;
const seller = DEMO_USERS.seller;
const setup = () => createChatService(createMemoryStore());
const code = async (p) => p.then(() => null, (e) => e.status);

test('daftar percakapan Buyer terurut dari yang terbaru dan berisi pratinjau', async () => {
  const { conversations } = await setup().listConversations(buyer);
  assert.deepEqual(conversations.map((c) => c.name), ['EcoTextile Hub Surabaya', 'Eco Build Supplies', 'Siti Rahma']);
  assert.equal(conversations[0].preview, 'Saya akan memeriksa gudang untuk tambahan Sisa Kain.');
});

test('Seller hanya melihat percakapan miliknya, nama lawan bicara = Buyer', async () => {
  const { conversations } = await setup().listConversations(seller);
  assert.equal(conversations.length, 1);
  assert.equal(conversations[0].name, 'Pembeli Demo');
  assert.equal(conversations[0].counterpart_role, 'buyer');
});

test('ruang percakapan memuat riwayat, penanda mine, dan kartu material', async () => {
  const { conversation, messages } = await setup().getRoom(buyer, 'c-ecotextile');
  assert.equal(messages.length, 4);
  assert.deepEqual(messages.map((m) => m.mine), [false, true, false, false]);
  assert.equal(conversation.material.nama, 'Sisa Kain Katun Hitam');
  assert.equal(conversation.material.subtitle, 'Batch 20kg • Sisa Industri');
  assert.equal(conversation.material.available, true);
  assert.equal(conversation.material.href, '/katalog/1');
});

test('percakapan tanpa material tidak punya kartu material', async () => {
  const { conversation } = await setup().getRoom(buyer, 'c-siti');
  assert.equal(conversation.material, null);
});

test('kirim pesan: tersimpan, tampil di riwayat, dan memperbarui pratinjau', async () => {
  const svc = setup();
  const { message } = await svc.sendMessage(buyer, 'c-siti', { text: '  Apakah material masih tersedia?  ', client_id: 'k1' });
  assert.equal(message.text, 'Apakah material masih tersedia?');
  assert.equal(message.mine, true);
  const room = await svc.getRoom(buyer, 'c-siti');
  assert.equal(room.messages.at(-1).text, 'Apakah material masih tersedia?');
  const list = await svc.listConversations(buyer);
  assert.equal(list.conversations[0].name, 'Siti Rahma'); // naik ke paling atas
  const asSeller = await svc.getRoom({ ...seller, id: 'demo-seller-3' }, 'c-siti');
  assert.equal(asSeller.messages.at(-1).mine, false);
});

test('retry dengan client_id sama tidak menggandakan pesan', async () => {
  const svc = setup();
  await svc.sendMessage(buyer, 'c-siti', { text: 'Halo', client_id: 'sama' });
  await svc.sendMessage(buyer, 'c-siti', { text: 'Halo', client_id: 'sama' });
  const { messages } = await svc.getRoom(buyer, 'c-siti');
  assert.equal(messages.filter((m) => m.text === 'Halo').length, 1);
});

test('validasi pesan: kosong, spasi saja, terlalu panjang', async () => {
  const svc = setup();
  assert.equal(await code(svc.sendMessage(buyer, 'c-siti', { text: '' })), 400);
  assert.equal(await code(svc.sendMessage(buyer, 'c-siti', { text: '   ' })), 400);
  assert.equal(await code(svc.sendMessage(buyer, 'c-siti', {})), 400);
  assert.equal(await code(svc.sendMessage(buyer, 'c-siti', { text: 'x'.repeat(MAX_MESSAGE_LENGTH + 1) })), 400);
  assert.equal(await code(svc.sendMessage(buyer, 'c-siti', { text: 'x'.repeat(MAX_MESSAGE_LENGTH) })), null);
});

test('akses: bukan peserta ditolak, percakapan tak ada = 404', async () => {
  const svc = setup();
  assert.equal(await code(svc.getRoom(seller, 'c-siti')), 403);
  assert.equal(await code(svc.sendMessage(seller, 'c-siti', { text: 'hai' })), 403);
  assert.equal(await code(svc.getRoom(buyer, 'tidak-ada')), 404);
});

test('Buyer membuka chat dari material: percakapan dibuat sekali lalu dipakai ulang', async () => {
  const svc = setup();
  const a = await svc.openConversation(buyer, { id_material: 1 });
  assert.equal(a.id, 'c-ecotextile'); // sudah ada, dipakai ulang
  const before = (await svc.listConversations(buyer)).conversations.length;
  const x = await svc.openConversation({ ...buyer, id: 'buyer-baru', name: 'Buyer Baru' }, { id_material: 2 });
  const y = await svc.openConversation({ ...buyer, id: 'buyer-baru', name: 'Buyer Baru' }, { id_material: 2 });
  assert.equal(x.id, y.id);
  assert.equal((await svc.listConversations(buyer)).conversations.length, before);
  const room = await svc.getRoom({ ...buyer, id: 'buyer-baru' }, x.id);
  assert.equal(room.conversation.name, 'Eco Build Supplies');
  assert.equal(room.messages.length, 0);
});

test('openConversation: validasi input', async () => {
  const svc = setup();
  assert.equal(await code(svc.openConversation(buyer, {})), 400);
  assert.equal(await code(svc.openConversation(buyer, { id_material: 999 })), 404);
  assert.equal(await code(svc.openConversation(seller, {})), 400);
  assert.equal(await code(svc.openConversation({ ...buyer, id: 'demo-seller' }, { id_material: 1 })), 400); // chat ke diri sendiri
  const r = await svc.openConversation(seller, { buyer_auth_id: 'buyer-x', buyer_name: 'Rina' });
  assert.ok(r.id);
});
