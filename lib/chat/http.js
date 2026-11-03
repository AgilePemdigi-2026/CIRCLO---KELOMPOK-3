// Penghubung antara route handler Next.js dan service chat: pilih mode, cek sesi, tangani error.
import { createClient } from '@supabase/supabase-js';
import { ChatError } from './errors.js';
import { createChatService } from './service.js';
import { createMemoryStore, createSupabaseStore } from './store.js';
import { DEMO_USERS } from './demo-data.js';
import { roleFromUser } from '../roles.js';

const isProd = () => process.env.NODE_ENV === 'production';

function supabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

// 'demo'         : data di memori server (CHAT_DEMO=1, atau Supabase belum diisi saat development)
// 'supabase'     : data sungguhan
// 'unconfigured' : production tanpa Supabase
export function chatMode() {
  if (!isProd() && process.env.CHAT_DEMO === '1') return 'demo';
  if (supabaseEnv()) return 'supabase';
  return isProd() ? 'unconfigured' : 'demo';
}

export function getDemoStore() {
  globalThis.__circloChatDemoStore ||= createMemoryStore();
  return globalThis.__circloChatDemoStore;
}

export function resetDemoStore() {
  globalThis.__circloChatDemoStore = createMemoryStore();
}

async function resolveActor(request, mode, admin) {
  if (mode === 'demo') {
    const role = (request.headers.get('x-demo-role') || '').toLowerCase();
    if (!DEMO_USERS[role]) throw new ChatError(401, 'Tidak ada sesi login.');
    return { ...DEMO_USERS[role] };
  }
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new ChatError(401, 'Tidak ada sesi login.');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new ChatError(401, 'Sesi login tidak valid.');
  const user = data.user;
  const role = roleFromUser(user);
  if (role !== 'buyer' && role !== 'seller') throw new ChatError(403, 'Chat hanya tersedia untuk Buyer dan Seller.');
  const meta = user.user_metadata || {};
  return { id: user.id, role, name: meta.nama || meta.full_name || meta.name || user.email || 'Pengguna CIRCLO' };
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new ChatError(400, 'Body permintaan tidak valid.');
  }
}

export async function handle(request, fn, { status = 200 } = {}) {
  try {
    const mode = chatMode();
    if (mode === 'unconfigured') throw new ChatError(503, 'Layanan chat belum dikonfigurasi.');
    let admin = null;
    if (mode === 'supabase') {
      const { url, key } = supabaseEnv();
      admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    }
    const actor = await resolveActor(request, mode, admin);
    const service = createChatService(mode === 'demo' ? getDemoStore() : createSupabaseStore(admin));
    return Response.json(await fn(service, actor), { status });
  } catch (e) {
    if (e instanceof ChatError) return Response.json({ error: e.message }, { status: e.status });
    console.error('[chat]', e);
    return Response.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
