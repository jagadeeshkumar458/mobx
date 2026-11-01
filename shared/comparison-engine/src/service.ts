// Backend-facing service. The Express routes and the BullMQ render worker use
// these functions; they are the only paths that create or consume snapshots.
import type { ComparisonSnapshot, PhoneRecord, Registry, Tier, Weights } from './types.ts';
import { buildSnapshot, verifySnapshot } from './engine.ts';
import { toDashboard } from './adapters/dashboard.ts';
import { toStoryboard, validateStoryboard, assertRenderable, type Storyboard, type StoryboardOptions } from './adapters/video.ts';

/** Implemented with Prisma in the backend; in-memory in tests. */
export interface SnapshotStore {
  loadPhones(ids: string[]): Promise<PhoneRecord[]>;
  loadRegistry(): Promise<Registry>;
  findByHash(hash: string): Promise<{ id: string; snapshot: ComparisonSnapshot } | null>;
  findById(id: string): Promise<ComparisonSnapshot | null>;
  insert(snapshot: ComparisonSnapshot): Promise<string>;
}

export function createComparisonService(store: SnapshotStore) {
  return {
    /** POST /api/comparisons — the single write path for comparison results. */
    async createSnapshot(phoneIds: string[]): Promise<{ id: string; snapshot: ComparisonSnapshot }> {
      const [phones, registry] = await Promise.all([store.loadPhones(phoneIds), store.loadRegistry()]);
      if (phones.length !== phoneIds.length) throw new Error('Unknown phone id');
      const ordered = phoneIds.map((id) => phones.find((p) => p.id === id)!);
      const snapshot = buildSnapshot(ordered, registry);
      const existing = await store.findByHash(snapshot.contentHash);
      if (existing) return existing; // same data + same rules → reuse
      return { id: await store.insert(snapshot), snapshot };
    },

    /** GET /api/comparisons/:id?mode=&weights= — what the comparison page renders. */
    async dashboard(snapshotId: string, mode: Tier, weights?: Weights) {
      return toDashboard(await this.mustLoad(snapshotId), mode, weights);
    },

    /** POST /api/video-projects — storyboard built from the stored snapshot only. */
    async storyboard(snapshotId: string, opts: StoryboardOptions): Promise<Storyboard> {
      return toStoryboard(await this.mustLoad(snapshotId), opts);
    },

    /** PUT /api/video-projects/:id/storyboard — user edits are validated on save. */
    async validateEdit(snapshotId: string, sb: Storyboard) {
      return validateStoryboard(sb, await this.mustLoad(snapshotId));
    },

    /** Render worker step 1: refuse anything that drifted from the snapshot. */
    async prepareRender(snapshotId: string, sb: Storyboard) {
      const snapshot = await this.mustLoad(snapshotId);
      assertRenderable(sb, snapshot);
      return { snapshot, storyboard: sb };
    },

    async mustLoad(id: string): Promise<ComparisonSnapshot> {
      const s = await store.findById(id);
      if (!s) throw new Error('Snapshot not found');
      if (!verifySnapshot(s)) throw new Error('Snapshot integrity check failed');
      return s;
    },
  };
}
