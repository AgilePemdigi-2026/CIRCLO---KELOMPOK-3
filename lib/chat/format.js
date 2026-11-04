// Fungsi tampilan waktu & teks untuk fitur Chat. Murni (tanpa efek samping) supaya mudah diuji.

const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const pad = (n) => String(n).padStart(2, '0');
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / 86400000);

// "10:42"
export function formatClock(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Label waktu di daftar percakapan: jam (hari ini), "Kemarin", nama hari (<7 hari), atau tanggal.
export function listTimeLabel(value, now = new Date()) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diff = dayDiff(d, now);
  if (diff <= 0) return formatClock(d);
  if (diff === 1) return 'Kemarin';
  if (diff < 7) return HARI_SINGKAT[d.getDay()];
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
}

// Pemisah hari di ruang percakapan: "Hari Ini", "Kemarin", atau tanggal lengkap.
export function dayLabel(value, now = new Date()) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diff = dayDiff(d, now);
  if (diff <= 0) return 'Hari Ini';
  if (diff === 1) return 'Kemarin';
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

// Kelompokkan pesan (sudah terurut) per hari.
export function groupByDay(messages, now = new Date()) {
  const groups = [];
  for (const m of messages) {
    const d = new Date(m.created_at);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: dayLabel(d, now), items: [] };
      groups.push(g);
    }
    g.items.push(m);
  }
  return groups;
}

export function previewText(text, max = 70) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function isShopName(name) {
  return /\b(supplies|hub|toko|store|cv|pt|ud)\b/i.test(String(name || ''));
}

// Data kartu material di atas ruang percakapan.
export function materialAvailable(m) {
  return Boolean(m) && m.status_material !== false && Number(m.stok ?? 0) > 0;
}

export function materialSubtitle(m) {
  const batch = `Batch ${Number(m.stok ?? 0)}${m.satuan || ''}`;
  return m.kategori ? `${batch} • ${m.kategori}` : batch;
}
