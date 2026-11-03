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

async function request(path, { method = 'GET', body, role } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getAccessToken().catch(() => null);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (role) headers['x-demo-role'] = role; // hanya dibaca server saat mode demo
  const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Permintaan gagal diproses.');
  return data;
}

export const fetchConversations = (role) => request('/api/percakapan', { role });
export const fetchRoom = (id, role) => request(`/api/percakapan/${encodeURIComponent(id)}/pesan`, { role });
export const postMessage = (id, payload, role) => request(`/api/percakapan/${encodeURIComponent(id)}/pesan`, { method: 'POST', body: payload, role });
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
