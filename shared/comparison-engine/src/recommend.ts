import type { ComparisonSnapshot, Weights } from './types.ts';

export const DEFAULT_WEIGHTS: Required<Weights> = {
  performance: 1, camera: 1, battery: 1, display: 1, software: 1, price: 1, ai: 0.5, design: 0.5,
};

export const PROFILE_WEIGHTS: Record<string, Weights> = {
  gamer: { performance: 3, display: 2, battery: 2, price: 1 },
  photographer: { camera: 3, display: 1, performance: 1 },
  student: { price: 3, battery: 2, performance: 1, software: 1 },
  business: { software: 3, battery: 2, design: 1, ai: 1 },
  longTermUser: { software: 3, design: 1, battery: 1 },
};

export interface Recommendation {
  weights: Weights;
  ranking: { phoneId: string; score: number | null; confidence: number }[];
  bestPhoneId: string | null;
  /** True when the leader's margin is too small to call. */
  tooCloseToCall: boolean;
}

/** Pure function of (snapshot, weights). Reads nothing but the snapshot. */
export function recommend(snapshot: ComparisonSnapshot, weights: Weights = DEFAULT_WEIGHTS): Recommendation {
  const totalWeight = Object.values(weights).reduce((a, b) => a + (b ?? 0), 0) || 1;
  const ranking = snapshot.phones.map((p) => {
    let num = 0; let den = 0;
    for (const cat of snapshot.categories) {
      const w = cat.weightGroup === 'none' ? 0 : weights[cat.weightGroup] ?? 0;
      const sc = cat.scores[p.id];
      if (w > 0 && sc !== null && sc !== undefined) { num += sc * w; den += w; }
    }
    return { phoneId: p.id, score: den ? Math.round(num / den) : null, confidence: Math.round((den / totalWeight) * 100) / 100 };
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  const [first, second] = ranking;
  const tooClose = !first || first.score === null || (second?.score != null && first.score - second.score < 3) || first.confidence < 0.5;
  return { weights, ranking, bestPhoneId: tooClose ? null : first.phoneId, tooCloseToCall: tooClose };
}

export function profileVerdicts(snapshot: ComparisonSnapshot) {
  return Object.fromEntries(Object.entries(PROFILE_WEIGHTS).map(([k, w]) => [k, recommend(snapshot, w)]));
}
