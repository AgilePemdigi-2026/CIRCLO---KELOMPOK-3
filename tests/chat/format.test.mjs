import test from 'node:test';
import assert from 'node:assert/strict';
import { formatClock, listTimeLabel, dayLabel, groupByDay, previewText, initials, materialAvailable, materialSubtitle, isShopName } from '../../lib/chat/format.js';

const now = new Date(2026, 10, 3, 12, 0); // Selasa, 3 Nov 2026
const at = (d, h = 9, m = 5) => new Date(2026, 10, d, h, m);

test('formatClock memakai dua digit dan titik dua', () => {
  assert.equal(formatClock(at(3, 10, 42)), '10:42');
  assert.equal(formatClock(at(3, 9, 5)), '09:05');
  assert.equal(formatClock('bukan tanggal'), '');
});

test('listTimeLabel: jam, Kemarin, nama hari, tanggal', () => {
  assert.equal(listTimeLabel(at(3, 10, 42), now), '10:42');
  assert.equal(listTimeLabel(at(2), now), 'Kemarin');
  assert.equal(listTimeLabel(new Date(2026, 10, 1), now), 'Min'); // 1 Nov 2026 hari Minggu (2 hari lalu)
  assert.equal(listTimeLabel(new Date(2026, 9, 31), now), 'Sab'); // 31 Okt 2026 hari Sabtu (3 hari lalu)
  assert.equal(listTimeLabel(new Date(2026, 9, 20), now), '20/10/26');
});

test('dayLabel dan groupByDay', () => {
  assert.equal(dayLabel(at(3), now), 'Hari Ini');
  assert.equal(dayLabel(at(2), now), 'Kemarin');
  assert.match(dayLabel(new Date(2026, 9, 20), now), /20 Oktober 2026/);
  const g = groupByDay([{ created_at: at(2).toISOString() }, { created_at: at(2, 10).toISOString() }, { created_at: at(3).toISOString() }], now);
  assert.deepEqual(g.map((x) => [x.label, x.items.length]), [['Kemarin', 2], ['Hari Ini', 1]]);
});

test('previewText, initials, isShopName', () => {
  assert.equal(previewText('  a   b  '), 'a b');
  assert.equal(previewText('x'.repeat(100), 10).length, 10);
  assert.equal(initials('Siti Rahma'), 'SR');
  assert.equal(initials(''), '?');
  assert.ok(isShopName('Eco Build Supplies'));
  assert.ok(!isShopName('Siti Rahma'));
});

test('kartu material', () => {
  assert.equal(materialSubtitle({ stok: 20, satuan: 'kg', kategori: 'Sisa Industri' }), 'Batch 20kg • Sisa Industri');
  assert.equal(materialSubtitle({ stok: 5, satuan: 'pcs' }), 'Batch 5pcs');
  assert.ok(materialAvailable({ stok: 1, status_material: true }));
  assert.ok(!materialAvailable({ stok: 0, status_material: true }));
  assert.ok(!materialAvailable({ stok: 3, status_material: false }));
  assert.ok(!materialAvailable(null));
});
