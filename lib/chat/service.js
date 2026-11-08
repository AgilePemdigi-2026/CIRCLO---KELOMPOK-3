// Logika bisnis Chat Buyer-Seller (SRS 4.10, REQ-68 s.d. REQ-75). Tidak bergantung pada HTTP.
import { ChatError } from './errors.js';
import { materialAvailable, materialSubtitle, previewText } from './format.js';

export const MAX_MESSAGE_LENGTH = 1000;

function isParticipant(actor, row) {
  return row.buyer_id === actor.id || row.seller_id === actor.id;
}

function counterpartOf(actor, row) {
  const isBuyer = row.buyer_id === actor.id;
  return {
    id: isBuyer ? row.seller_id : row.buyer_id,
    name: (isBuyer ? row.seller_name : row.buyer_name) || 'Pengguna CIRCLO',
    role: isBuyer ? 'seller' : 'buyer',
    avatar_url: (isBuyer ? row.seller_avatar : row.buyer_avatar) || null,
  };
}

export function createChatService(store) {
  async function load(actor, id) {
    const row = await store.getConversation(id);
    if (!row) throw new ChatError(404, 'Percakapan tidak ditemukan.');
    if (!isParticipant(actor, row)) throw new ChatError(403, 'Kamu tidak punya akses ke percakapan ini.');
    return row;
  }

  function summary(actor, row) {
    const other = counterpartOf(actor, row);
    return {
      id: row.id,
      name: other.name,
      counterpart_role: other.role,
      avatar_url: other.avatar_url,
      preview: previewText(row.last_text),
      last_at: row.last_at,
      id_material: row.id_material ?? null,
    };
  }

  async function materialCard(id) {
    if (id == null) return null;
    const m = await store.getMaterial(id);
    if (!m) return null;
    return {
      id: m.id_material,
      nama: m.nama_material,
      subtitle: materialSubtitle(m),
      available: materialAvailable(m),
      foto_url: m.foto_url || null,
      href: `/katalog/${m.id_material}`,
    };
  }

  const viewMessage = (actor, m) => ({
    id: m.id,
    text: m.text,
    mine: m.sender_id === actor.id,
    sender_role: m.sender_role,
    created_at: m.created_at,
    client_id: m.client_id || null,
    // false = 1 centang (terkirim), true = 2 centang (diterima aplikasi lawan bicara).
    delivered: Boolean(m.delivered_at),
  });

  // Gagal menandai tidak boleh menghalangi chat: centang tetap 1 sampai penandaan berhasil.
  async function markDelivered(actor, conversationIds) {
    try {
      await store.markDelivered(actor.id, conversationIds);
    } catch (e) {
      console.error('[chat] gagal menandai pesan diterima:', e?.message || e);
    }
  }

  return {
    // REQ-69: daftar percakapan milik pengguna.
    async listConversations(actor) {
      const rows = await store.listConversations(actor.id);
      await markDelivered(actor, rows.map((r) => r.id)); // aplikasi penerima terbuka = pesan masuk sudah diterima
      return { role: actor.role, conversations: rows.map((r) => summary(actor, r)) };
    },

    // REQ-70: ruang percakapan + riwayat pesan.
    async getRoom(actor, id) {
      const row = await load(actor, id);
      await markDelivered(actor, [row.id]);
      const [messages, material] = await Promise.all([store.listMessages(row.id), materialCard(row.id_material)]);
      return { conversation: { ...summary(actor, row), material }, messages: messages.map((m) => viewMessage(actor, m)) };
    },

    // REQ-71 s.d. REQ-73: kirim dan simpan pesan.
    async sendMessage(actor, id, body = {}) {
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text) throw new ChatError(400, 'Pesan tidak boleh kosong.');
      if (text.length > MAX_MESSAGE_LENGTH) throw new ChatError(400, `Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.`);
      const clientId = typeof body.client_id === 'string' && body.client_id.length <= 100 ? body.client_id : null;
      const row = await load(actor, id);
      const saved = await store.addMessage(row.id, { sender_id: actor.id, sender_role: actor.role, text, client_id: clientId });
      return { message: viewMessage(actor, saved) };
    },

    // Mulai/buka percakapan, misalnya dari tombol "Hubungi Seller" / "Hubungi Pembeli".
    async openConversation(actor, body = {}) {
      if (actor.role === 'buyer') {
        const idMaterial = body.id_material;
        if (idMaterial == null || idMaterial === '') throw new ChatError(400, 'Material yang ingin dibahas belum dipilih.');
        const seller = await store.getSellerOfMaterial(idMaterial);
        if (!seller) throw new ChatError(404, 'Seller untuk material ini tidak ditemukan.');
        if (!seller.auth_user_id) throw new ChatError(409, 'Seller material ini belum punya akun login yang terhubung, jadi chat belum bisa dibuka. Hubungkan kolom auth_user_id di tabel penjual dengan akun seller.');
        if (seller.auth_user_id === actor.id) throw new ChatError(400, 'Kamu tidak bisa mengirim chat ke dirimu sendiri.');
        const row = await store.findOrCreateConversation({
          buyer_id: actor.id, buyer_name: actor.name,
          seller_id: seller.auth_user_id, seller_name: seller.nama,
          id_material: Number(idMaterial),
        });
        return { id: row.id };
      }
      let buyerId = body.buyer_auth_id;
      let buyerName = body.buyer_name;
      if (!buyerId && body.id_buyer != null && body.id_buyer !== '') {
        const buyer = await store.getBuyer(body.id_buyer);
        if (!buyer) throw new ChatError(404, 'Pembeli tidak ditemukan atau belum punya akun.');
        buyerId = buyer.auth_user_id;
        buyerName = buyer.nama;
      }
      if (!buyerId || typeof buyerId !== 'string') throw new ChatError(400, 'Pembeli yang ingin dihubungi belum dipilih.');
      if (buyerId === actor.id) throw new ChatError(400, 'Kamu tidak bisa mengirim chat ke dirimu sendiri.');
      const row = await store.findOrCreateConversation({
        buyer_id: buyerId, buyer_name: String(buyerName || 'Pembeli CIRCLO').slice(0, 120),
        seller_id: actor.id, seller_name: actor.name,
        id_material: body.id_material == null || body.id_material === '' ? null : Number(body.id_material),
      });
      return { id: row.id };
    },
  };
}
