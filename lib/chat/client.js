'use client';

// Pembungkus fetch ke API chat + "outbox" (pesan yang gagal dikirim disimpan di perangkat
// supaya tombol "Coba Lagi" tetap ada walau halaman dimuat ulang).
import { getAccessToken } from '../auth';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Batas tunggu kirim pesan. Di jaringan yang sangat lambat, pesan ditandai gagal (muncul "Coba Lagi")
// daripada menggantung di "Mengirim…". Coba Lagi aman karena server memakai client_id yang sama.
export const SEND_TIMEOUT_MS = 15000;

async function request(path, { method = 'GET', body, role, timeout } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getAccessToken().catch(() => null);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (role) headers['x-demo-role'] = role; // hanya dibaca server saat mode demo
  const controller = timeout ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
  try {
    const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: controller?.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.error || 'Permintaan gagal diproses.');
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Koneksi terlalu lambat. Pesan belum terkirim.');
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const fetchConversations = (role) => request('/api/percakapan', { role });
export const fetchRoom = (id, role, { read = false } = {}) => request(`/api/percakapan/${encodeURIComponent(id)}/pesan${read ? '?read=1' : ''}`, { role });
export const postMessage = (id, payload, role) => request(`/api/percakapan/${encodeURIComponent(id)}/pesan`, { method: 'POST', body: payload, role, timeout: SEND_TIMEOUT_MS });
export const openConversation = (payload, role) => request('/api/percakapan', { method: 'POST', body: payload, role });

export const newClientId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const outboxKey = (role) => `circlo:chat-outbox:${role}`;

export function loadOutbox(role) {
  try {
    const v = JSON.parse(localStorage.getItem(outboxKey(role)) || '[]');
    return Array.isArray(v) ? v.filter((i) => i && i.client_id && i.conversation_id && i.text) : [];
  } catch {
    return [];
  }
}

export function saveOutbox(role, items) {
  try {
    localStorage.setItem(outboxKey(role), JSON.stringify(items));
  } catch {
    // penyimpanan penuh / diblokir: pesan gagal tetap tampil selama halaman terbuka
  }
}
