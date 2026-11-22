// Pengganti klien Supabase seadanya (hanya method yang dipakai store chat) untuk uji tanpa jaringan.
export function fakeSupabase(seed = {}, { missingColumns = {} } = {}) {
  const db = { percakapan: [], pesan_chat: [], material: [], penjual: [], ...seed };
  const unique = {
    percakapan: (a, b) => a.buyer_auth_id === b.buyer_auth_id && a.seller_auth_id === b.seller_auth_id && (a.id_material ?? null) === (b.id_material ?? null),
    pesan_chat: (a, b) => a.client_id && a.id_percakapan === b.id_percakapan && a.client_id === b.client_id,
  };
  const from = (table) => {
    const st = { cols: '*', op: 'select', payload: null, filters: [], order: null, limit: null, one: null };
    const run = () => {
      const touched = st.op === 'update' ? Object.keys(st.payload || {}) : st.cols.split(',').map((x) => x.trim());
      const missing = (missingColumns[table] || []).find((c) => touched.includes(c));
      if (missing) return { data: null, error: { code: '42703', message: `column ${table}.${missing} does not exist` } };
      let rows = db[table].filter((r) => st.filters.every((f) => f(r)));
      if (st.op === 'insert') {
        const row = { id: globalThis.crypto.randomUUID(), dibuat_pada: new Date().toISOString(), terakhir_pesan: '', terakhir_pesan_at: new Date().toISOString(), id_material: null, client_id: null, ...st.payload };
        if (db[table].some((r) => unique[table]?.(row, r))) return { data: null, error: { code: '23505', message: 'duplicate key' } };
        db[table].push(row);
        rows = [row];
      } else if (st.op === 'update') {
        rows.forEach((r) => Object.assign(r, st.payload));
        return { data: null, error: null };
      } else {
        if (st.order) rows = [...rows].sort((a, b) => (a[st.order[0]] < b[st.order[0]] ? -1 : 1) * (st.order[1] ? 1 : -1));
        if (st.limit) rows = rows.slice(0, st.limit);
      }
      if (st.cols !== '*' && st.op !== 'update') rows = rows.map((r) => Object.fromEntries(st.cols.split(',').map((c) => c.trim()).map((c) => [c, r[c]])));
      if (st.one === 'single') return rows[0] ? { data: rows[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
      if (st.one === 'maybe') return { data: rows[0] ?? null, error: null };
      return { data: rows, error: null };
    };
    const q = {
      select: (cols = '*') => { st.cols = cols; return q; },
      insert: (p) => { st.op = 'insert'; st.payload = p; return q; },
      update: (p) => { st.op = 'update'; st.payload = p; return q; },
      eq: (c, v) => { st.filters.push((r) => r[c] === v); return q; },
      neq: (c, v) => { st.filters.push((r) => r[c] !== v); return q; },
      in: (c, values) => { st.filters.push((r) => values.includes(r[c])); return q; },
      is: (c, v) => { st.filters.push((r) => (r[c] ?? null) === v); return q; },
      or: (expr) => {
        const parts = expr.split(',').map((s) => s.split('.'));
        st.filters.push((r) => parts.some(([c, op, v]) => op === 'eq' && String(r[c]) === v));
        return q;
      },
      order: (c, { ascending = true } = {}) => { st.order = [c, ascending]; return q; },
      limit: (n) => { st.limit = n; return q; },
      maybeSingle: () => { st.one = 'maybe'; return q; },
      single: () => { st.one = 'single'; return q; },
      then: (res, rej) => Promise.resolve(run()).then(res, rej),
    };
    return q;
  };
  return { from, db };
}
