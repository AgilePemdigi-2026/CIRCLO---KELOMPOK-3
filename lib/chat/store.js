// Penyimpanan data chat. Dua implementasi dengan antarmuka yang sama:
//  - createMemoryStore   : mode demo / pengujian (data di memori server)
//  - createSupabaseStore : produksi (tabel percakapan, pesan_chat, material, penjual)
import { ChatError } from './errors.js';
import { DEMO_MATERIALS, DEMO_SELLERS, DEMO_USERS, demoSeed } from './demo-data.js';

const newId = () => globalThis.crypto.randomUUID();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ---------------------------- memori (demo) ---------------------------- */

export function createMemoryStore({ now = new Date(), seed = true } = {}) {
  const data = seed ? demoSeed(now) : { conversations: [], messages: [] };
  const conversations = data.conversations.map((c) => ({ ...c }));
  const messages = data.messages.map((m) => ({ ...m }));
  const touch = (c) => {
    const last = messages.filter((m) => m.id_percakapan === c.id).sort((a, b) => a.created_at.localeCompare(b.created_at)).pop();
    c.last_text = last?.text || '';
    c.last_at = last?.created_at || c.created_at || new Date().toISOString();
  };
  conversations.forEach(touch);

  return {
    async listConversations(userId) {
      return conversations
        .filter((c) => c.buyer_id === userId || c.seller_id === userId)
        .sort((a, b) => b.last_at.localeCompare(a.last_at))
        .map((c) => ({ ...c }));
    },
    async getConversation(id) {
      const c = conversations.find((x) => x.id === id);
      return c ? { ...c } : null;
    },
    async findOrCreateConversation({ buyer_id, buyer_name, seller_id, seller_name, id_material = null }) {
      let c = conversations.find((x) => x.buyer_id === buyer_id && x.seller_id === seller_id && (x.id_material ?? null) === id_material);
      if (!c) {
        c = { id: newId(), buyer_id, buyer_name, seller_id, seller_name, id_material, last_text: '', last_at: new Date().toISOString(), created_at: new Date().toISOString() };
        conversations.push(c);
      }
      return { ...c };
    },
    async listMessages(conversationId) {
      return messages
        .filter((m) => m.id_percakapan === conversationId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((m) => ({ ...m }));
    },
    async addMessage(conversationId, { sender_id, sender_role, text, client_id = null }) {
      if (client_id) {
        const dup = messages.find((m) => m.id_percakapan === conversationId && m.client_id === client_id);
        if (dup) return { ...dup };
      }
      const msg = { id: newId(), id_percakapan: conversationId, sender_id, sender_role, text, client_id, created_at: new Date().toISOString(), delivered_at: null, read_at: null };
      messages.push(msg);
      touch(conversations.find((c) => c.id === conversationId));
      return { ...msg };
    },
    // Pesan dari lawan bicara di percakapan ini dianggap diterima begitu aplikasi pengguna memuatnya.
    async markDelivered(userId, conversationIds) {
      const stamp = new Date().toISOString();
      for (const m of messages) {
        if (m.sender_id !== userId && !m.delivered_at && conversationIds.includes(m.id_percakapan)) m.delivered_at = stamp;
      }
    },
    // Pesan lawan bicara dianggap dibaca saat ruang percakapan terbuka di layar pengguna.
    async markRead(userId, conversationId) {
      const stamp = new Date().toISOString();
      for (const m of messages) {
        if (m.sender_id !== userId && !m.read_at && m.id_percakapan === conversationId) {
          m.read_at = stamp;
          m.delivered_at ||= stamp;
        }
      }
    },
    async getMaterial(id) {
      const m = DEMO_MATERIALS.find((x) => String(x.id_material) === String(id));
      return m ? { ...m } : null;
    },
    async getBuyer() {
      return { auth_user_id: DEMO_USERS.buyer.id, nama: DEMO_USERS.buyer.name };
    },
    async getSellerOfMaterial(id) {
      const m = DEMO_MATERIALS.find((x) => String(x.id_material) === String(id));
      return m ? DEMO_SELLERS[m.id_seller] || null : null;
    },
  };
}

/* ------------------------------- Supabase ------------------------------ */

const isMissingColumn = (e) =>
  e?.code === 'PGRST204' || e?.code === '42703' || /Could not find the '.*' column|column .* does not exist/i.test(e?.message || '');

const mapConv = (r) => ({
  id: r.id,
  buyer_id: r.buyer_auth_id,
  buyer_name: r.buyer_name,
  seller_id: r.seller_auth_id,
  seller_name: r.seller_name,
  id_material: r.id_material ?? null,
  last_text: r.terakhir_pesan || '',
  last_at: r.terakhir_pesan_at,
  created_at: r.dibuat_pada,
});

const mapMsg = (r) => ({
  id: r.id,
  id_percakapan: r.id_percakapan,
  sender_id: r.pengirim_id,
  sender_role: r.pengirim_role,
  text: r.isi,
  client_id: r.client_id || null,
  created_at: r.dibuat_pada,
  delivered_at: r.diterima_pada || null,
  read_at: r.dibaca_pada || null,
});

function must({ data, error }, what) {
  if (error) throw new Error(`Gagal ${what}: ${error.message}`);
  return data;
}

export function createSupabaseStore(admin) {
  return {
    async listConversations(userId) {
      if (!UUID_RE.test(userId)) return [];
      const rows = must(
        await admin.from('percakapan').select('*').or(`buyer_auth_id.eq.${userId},seller_auth_id.eq.${userId}`).order('terakhir_pesan_at', { ascending: false }),
        'membaca daftar percakapan',
      );
      return (rows || []).map(mapConv);
    },
    async getConversation(id) {
      if (!UUID_RE.test(String(id))) return null;
      const row = must(await admin.from('percakapan').select('*').eq('id', id).maybeSingle(), 'membaca percakapan');
      return row ? mapConv(row) : null;
    },
    async findOrCreateConversation({ buyer_id, buyer_name, seller_id, seller_name, id_material = null }) {
      const find = async () => {
        let q = admin.from('percakapan').select('*').eq('buyer_auth_id', buyer_id).eq('seller_auth_id', seller_id);
        q = id_material == null ? q.is('id_material', null) : q.eq('id_material', id_material);
        return must(await q.maybeSingle(), 'mencari percakapan');
      };
      const found = await find();
      if (found) return mapConv(found);
      const res = await admin
        .from('percakapan')
        .insert({ buyer_auth_id: buyer_id, seller_auth_id: seller_id, buyer_name, seller_name, id_material })
        .select('*')
        .single();
      if (res.error?.code === '23505') return mapConv(await find()); // dibuat bersamaan oleh pihak lain
      return mapConv(must(res, 'membuat percakapan'));
    },
    async listMessages(conversationId) {
      const rows = must(
        await admin.from('pesan_chat').select('*').eq('id_percakapan', conversationId).order('dibuat_pada', { ascending: true }).limit(500),
        'membaca riwayat pesan',
      );
      return (rows || []).map(mapMsg);
    },
    async addMessage(conversationId, { sender_id, sender_role, text, client_id = null }) {
      if (client_id) {
        const dup = must(
          await admin.from('pesan_chat').select('*').eq('id_percakapan', conversationId).eq('client_id', client_id).maybeSingle(),
          'memeriksa pesan',
        );
        if (dup) return mapMsg(dup);
      }
      const row = must(
        await admin.from('pesan_chat').insert({ id_percakapan: conversationId, pengirim_id: sender_id, pengirim_role: sender_role, isi: text, client_id }).select('*').single(),
        'menyimpan pesan',
      );
      must(await admin.from('percakapan').update({ terakhir_pesan: text, terakhir_pesan_at: row.dibuat_pada }).eq('id', conversationId), 'memperbarui percakapan');
      return mapMsg(row);
    },
    async markDelivered(userId, conversationIds) {
      const ids = (conversationIds || []).filter((id) => UUID_RE.test(String(id)));
      if (!ids.length || !UUID_RE.test(String(userId))) return;
      must(
        await admin.from('pesan_chat').update({ diterima_pada: new Date().toISOString() }).in('id_percakapan', ids).neq('pengirim_id', userId).is('diterima_pada', null),
        'menandai pesan diterima',
      );
    },
    async markRead(userId, conversationId) {
      if (!UUID_RE.test(String(conversationId)) || !UUID_RE.test(String(userId))) return;
      must(
        await admin.from('pesan_chat').update({ dibaca_pada: new Date().toISOString() }).eq('id_percakapan', conversationId).neq('pengirim_id', userId).is('dibaca_pada', null),
        'menandai pesan dibaca',
      );
    },
    async getMaterial(id) {
      const n = Number(id);
      if (!Number.isInteger(n)) return null;
      const base = 'id_material,id_seller,nama_material,kategori,stok,satuan,status_material';
      let res = await admin.from('material').select(`${base},foto_url`).eq('id_material', n).maybeSingle();
      if (res.error && isMissingColumn(res.error)) res = await admin.from('material').select(base).eq('id_material', n).maybeSingle();
      return must(res, 'membaca material');
    },
    async getBuyer(id) {
      const key = /^\d+$/.test(String(id)) ? Number(id) : String(id);
      const row = must(await admin.from('pembeli').select('auth_user_id,nama_buyer').eq('id_buyer', key).maybeSingle(), 'membaca pembeli');
      return row?.auth_user_id ? { auth_user_id: row.auth_user_id, nama: row.nama_buyer || 'Pembeli CIRCLO' } : null;
    },
    async getSellerOfMaterial(id) {
      const m = await this.getMaterial(id);
      if (!m) return null;
      const s = must(await admin.from('penjual').select('auth_user_id,nama_seller').eq('id_seller', m.id_seller).maybeSingle(), 'membaca penjual');
      return s ? { auth_user_id: s.auth_user_id || null, nama: s.nama_seller || 'Penjual CIRCLO' } : null;
    },
  };
}

export { ChatError };
