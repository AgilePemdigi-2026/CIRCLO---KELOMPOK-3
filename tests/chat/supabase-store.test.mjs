import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseStore } from '../../lib/chat/store.js';
import { createChatService } from '../../lib/chat/service.js';
import { fakeSupabase } from './fake-supabase.mjs';

const B = '11111111-1111-4111-8111-111111111111';
const S = '22222222-2222-4222-8222-222222222222';
const X = '33333333-3333-4333-8333-333333333333';
const buyer = { id: B, role: 'buyer', name: 'Rina' };
const seller = { id: S, role: 'seller', name: 'Toko Kain' };

function setup() {
  const admin = fakeSupabase({
    material: [{ id_material: 7, id_seller: 70, nama_material: 'Sisa Kain Katun Hitam', kategori: 'Tekstil', stok: 20, satuan: 'kg', status_material: true, foto_url: '/x.jpg' }],
    penjual: [{ id_seller: 70, auth_user_id: S, nama_seller: 'Toko Kain' }],
  });
  return { admin, svc: createChatService(createSupabaseStore(admin)) };
}

test('alur lengkap lewat store Supabase: buka chat, kirim, baca, lihat dari sisi Seller', async () => {
  const { svc } = setup();
  const { id } = await svc.openConversation(buyer, { id_material: 7 });
  assert.equal((await svc.openConversation(buyer, { id_material: 7 })).id, id); // tidak membuat duplikat

  await svc.sendMessage(buyer, id, { text: 'Apakah material masih tersedia?', client_id: 'c1' });
  await svc.sendMessage(buyer, id, { text: 'Apakah material masih tersedia?', client_id: 'c1' }); // retry
  await svc.sendMessage(seller, id, { text: 'Masih, silakan dipesan.' });

  const asBuyer = await svc.getRoom(buyer, id);
  assert.deepEqual(asBuyer.messages.map((m) => [m.text, m.mine]), [['Apakah material masih tersedia?', true], ['Masih, silakan dipesan.', false]]);
  assert.equal(asBuyer.conversation.name, 'Toko Kain');
  assert.equal(asBuyer.conversation.material.subtitle, 'Batch 20kg • Tekstil');

  const sellerList = await svc.listConversations(seller);
  assert.equal(sellerList.conversations[0].name, 'Rina');
  assert.equal(sellerList.conversations[0].preview, 'Masih, silakan dipesan.');
});

test('pihak ketiga tidak bisa membaca atau menulis', async () => {
  const { svc } = setup();
  const { id } = await svc.openConversation(buyer, { id_material: 7 });
  const other = { id: X, role: 'buyer', name: 'Lain' };
  await assert.rejects(svc.getRoom(other, id), { status: 403 });
  await assert.rejects(svc.sendMessage(other, id, { text: 'hai' }), { status: 403 });
  assert.equal((await svc.listConversations(other)).conversations.length, 0);
});

test('id bukan UUID diperlakukan sebagai tidak ditemukan, bukan error server', async () => {
  const { svc } = setup();
  await assert.rejects(svc.getRoom(buyer, "x'; drop table"), { status: 404 });
  assert.equal((await svc.listConversations({ id: 'bukan-uuid', role: 'buyer' })).conversations.length, 0);
});

test('seller membuka chat ke buyer; material tanpa seller = 404', async () => {
  const { svc } = setup();
  const r = await svc.openConversation(seller, { buyer_auth_id: B, buyer_name: 'Rina', id_material: 7 });
  assert.ok(r.id);
  await assert.rejects(svc.openConversation(buyer, { id_material: 999 }), { status: 404 });
});

test('kolom foto_url belum ada di tabel material: tetap jalan tanpa foto', async () => {
  const admin = fakeSupabase({
    material: [{ id_material: 7, id_seller: 70, nama_material: 'Sisa Kain Katun Hitam', kategori: 'Tekstil', stok: 20, satuan: 'kg', status_material: true }],
    penjual: [{ id_seller: 70, auth_user_id: S, nama_seller: 'Toko Kain' }],
  }, { missingColumns: { material: ['foto_url'] } });
  const svc = createChatService(createSupabaseStore(admin));
  const { id } = await svc.openConversation(buyer, { id_material: 7 });
  const room = await svc.getRoom(buyer, id);
  assert.equal(room.conversation.material.nama, 'Sisa Kain Katun Hitam');
  assert.equal(room.conversation.material.foto_url, null);
});
