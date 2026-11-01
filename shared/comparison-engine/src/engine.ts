import { sha256Hex } from './sha256.ts';
import type {
  Cell, CategoryResult, ComparisonSnapshot, PhoneRecord, Registry, Row, SpecDefinition, SpecValue,
} from './types.ts';

export const ENGINE_VERSION = '1.0.0';

/** Only these source types can decide a winner. Others are shown, labelled, never ranked. */
/** spec_database = compiled manufacturer specs (e.g. GSMArena); trusted, but always shown with its source. */
const TRUSTED = new Set(['manufacturer', 'spec_database', 'independently_measured', 'expert_review', 'official_issue']);

export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

export function hashSnapshot(s: Omit<ComparisonSnapshot, 'contentHash' | 'createdAt'>): string {
  return sha256Hex(canonicalJson(s));
}

/** The one and only formatter. Dashboard and video both show `cell.display`. */
export function formatValue(def: SpecDefinition, sv: SpecValue): string {
  const v = sv.value;
  const unit = sv.unit ?? def.unit;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.length ? v.join(', ') : 'None reported';
  if (typeof v === 'number') {
    if (unit === 'INR') return `₹${v.toLocaleString('en-IN')}`;
    const n = Number.isInteger(v) ? v.toLocaleString('en-IN') : String(v);
    return unit ? `${n} ${unit}` : n;
  }
  return unit ? `${v} ${unit}` : String(v);
}

function buildCell(def: SpecDefinition, phone: PhoneRecord): Cell {
  const sv = phone.specs[def.key];
  if (!sv) return { phoneId: phone.id, status: 'not_available', display: 'Not available', isBest: false };
  const verified = sv.verification === 'verified' && sv.sourceType !== 'not_verified';
  return {
    phoneId: phone.id,
    status: verified ? 'available' : 'not_verified',
    display: verified ? formatValue(def, sv) : `${formatValue(def, sv)} (not verified)`,
    value: sv.value, unit: sv.unit ?? def.unit,
    sourceType: sv.sourceType, sourceUrl: sv.sourceUrl, lastUpdated: sv.lastUpdated,
    conditions: sv.conditions, isBest: false,
  };
}

/** Numeric score of a cell for ranking; higher is always better. null = can't rank. */
function rankValue(def: SpecDefinition, cell: Cell): number | null {
  const v = cell.value;
  switch (def.direction) {
    case 'higher': return typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : null;
    case 'lower': return typeof v === 'number' ? -v : null;
    case 'rank': {
      const i = def.rankOrder?.indexOf(String(v)) ?? -1;
      return i < 0 ? null : (def.rankOrder!.length - i);
    }
    default: return null;
  }
}

interface RowWithScores extends Row { rowScores: Record<string, number> }

function buildRow(def: SpecDefinition, phones: PhoneRecord[]): RowWithScores {
  const cells = phones.map((p) => buildCell(def, p));
  const row: RowWithScores = {
    specKey: def.key, labelKey: def.labelKey, explainKey: def.explainKey, tier: def.tier,
    cells, winnerIds: [], comparable: true, meaningful: false, rowScores: {},
  };
  if (def.direction === 'none') return row;

  const eligible = cells.filter((c) => c.status === 'available' && TRUSTED.has(c.sourceType!) && rankValue(def, c) !== null);

  // Benchmarks, brightness, endurance etc. are only comparable under identical conditions.
  if (def.comparableBy?.length) {
    const groups = new Set(eligible.map((c) => def.comparableBy!.map((k) => c.conditions?.[k] ?? '?').join('|')));
    if (groups.size > 1 || [...groups].some((g) => g.includes('?'))) {
      row.comparable = false; row.note = 'incomparable_conditions';
      return row;
    }
  }
  if (eligible.length < 2) { row.note = 'insufficient_verified_data'; return row; }

  const vals = eligible.map((c) => ({ id: c.phoneId, r: rankValue(def, c)! }));
  const max = Math.max(...vals.map((x) => x.r));
  const min = Math.min(...vals.map((x) => x.r));
  for (const x of vals) row.rowScores[x.id] = max === min ? 1 : (x.r - min) / (max - min);

  if (max === min) { row.note = 'tie'; return row; }
  const top = vals.filter((x) => x.r === max).map((x) => x.id);
  const runnerUp = Math.max(...vals.filter((x) => x.r !== max).map((x) => x.r));
  const delta = def.direction === 'rank' || typeof eligible[0].value === 'boolean' ? Infinity : max - runnerUp;
  row.meaningful = delta >= (def.minMeaningfulDelta ?? 0);
  if (!row.meaningful) { row.note = 'not_meaningful'; return row; }
  row.winnerIds = top;
  for (const c of cells) c.isBest = top.includes(c.phoneId);
  return row;
}

export interface BuildOptions { now?: () => Date }

/** Builds the immutable snapshot. This is the ONLY place raw phone records are read. */
export function buildSnapshot(phones: PhoneRecord[], registry: Registry, opts: BuildOptions = {}): ComparisonSnapshot {
  if (phones.length < 1 || phones.length > 5) throw new Error('Select between 1 and 5 phones');
  if (new Set(phones.map((p) => p.id)).size !== phones.length) throw new Error('Duplicate phone selection');

  const warnings: ComparisonSnapshot['warnings'] = [];
  const categories: CategoryResult[] = [...registry.categories].sort((a, b) => a.order - b.order).map((cat) => {
    const defs = registry.specs.filter((d) => d.categoryKey === cat.key).sort((a, b) => a.order - b.order);
    const rows = defs.map((d) => buildRow(d, phones));

    const scores: Record<string, number | null> = {};
    for (const p of phones) {
      let num = 0; let den = 0;
      rows.forEach((r, i) => {
        if (r.rowScores[p.id] !== undefined) { num += r.rowScores[p.id] * defs[i].weight; den += defs[i].weight; }
      });
      scores[p.id] = den ? Math.round((num / den) * 100) : null;
    }
    const scored = Object.entries(scores).filter(([, v]) => v !== null) as [string, number][];
    let winnerIds: string[] = [];
    if (scored.length >= 2) {
      const best = Math.max(...scored.map(([, v]) => v));
      const second = Math.max(...scored.filter(([, v]) => v !== best).map(([, v]) => v), -Infinity);
      if (best - second >= 5) winnerIds = scored.filter(([, v]) => v === best).map(([k]) => k);
    }

    let verifiedCells = 0; let totalCells = 0;
    for (const r of rows) for (const cell of r.cells) {
      totalCells++;
      if (cell.status === 'available') verifiedCells++;
      else warnings.push({ phoneId: cell.phoneId, specKey: r.specKey, kind: cell.status === 'not_available' ? 'missing' : 'unverified' });
    }

    return {
      key: cat.key, priority: cat.priority, labelKey: cat.labelKey, weightGroup: cat.weightGroup, video: cat.video,
      rows: rows.map(({ rowScores: _drop, ...r }) => r),
      scores, winnerIds,
      coverage: totalCells ? Math.round((verifiedCells / totalCells) * 100) / 100 : 0,
    };
  });

  const body = {
    schema: 'mobileverse.snapshot/1' as const,
    engineVersion: ENGINE_VERSION,
    registryVersion: registry.version,
    phones: phones.map(({ id, brand, model, variant, region, imageAssetId }) => ({ id, brand, model, variant, region, imageAssetId })),
    categories, warnings,
  };
  const createdAt = (opts.now?.() ?? new Date()).toISOString();
  return deepFreeze({ ...body, createdAt, contentHash: hashSnapshot(body) });
}

export function verifySnapshot(s: ComparisonSnapshot): boolean {
  const { contentHash, createdAt: _c, ...body } = s;
  return hashSnapshot(body) === contentHash;
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') { Object.values(o).forEach(deepFreeze); Object.freeze(o); }
  return o;
}
