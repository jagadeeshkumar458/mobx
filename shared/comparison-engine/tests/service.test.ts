import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createComparisonService, defaultRegistry, type SnapshotStore, type ComparisonSnapshot } from '../src/index.ts';
import { alpha, beta, gamma } from './fixtures.ts';

/** Stores JSON strings, like a Postgres Json column after a backend restart. */
function memoryStore(): SnapshotStore & { rows: Map<string, string> } {
  const rows = new Map<string, string>();
  const phones = [alpha, beta, gamma];
  return {
    rows,
    loadPhones: async (ids) => phones.filter((p) => ids.includes(p.id)),
    loadRegistry: async () => defaultRegistry,
    findById: async (id) => (rows.has(id) ? JSON.parse(rows.get(id)!) as ComparisonSnapshot : null),
    findByHash: async (h) => {
      for (const [id, raw] of rows) { const s = JSON.parse(raw); if (s.contentHash === h) return { id, snapshot: s }; }
      return null;
    },
    insert: async (s) => { const id = `snap_${rows.size + 1}`; rows.set(id, JSON.stringify(s)); return id; },
  };
}

test('page and video read the same stored snapshot, end to end', async () => {
  const store = memoryStore();
  const svc = createComparisonService(store);
  const { id } = await svc.createSnapshot(['fx-alpha', 'fx-beta']);
  const again = await svc.createSnapshot(['fx-alpha', 'fx-beta']);
  assert.equal(again.id, id, 'identical comparison is stored once');

  const page = await svc.dashboard(id, 'detailed');
  const sb = await svc.storyboard(id, { language: 'te', durationSec: 60 });
  assert.equal(page.snapshotHash, sb.snapshotHash);
  assert.deepEqual(await svc.validateEdit(id, sb), []);
  await svc.prepareRender(id, sb); // does not throw
});

test('a snapshot edited in the database is refused everywhere', async () => {
  const store = memoryStore();
  const svc = createComparisonService(store);
  const { id } = await svc.createSnapshot(['fx-alpha', 'fx-gamma']);
  const s = JSON.parse(store.rows.get(id)!);
  s.categories.find((c: { key: string }) => c.key === 'display').rows[2].cells[0].display = '240 Hz';
  store.rows.set(id, JSON.stringify(s));
  await assert.rejects(svc.dashboard(id, 'quick'), /integrity/);
});

test('render is refused when narration was edited to a fabricated figure', async () => {
  const svc = createComparisonService(memoryStore());
  const { id } = await svc.createSnapshot(['fx-alpha', 'fx-beta']);
  const sb = await svc.storyboard(id, {});
  sb.scenes[sb.scenes.length - 1].narration = 'Charges fully in 12 minutes.';
  await assert.rejects(svc.prepareRender(id, sb), /failed validation/);
});
