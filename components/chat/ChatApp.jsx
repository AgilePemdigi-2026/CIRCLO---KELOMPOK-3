'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ConversationList from './ConversationList';
import ChatRoom from './ChatRoom';
import { LOGIN_PATH, useRole } from '@/lib/auth';
import { ApiError, fetchConversations, fetchRoom, loadOutbox, newClientId, openConversation, postMessage, saveOutbox } from '@/lib/chat/client';

const POLL_MS = 5000;

export default function ChatApp() {
  const { role } = useRole();
  const [list, setList] = useState({ loading: true, items: [], error: null });
  const [selectedId, setSelectedId] = useState(null);
  const [room, setRoom] = useState({ loading: false, data: null, error: null });
  const [local, setLocal] = useState([]); // pesan lokal: { client_id, conversation_id, text, created_at, status }
  const [query, setQuery] = useState('');
  const [showRoom, setShowRoom] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const activeId = useRef(null);
  const localRef = useRef([]);
  const showRoomRef = useRef(false);
  useEffect(() => {
    showRoomRef.current = showRoom;
  }, [showRoom]);

  // Pesan baru dianggap dibaca hanya bila ruang percakapan terlihat: tab sedang aktif, dan (di layar kecil) ruangnya sedang dibuka, bukan daftar.
  const roomIsVisible = () => document.visibilityState === 'visible' && (showRoomRef.current || Boolean(window.matchMedia?.('(min-width: 1024px)').matches));

  const updateLocal = useCallback((fn) => {
    const next = fn(localRef.current);
    localRef.current = next;
    setLocal(next);
    if (role) saveOutbox(role, next.filter((i) => i.status === 'failed').map(({ client_id, conversation_id, text, created_at }) => ({ client_id, conversation_id, text, created_at })));
  }, [role]);

  const onApiError = useCallback((e) => {
    if (e instanceof ApiError && e.status === 401) setNeedsLogin(true);
    return e instanceof Error ? e.message : 'Terjadi kesalahan.';
  }, []);

  const loadList = useCallback(async () => {
    try {
      const data = await fetchConversations(role);
      setList({ loading: false, items: data.conversations, error: null });
      return data.conversations;
    } catch (e) {
      setList((p) => ({ ...p, loading: false, error: p.items.length ? null : onApiError(e) }));
      return null;
    }
  }, [role, onApiError]);

  const loadRoom = useCallback(async (id, { silent = false } = {}) => {
    if (!silent) setRoom({ loading: true, data: null, error: null });
    try {
      const data = await fetchRoom(id, role, { read: roomIsVisible() });
      if (activeId.current === id) setRoom({ loading: false, data, error: null });
    } catch (e) {
      if (activeId.current !== id) return;
      const message = onApiError(e);
      setRoom((p) => (silent && p.data ? p : { loading: false, data: null, error: message }));
    }
  }, [role, onApiError]);

  const select = useCallback((id) => {
    activeId.current = id;
    setSelectedId(id);
    setShowRoom(true);
    try {
      window.history.replaceState(null, '', `/chat?c=${encodeURIComponent(id)}`);
    } catch {
      // abaikan: URL hanya kemudahan, bukan syarat
    }
  }, []);

  // Muat awal: outbox, daftar percakapan, lalu pilih percakapan (dari URL, dari material, atau yang terbaru).
  useEffect(() => {
    if (!role) return;
    const outbox = loadOutbox(role).map((i) => ({ ...i, status: 'failed' }));
    localRef.current = outbox;
    setLocal(outbox);

    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      let wanted = params.get('c');
      const materialId = params.get('material');
      const buyerId = params.get('buyer');
      const target = role === 'buyer' ? (materialId ? { id_material: materialId } : null) : buyerId ? { id_buyer: buyerId, id_material: materialId } : null;
      if (!wanted && target) {
        try {
          wanted = (await openConversation(target, role)).id;
        } catch (e) {
          if (!cancelled) setList((p) => ({ ...p, error: onApiError(e) }));
        }
      }
      const items = await loadList();
      if (cancelled || !items) return;
      const first = items.find((c) => c.id === wanted) || items[0];
      if (first) {
        activeId.current = first.id;
        setSelectedId(first.id);
        setShowRoom(Boolean(wanted));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, loadList, onApiError]);

  // Muat ruang percakapan yang dipilih, lalu segarkan berkala (pesan baru dari lawan bicara).
  useEffect(() => {
    if (!role || !selectedId) return undefined;
    loadRoom(selectedId);
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      loadRoom(selectedId, { silent: true });
      loadList();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [role, selectedId, loadRoom, loadList]);

  const send = useCallback(async (text, existing) => {
    if (!selectedId) return;
    const convId = selectedId;
    // Perangkat jelas-jelas offline: tidak perlu menunggu permintaan gagal, langsung tampilkan "Coba Lagi".
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const status = offline ? 'failed' : 'sending';
    const item = existing
      ? { ...existing, status }
      : { client_id: newClientId(), conversation_id: convId, text, created_at: new Date().toISOString(), status };
    updateLocal((prev) => (existing ? prev.map((i) => (i.client_id === item.client_id ? item : i)) : [...prev, item]));
    if (offline) return;
    try {
      const { message } = await postMessage(convId, { text: item.text, client_id: item.client_id }, role);
      updateLocal((prev) => prev.filter((i) => i.client_id !== item.client_id));
      setRoom((p) => (p.data && activeId.current === convId && !p.data.messages.some((m) => m.id === message.id)
        ? { ...p, data: { ...p.data, messages: [...p.data.messages, message] } }
        : p));
      loadList();
    } catch (e) {
      onApiError(e);
      updateLocal((prev) => prev.map((i) => (i.client_id === item.client_id ? { ...i, status: 'failed' } : i)));
    }
  }, [selectedId, role, updateLocal, loadList, onApiError]);

  // Pesan yang ternyata sudah masuk ke server (jaringan putus tepat setelah terkirim) tidak perlu lagi
  // menunggu "Coba Lagi": hapus dari outbox supaya tidak tersisa di perangkat.
  useEffect(() => {
    const server = room.data?.messages;
    if (!server?.length) return;
    const known = new Set(server.map((m) => m.client_id).filter(Boolean));
    if (localRef.current.some((i) => known.has(i.client_id))) updateLocal((prev) => prev.filter((i) => !known.has(i.client_id)));
  }, [room.data, updateLocal]);

  const messages = useMemo(() => {
    const server = room.data?.messages || [];
    const known = new Set(server.map((m) => m.client_id).filter(Boolean));
    const pending = local
      .filter((i) => i.conversation_id === selectedId && !known.has(i.client_id))
      .map((i) => ({ ...i, key: `local-${i.client_id}`, mine: true }));
    // Pesan milik sendiri: 'sent' = 1 centang, 'delivered' = 2 centang abu-abu, 'read' = 2 centang biru.
    const status = (m) => (!m.mine ? 'received' : m.read ? 'read' : m.delivered ? 'delivered' : 'sent');
    return [...server.map((m) => ({ ...m, status: status(m), key: m.id })), ...pending];
  }, [room.data, local, selectedId]);

  if (needsLogin) {
    return (
      <main className="mx-auto max-w-[480px] px-4 py-24 text-center">
        <h1 className="font-display text-[24px] font-semibold">Sesi login tidak ditemukan</h1>
        <p className="mt-2 text-[17px] text-circlo-muted">Masuk dulu untuk membuka chat.</p>
        <Link href={LOGIN_PATH} className="mt-6 inline-block rounded-lg bg-circlo-green px-7 py-3 text-[16px] font-medium text-white">Masuk</Link>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100vh-81px)] min-h-[560px] border-t border-circlo-line/60">
      <ConversationList
        items={list.items}
        selectedId={selectedId}
        onSelect={select}
        query={query}
        onQuery={setQuery}
        loading={list.loading}
        error={list.error}
        className={showRoom ? 'hidden lg:flex' : 'flex w-full'}
      />
      <ChatRoom
        conversation={room.data?.conversation || null}
        messages={messages}
        loading={room.loading || list.loading}
        error={room.error || (room.data ? null : list.error)}
        onSend={(text) => send(text)}
        onRetry={(m) => send(m.text, local.find((i) => i.client_id === m.client_id))}
        onBack={() => setShowRoom(false)}
        className={showRoom ? 'flex' : 'hidden lg:flex'}
      />
    </main>
  );
}
