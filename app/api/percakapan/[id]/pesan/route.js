import { handle, readJson } from '../../../../../lib/chat/http.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET  /api/percakapan/:id/pesan -> ruang percakapan + riwayat pesan
//      ?read=1 -> pesan lawan bicara ditandai dibaca (dikirim klien hanya saat ruang percakapan terlihat di layar)
export async function GET(request, { params }) {
  const { id } = await params;
  const read = new URL(request.url).searchParams.get('read') === '1';
  return handle(request, (service, actor) => service.getRoom(actor, id, { read }));
}

// POST /api/percakapan/:id/pesan -> kirim pesan { text, client_id }
export async function POST(request, { params }) {
  const { id } = await params;
  return handle(request, async (service, actor) => service.sendMessage(actor, id, await readJson(request)), { status: 201 });
}
