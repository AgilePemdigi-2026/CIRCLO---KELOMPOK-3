import { chatMode, resetDemoStore } from '../../../../lib/chat/http.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Khusus pengujian: mengembalikan data demo ke kondisi awal. Hanya hidup di mode demo.
export async function POST() {
  if (chatMode() !== 'demo') return Response.json({ error: 'Tidak ditemukan.' }, { status: 404 });
  resetDemoStore();
  return Response.json({ ok: true });
}
