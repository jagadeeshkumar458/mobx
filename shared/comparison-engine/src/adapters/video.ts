import type { ComparisonSnapshot, Row, Weights } from '../types.ts';
import { recommend, DEFAULT_WEIGHTS } from '../recommend.ts';
import { verifySnapshot } from '../engine.ts';
import { t, specLabel, type Lang } from './narration.ts';

/** A fact is a pointer into the snapshot plus the exact text it showed. */
export interface Fact {
  categoryKey: string;
  specKey: string;
  phoneId: string;
  display: string;
  isBest: boolean;
}

export interface Scene {
  id: string;
  type: string; // maps to a Remotion scene component per style
  categoryKey?: string;
  durationSec: number;
  facts: Fact[];
  narration: string;
  narrationEditedByUser?: boolean;
}

export interface Storyboard {
  snapshotHash: string;
  language: Lang;
  weights: Weights;
  scenes: Scene[];
}

export interface StoryboardOptions {
  language?: Lang;
  durationSec?: number;
  /** Ordered category keys; defaults to categories with video.enabledByDefault. */
  categories?: string[];
  weights?: Weights;
}

const name = (s: ComparisonSnapshot, id: string) => {
  const p = s.phones.find((x) => x.id === id)!;
  return `${p.brand} ${p.model}`;
};

/** Rows worth a video beat: meaningful winners first, then honest "no data" notes. */
function pickRows(rows: Row[], limit: number): Row[] {
  const winners = rows.filter((r) => r.winnerIds.length > 0);
  const quickInfo = rows.filter((r) => r.winnerIds.length === 0 && r.tier === 'quick' && r.cells.some((c) => c.status === 'available'));
  return [...winners, ...quickInfo].slice(0, limit);
}

function narrateRow(s: ComparisonSnapshot, lang: Lang, row: Row): string {
  const spec = specLabel(lang, row.specKey);
  if (row.note === 'incomparable_conditions') return t(lang, 'incomparable', { spec });
  if (row.note === 'insufficient_verified_data') return t(lang, 'noData', { spec });
  if (row.winnerIds.length === 1) {
    const w = row.cells.find((c) => c.phoneId === row.winnerIds[0])!;
    const others = row.cells.filter((c) => c.phoneId !== w.phoneId && c.status === 'available')
      .map((c) => `${name(s, c.phoneId)}: ${c.display}`).join(', ');
    return [t(lang, 'leads', { spec, phone: name(s, w.phoneId), value: w.display }), others && t(lang, 'others', { list: others })]
      .filter(Boolean).join(' ');
  }
  if (row.note === 'tie' || row.note === 'not_meaningful') return t(lang, 'tie', { spec });
  return row.cells.filter((c) => c.status === 'available').map((c) => `${name(s, c.phoneId)}: ${c.display}`).join(', ') + '.';
}

/** Builds a storyboard purely from the snapshot. Never touches phone records. */
export function toStoryboard(s: ComparisonSnapshot, opts: StoryboardOptions = {}): Storyboard {
  const lang = opts.language ?? 'en';
  const weights = opts.weights ?? DEFAULT_WEIGHTS;
  const duration = opts.durationSec ?? 60;
  const catKeys = opts.categories ?? s.categories.filter((c) => c.video.enabledByDefault && c.key !== 'recommendation').map((c) => c.key);
  const scenes: Omit<Scene, 'durationSec'>[] = [];

  scenes.push({ id: 'intro', type: 'intro', facts: [], narration: t(lang, 'intro', { phones: s.phones.map((p) => name(s, p.id)).join(' vs ') }) });
  scenes.push({ id: 'reveal', type: 'phoneReveal', facts: [], narration: '' });

  for (const key of catKeys) {
    const cat = s.categories.find((c) => c.key === key);
    if (!cat) throw new Error(`Unknown category in storyboard: ${key}`);
    // Fewer rows per scene as phone count grows, to avoid overcrowding.
    const rowLimit = Math.max(1, Math.floor((cat.video.maxFactsPerScene * 2) / s.phones.length));
    const rows = pickRows(cat.rows, rowLimit);
    if (!rows.length) continue;
    scenes.push({
      id: `cat-${key}`, type: cat.video.sceneType, categoryKey: key,
      facts: rows.flatMap((r) => r.cells.filter((c) => c.status === 'available')
        .map((c) => ({ categoryKey: key, specKey: r.specKey, phoneId: c.phoneId, display: c.display, isBest: c.isBest }))),
      narration: rows.map((r) => narrateRow(s, lang, r)).join(' '),
    });
  }

  if (s.phones.length > 1) {
    const rec = recommend(s, weights);
    scenes.push({
      id: 'verdict', type: 'verdict', facts: [],
      narration: rec.bestPhoneId ? t(lang, 'verdict', { phone: name(s, rec.bestPhoneId) }) : t(lang, 'verdictClose'),
    });
  }
  scenes.push({ id: 'outro', type: 'outro', facts: [], narration: t(lang, 'outro') });

  // Split duration: fixed short intro/reveal/outro, the rest across content scenes.
  const fixed = { intro: 3, reveal: 3, outro: 3 } as Record<string, number>;
  const fixedTotal = scenes.reduce((a, sc) => a + (fixed[sc.id] ?? 0), 0);
  const flexCount = scenes.filter((sc) => !(sc.id in fixed)).length || 1;
  const each = Math.max(3, Math.round(((duration - fixedTotal) / flexCount) * 10) / 10);

  return {
    snapshotHash: s.contentHash, language: lang, weights,
    scenes: scenes.map((sc) => ({ ...sc, durationSec: fixed[sc.id] ?? each })),
  };
}

const NUM = /\d[\d,]*(?:\.\d+)?/g;
const nums = (str: string) => (str.match(NUM) ?? []).map((n) => n.replace(/,/g, ''));

export interface ValidationIssue { sceneId: string; problem: string }

/**
 * Gatekeeper used by the API (on save) and the render worker (before render).
 * Guarantees the video can only say what the snapshot says.
 */
export function validateStoryboard(sb: Storyboard, s: ComparisonSnapshot): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!verifySnapshot(s)) issues.push({ sceneId: '*', problem: 'Snapshot content hash does not match its contents' });
  if (sb.snapshotHash !== s.contentHash) issues.push({ sceneId: '*', problem: 'Storyboard was built from a different snapshot' });

  const phoneNums = s.phones.flatMap((p) => nums(`${p.brand} ${p.model} ${p.variant ?? ''}`));
  for (const sc of sb.scenes) {
    for (const f of sc.facts) {
      const cell = s.categories.find((c) => c.key === f.categoryKey)?.rows.find((r) => r.specKey === f.specKey)?.cells.find((c) => c.phoneId === f.phoneId);
      if (!cell) issues.push({ sceneId: sc.id, problem: `Fact ${f.specKey}/${f.phoneId} not in snapshot` });
      else if (cell.status !== 'available') issues.push({ sceneId: sc.id, problem: `Fact ${f.specKey}/${f.phoneId} is not verified` });
      else if (cell.display !== f.display || cell.isBest !== f.isBest) issues.push({ sceneId: sc.id, problem: `Fact ${f.specKey}/${f.phoneId} differs from snapshot` });
    }
    // Every number spoken must come from this scene's facts (or a phone name).
    const allowed = new Set([...sc.facts.flatMap((f) => nums(f.display)), ...phoneNums]);
    for (const n of nums(sc.narration)) {
      if (!allowed.has(n)) issues.push({ sceneId: sc.id, problem: `Narration states "${n}", which is not a verified value in this scene` });
    }
  }
  return issues;
}

export function assertRenderable(sb: Storyboard, s: ComparisonSnapshot): void {
  const issues = validateStoryboard(sb, s);
  if (issues.length) throw Object.assign(new Error('Storyboard failed validation'), { issues });
}
