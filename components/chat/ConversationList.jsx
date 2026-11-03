'use client';

import { Search } from 'lucide-react';
import Avatar from './Avatar';
import { listTimeLabel } from '@/lib/chat/format';

export default function ConversationList({ items, selectedId, onSelect, query, onQuery, loading, error, className = '' }) {
  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((c) => `${c.name} ${c.preview}`.toLowerCase().includes(q)) : items;
  const now = new Date();

  return (
    <aside aria-labelledby="chat-list-title" className={`flex-col border-r border-circlo-line/70 bg-circlo-bg lg:w-[292px] lg:shrink-0 ${className}`}>
      <div className="px-4 pb-3 pt-5">
        <h2 id="chat-list-title" className="font-display text-[22px] font-semibold text-circlo-ink">Daftar Percakapan</h2>
        <label className="mt-4 flex items-center gap-2 rounded-full bg-circlo-field px-3.5 py-2.5 text-circlo-muted focus-within:ring-2 focus-within:ring-circlo-green/40">
          <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <input
            type="search"
            name="Cari percakapan"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Cari percakapan"
            aria-label="Cari percakapan"
            autoComplete="off"
            className="w-full bg-transparent text-[14px] text-circlo-ink outline-none placeholder:text-[#747B78]"
          />
        </label>
      </div>

      <nav aria-label="Percakapan" className="min-h-0 flex-1 overflow-y-auto border-t border-circlo-line/60">
        {loading && <p className="px-4 py-6 text-[13.5px] text-circlo-muted">Memuat percakapan…</p>}
        {!loading && error && <p role="alert" className="px-4 py-6 text-[13.5px] text-red-700">{error}</p>}
        {!loading && !error && !items.length && (
          <p className="px-4 py-6 text-[13.5px] leading-6 text-circlo-muted">Belum ada percakapan. Mulai dari halaman detail material atau halaman pesanan.</p>
        )}
        {!loading && !error && !!items.length && !shown.length && (
          <p className="px-4 py-6 text-[13.5px] text-circlo-muted">Tidak ada percakapan yang cocok.</p>
        )}
        {shown.map((c) => {
          const active = c.id === selectedId;
          return (
            <a
              key={c.id}
              href={`/chat?c=${encodeURIComponent(c.id)}`}
              onClick={(e) => {
                e.preventDefault();
                onSelect(c.id);
              }}
              aria-current={active ? 'true' : undefined}
              className={`flex items-center gap-2.5 border-b border-circlo-line/50 px-3.5 py-3.5 ${
                active ? 'border-l-[3px] border-l-circlo-green bg-[#E6F4FB] pl-[11px]' : 'hover:bg-circlo-field/60'
              }`}
            >
              <Avatar name={c.name} src={c.avatar_url} size={40} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-1.5">
                  <span className={`truncate text-[13.5px] ${active ? 'font-semibold' : 'font-medium'} text-circlo-ink`}>{c.name}</span>
                  <span className="shrink-0 text-[10.5px] text-circlo-muted">{listTimeLabel(c.last_at, now)}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-[1.35] text-circlo-muted">{c.preview || 'Belum ada pesan'}</span>
              </span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
