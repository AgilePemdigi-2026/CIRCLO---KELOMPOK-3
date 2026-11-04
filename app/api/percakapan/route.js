import { handle, readJson } from '../../../lib/chat/http.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET  /api/percakapan  -> daftar percakapan milik pengguna login
export async function GET(request) {
  return handle(request, (service, actor) => service.listConversations(actor));
}

// POST /api/percakapan  -> mulai / buka percakapan (Buyer: { id_material }, Seller: { buyer_auth_id, buyer_name })
export async function POST(request) {
  return handle(request, async (service, actor) => service.openConversation(actor, await readJson(request)));
}
