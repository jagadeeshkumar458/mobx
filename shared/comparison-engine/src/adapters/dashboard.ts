import type { ComparisonSnapshot, Tier, Weights } from '../types.ts';
import { recommend, profileVerdicts } from '../recommend.ts';

const TIER_RANK: Record<Tier, number> = { quick: 0, detailed: 1, techie: 2 };

/**
 * View model for the interactive comparison page. Switching Quick / Detailed /
 * Techie only filters rows of the same snapshot — values are never re-derived.
 */
export function toDashboard(snapshot: ComparisonSnapshot, mode: Tier, weights?: Weights) {
  return {
    snapshotHash: snapshot.contentHash,
    phones: snapshot.phones,
    categories: snapshot.categories
      .map((c) => ({ ...c, rows: c.rows.filter((r) => TIER_RANK[r.tier] <= TIER_RANK[mode]) }))
      .filter((c) => c.rows.length > 0 || c.key === 'recommendation'),
    recommendation: recommend(snapshot, weights),
    profiles: profileVerdicts(snapshot),
    warnings: snapshot.warnings,
  };
}
