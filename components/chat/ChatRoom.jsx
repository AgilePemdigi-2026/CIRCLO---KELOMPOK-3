'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Paperclip, Send } from 'lucide-react';
import Avatar from './Avatar';
import { formatClock, groupByDay } from '@/lib/chat/format';

const MAX = 1000;

function MaterialCard({ material }) {
  return (
    <div className="border-b border-circlo-line/70 bg-[#E6F4FB] p-4">
      <div className="flex items-center gap-4 rounded-lg bg-white p-3 shadow-card">
        {material.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={material.foto_url} alt={material.nama} className="h-14 w-14 shrink-0 rounded-md object-cover" />
        ) : (
          <span className="h-14 w-14 shrink-0 rounded-md bg-circlo-soft" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-circlo-ink">{material.nama}</p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-circlo-ink/80">{material.subtitle}</p>
          <Link href={material.href} className="mt-0.5 inline-block text-[12.5px] text-circlo-green hover:underline">Lihat Material Details</Link>
        </div>
        <span
          className={`self-start rounded-full px-3 py-1 text-[10.5px] font-bold tracking-wide ${
            material.available ? 'bg-[#DDE79A] text-circlo-green' : 'bg-circlo-field text-circlo-muted'
          }`}
        >
          {material.available ? 'TERSEDIA' : 'HABIS'}
        </span>
      </div>
    </div>
  );
}

function Bubble({ m, other, showAvatar, onRetry }) {
  const failed = m.status === 'failed';
  const tone = failed
    ? 'border border-red-200 bg-red-50 text-circlo-ink rounded-br-md'
    : m.mine
      ? 'bg-circlo-green text-white rounded-br-md'
      : 'bg-[#D7E5EC] text-circlo-ink rounded-bl-md';
  return (
    <div className={`flex items-end gap-2 ${m.mine ? 'justify-end' : ''}`}>
      {!m.mine && <span className="w-7 shrink-0">{showAvatar && <Avatar name={other.name} src={other.avatar_url} size={28} />}</span>}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 lg:max-w-[72%] ${tone}`}>
        <p className="whitespace-pre-wrap break-words text-[15px] leading-6">{m.text}</p>
        <div className={`mt-1 flex items-center justify-end gap-2 text-[11px] ${m.mine && !failed ? 'text-white/70' : 'text-circlo-muted'}`}>
          {m.status === 'sending' && <span>Mengirim…</span>}
          {failed && (
            <>
              <span role="alert" className="font-medium text-red-700">Pesan gagal dikirim</span>
              <button type="button" onClick={() => onRetry(m)} className="font-semibold text-circlo-green underline">Coba Lagi</button>
            </>
          )}
          <time dateTime={m.created_at}>{formatClock(m.created_at)}</time>
        </div>
      </div>
    </div>
  );
}

export default function ChatRoom({ conversation, messages, loading, error, onSend, onRetry, onBack, className = '' }) {
  const [text, setText] = useState('');
  const logRef = useRef(null);

  useEffect(() => setText(''), [conversation?.id]);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, conversation?.id]);

  if (!conversation) {
    return (
      <section aria-label="Ruang Percakapan" className={`flex-1 flex-col items-center justify-center bg-circlo-bg p-8 text-center ${className}`}>
        {loading ? <p className="text-[14px] text-circlo-muted">Memuat…</p> : <p className="text-[14px] text-circlo-muted">{error || 'Pilih percakapan di sebelah kiri untuk mulai mengobrol.'}</p>}
      </section>
    );
  }

  const groups = groupByDay(messages);
  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText('');
    onSend(value);
  };

  return (
    <section aria-label="Ruang Percakapan" className={`min-w-0 flex-1 flex-col bg-circlo-bg ${className}`}>
      <button type="button" onClick={onBack} className="flex items-center gap-2 border-b border-circlo-line/70 px-4 py-3 text-[14px] font-medium text-circlo-green lg:hidden">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Daftar Percakapan
      </button>
      {conversation.material && <MaterialCard material={conversation.material} />}

      <div ref={logRef} role="log" aria-label="Riwayat Pesan" aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-8">
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-center text-[13px] text-red-700">{error}</p>}
        {!messages.length && !loading && <p className="pt-8 text-center text-[14px] text-circlo-muted">Belum ada pesan. Tulis pesan pertamamu.</p>}
        {groups.map((g) => (
          <div key={g.key} className="space-y-3">
            <div className="flex justify-center">
              <span className="rounded-full bg-[#D7E5EC] px-3 py-1 text-[12px] text-circlo-ink/80">{g.label}</span>
            </div>
            {g.items.map((m, i) => (
              <Bubble key={m.key} m={m} other={conversation} showAvatar={i === 0 || g.items[i - 1].mine} onRetry={onRetry} />
            ))}
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="border-t border-circlo-line/70 bg-circlo-bg px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 rounded-2xl bg-circlo-field px-4 py-2.5 focus-within:ring-2 focus-within:ring-circlo-green/40">
          <button type="button" disabled aria-label="Lampirkan file" title="Lampiran belum tersedia" className="shrink-0 text-circlo-muted disabled:cursor-not-allowed">
            <Paperclip className="h-5 w-5" aria-hidden="true" />
          </button>
          <input
            id="Message"
            name="Message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ketik pesan..."
            aria-label="Ketik pesan"
            autoComplete="off"
            maxLength={MAX}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] text-circlo-ink outline-none placeholder:text-[#747B78]"
          />
          <button
            type="submit"
            id="Send"
            name="Send"
            aria-label="Kirim"
            title="Kirim"
            disabled={!text.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-circlo-green text-white transition disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  );
}
