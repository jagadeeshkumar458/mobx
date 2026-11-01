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

/**
 * One on-screen card. The storyboard plans every shot and its reading time, so
 * the preview player and the MP4 renderer show exactly the same cards for the
 * same length of time.
 */
export interface Shot {
  kind: 'intro' | 'reveal' | 'title' | 'chips' | 'table' | 'spotlight' | 'verdict' | 'outro';
  specKeys: string[];
  durationSec: number;
}

export interface Scene {
  id: string;
  type: string; // maps to a Remotion scene component per style
  categoryKey?: string;
  durationSec: number;
  facts: Fact[];
  shots: Shot[];
  narration: string;
  narrationEditedByUser?: boolean;
  /** Verdict scene only: the recommended phone, checked against recommend(). */
  highlightPhoneId?: string | null;
}

export interface Storyboard {
  snapshotHash: string;
  language: Lang;
  weights: Weights;
  scenes: Scene[];
}

export interface StoryboardOptions {
  language?: Lang;
  /** Target length. Omit for "auto": every comparable spec at reading pace. */
  durationSec?: number;
  /** Ordered category keys; defaults to categories with video.enabledByDefault. */
  categories?: string[];
  weights?: Weights;
}

/** Reading times in seconds. A viewer needs ~3–4 s to read one comparison card. */
export const PACE = { intro: 4, reveal: 4, title: 3, chips: 4.5, spotlight: 3.5, table: 5, verdict: 5, outro: 4 } as const;
export const MIN_SHOT_SEC = 3;
export const TABLE_ROWS = 5;
const SPOTLIGHT_MAX_CHARS = 16;

const name = (s: ComparisonSnapshot, id: string) => {
  const p = s.phones.find((x) => x.id === id)!;
  return `${p.brand} ${p.model}`;
};

const availableCells = (r: Row) => r.cells.filter((c) => c.status === 'available');

/** Rows worth showing: data for at least two phones (or one, for a single-phone video). Winners first. */
function rankRows(rows: Row[], phoneCount: number): Row[] {
  const need = Math.min(2, phoneCount);
  const usable = rows.filter((r) => availableCells(r).length >= need);
  const score = (r: Row) => (r.winnerIds.length ? 0 : r.tier === 'quick' ? 1 : r.tier === 'detailed' ? 2 : 3);
  return usable.map((r, i) => ({ r, i })).sort((a, b) => score(a.r) - score(b.r) || a.i - b.i).map((x) => x.r);
}

/** A head-to-head card: short values that actually differ between phones. */
function spotlightable(r: Row): boolean {
  const cells = availableCells(r);
  if (r.specKey === 'chipset' || cells.some((c) => Array.isArray(c.value) || c.display.length > SPOTLIGHT_MAX_CHARS)) return false;
  return new Set(cells.map((c) => c.display)).size > 1 || cells.length === 1;
}

function planShots(rows: Row[]): Shot[] {
  const shots: Shot[] = [{ kind: 'title', specKeys: [], durationSec: PACE.title }];
  if (rows.some((r) => r.specKey === 'chipset')) shots.push({ kind: 'chips', specKeys: ['chipset'], durationSec: PACE.chips });
  const tableRows = rows.filter((r) => r.specKey !== 'chipset').map((r) => r.specKey);
  for (let i = 0; i < tableRows.length; i += TABLE_ROWS) shots.push({ kind: 'table', specKeys: tableRows.slice(i, i + TABLE_ROWS), durationSec: PACE.table });
  for (const r of rows.filter(spotlightable)) shots.push({ kind: 'spotlight', specKeys: [r.specKey], durationSec: PACE.spotlight });
  return shots;
}

const sum = (shots: Shot[]) => Math.round(shots.reduce((a, x) => a + x.durationSec, 0) * 10) / 10;

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
  const catKeys = opts.categories ?? s.categories.filter((c) => c.video.enabledByDefault && c.key !== 'recommendation').map((c) => c.key);
  const scenes: Scene[] = [];
  const fixedScene = (id: string, type: string, kind: Shot['kind'], narration: string, extra: Partial<Scene> = {}): Scene =>
    ({ id, type, facts: [], shots: [{ kind, specKeys: [], durationSec: PACE[kind as keyof typeof PACE] }], durationSec: PACE[kind as keyof typeof PACE], narration, ...extra });

  scenes.push(fixedScene('intro', 'intro', 'intro', t(lang, 'intro', { phones: s.phones.map((p) => name(s, p.id)).join(' vs ') })));
  scenes.push(fixedScene('reveal', 'phoneReveal', 'reveal', ''));
  let verdict: Scene | null = null;
  if (s.phones.length > 1) {
    const rec = recommend(s, weights);
    verdict = fixedScene('verdict', 'verdict', 'verdict',
      rec.bestPhoneId ? t(lang, 'verdict', { phone: name(s, rec.bestPhoneId) }) : t(lang, 'verdictClose'), { highlightPhoneId: rec.bestPhoneId });
  }
  const outro = fixedScene('outro', 'outro', 'outro', t(lang, 'outro'));

  // Time left for category scenes when a target length is set.
  let budget = opts.durationSec === undefined ? Infinity
    : opts.durationSec - sum([...scenes, verdict, outro].filter(Boolean).flatMap((x) => x!.shots));

  for (const key of catKeys) {
    const cat = s.categories.find((c) => c.key === key);
    if (!cat) throw new Error(`Unknown category in storyboard: ${key}`);
    let rows = rankRows(cat.rows, s.phones.length);
    if (!rows.length) continue;
    let shots = planShots(rows);
    // Trim lowest-priority rows until the scene fits the remaining budget.
    while (sum(shots) > budget && rows.length > 1) { rows = rows.slice(0, -1); shots = planShots(rows); }
    if (sum(shots) > budget) break;
    budget -= sum(shots);
    scenes.push({
      id: `cat-${key}`, type: cat.video.sceneType, categoryKey: key,
      facts: rows.flatMap((r) => availableCells(r).map((c) => ({ categoryKey: key, specKey: r.specKey, phoneId: c.phoneId, display: c.display, isBest: c.isBest }))),
      shots, durationSec: sum(shots),
      narration: rows.map((r) => narrateRow(s, lang, r)).join(' '),
    });
  }
  if (verdict) scenes.push(verdict);
  scenes.push(outro);
  return { snapshotHash: s.contentHash, language: lang, weights, scenes };
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

  const verdict = sb.scenes.find((x) => x.type === 'verdict');
  if (verdict && verdict.highlightPhoneId !== recommend(s, sb.weights).bestPhoneId) {
    issues.push({ sceneId: verdict.id, problem: 'Verdict phone differs from the recommendation for these priorities' });
  }

  for (const sc of sb.scenes) {
    const total = Math.round(sc.shots.reduce((a, x) => a + x.durationSec, 0) * 10) / 10;
    if (Math.abs(total - sc.durationSec) > 0.05) issues.push({ sceneId: sc.id, problem: `Shot times (${total}s) don't add up to the scene length (${sc.durationSec}s)` });
    for (const shot of sc.shots) {
      if (shot.durationSec < MIN_SHOT_SEC) issues.push({ sceneId: sc.id, problem: `A ${shot.kind} card is on screen for ${shot.durationSec}s; viewers need at least ${MIN_SHOT_SEC}s to read it` });
      if (shot.kind === 'table' && shot.specKeys.length > TABLE_ROWS) issues.push({ sceneId: sc.id, problem: `Table card has ${shot.specKeys.length} rows; the limit is ${TABLE_ROWS}` });
      for (const k of shot.specKeys) if (!sc.facts.some((f) => f.specKey === k)) issues.push({ sceneId: sc.id, problem: `Card shows ${k}, which has no verified facts in this scene` });
    }
  }

  const phoneNums = s.phones.flatMap((p) => nums(`${p.brand} ${p.model} ${p.variant ?? ''}`));
  for (const sc of sb.scenes) {
    for (const f of sc.facts) {
      const cell = s.categories.find((c) => c.key === f.categoryKey)?.rows.find((r) => r.specKey === f.specKey)?.cells.find((c) => c.phoneId === f.phoneId);
      if (!cell) issues.push({ sceneId: sc.id, problem: `Fact ${f.specKey}/${f.phoneId} not in snapshot` });
      else if (cell.status !== 'available') issues.push({ sceneId: sc.id, problem: `Fact ${f.specKey}/${f.phoneId} is not verified` });
      else if (cell.display !== f.display || cell.isBest !== f.isBest) issues.push({ sceneId: sc.id, problem: `Fact ${f.specKey}/${f.phoneId} differs from snapshot` });
    }
    // Every number spoken must come from this scene's facts (or a phone name).
    // Numbers inside a spec's own name ("5G", "Wi-Fi 7" labels) are not claims.
    const labelNums = sc.facts.flatMap((f) => nums(specLabel(sb.language, f.specKey)));
    const allowed = new Set([...sc.facts.flatMap((f) => nums(f.display)), ...phoneNums, ...labelNums]);
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
