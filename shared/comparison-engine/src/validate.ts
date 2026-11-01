import type { PhoneRecord, Registry, SpecValue } from './types.ts';

export interface RecordIssue { phoneId: string; specKey?: string; problem: string }

const SOURCE_TYPES = new Set([
  'manufacturer', 'independently_measured', 'spec_database', 'expert_review', 'user_reported', 'official_issue', 'estimated', 'not_verified',
]);

function typeMatches(type: string, v: SpecValue['value']): boolean {
  switch (type) {
    case 'number': return typeof v === 'number' && Number.isFinite(v);
    case 'boolean': return typeof v === 'boolean';
    case 'list': return Array.isArray(v);
    default: return typeof v === 'string' && v.trim() !== '';
  }
}

/**
 * Gate for every phone record entering the database (seed files, CSV/JSON
 * import, admin edits). A value without provenance is rejected, never guessed.
 */
export function validatePhoneRecords(records: PhoneRecord[], registry: Registry): RecordIssue[] {
  const issues: RecordIssue[] = [];
  const defs = new Map(registry.specs.map((d) => [d.key, d]));
  const seen = new Set<string>();

  for (const r of records) {
    if (!r.id || !r.brand || !r.model) issues.push({ phoneId: r.id ?? '?', problem: 'id, brand and model are required' });
    if (seen.has(r.id)) issues.push({ phoneId: r.id, problem: 'Duplicate phone id' });
    seen.add(r.id);

    for (const [key, sv] of Object.entries(r.specs ?? {})) {
      const def = defs.get(key);
      const bad = (problem: string) => issues.push({ phoneId: r.id, specKey: key, problem });
      if (!def) { bad('Unknown spec key (add a SpecDefinition first)'); continue; }
      if (!typeMatches(def.type, sv.value)) bad(`Value must be a ${def.type}`);
      if (def.direction === 'rank' && def.rankOrder && !def.rankOrder.includes(String(sv.value))) bad(`Value "${sv.value}" is not in the rank list`);
      if (!SOURCE_TYPES.has(sv.sourceType)) bad(`Unknown source type "${sv.sourceType}"`);
      if (!sv.sourceUrl || !/^https:\/\//.test(sv.sourceUrl)) bad('A https source URL is required');
      if (!sv.lastUpdated || Number.isNaN(Date.parse(sv.lastUpdated))) bad('lastUpdated must be a date');
      if (sv.verification === 'verified' && (sv.sourceType === 'not_verified' || sv.sourceType === 'estimated')) bad('Estimated or unverified values cannot be marked verified');
      if (def.unit && sv.unit && sv.unit !== def.unit) bad(`Unit must be ${def.unit}`);
      if (def.comparableBy) for (const c of def.comparableBy) if (!sv.conditions?.[c]) bad(`Measurement condition "${c}" is required`);
    }
  }
  return issues;
}
