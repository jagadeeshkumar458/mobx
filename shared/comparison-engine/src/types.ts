// MobileVerse comparison engine — shared types.
// The ComparisonSnapshot is the single source of truth: the dashboard and the
// video engine consume it and never read phone records directly.

export type SourceType =
  | 'manufacturer'
  | 'independently_measured'
  | 'spec_database'
  | 'expert_review'
  | 'user_reported'
  | 'official_issue'
  | 'estimated'
  | 'not_verified';

export type Verification = 'verified' | 'unverified';

/** One provenance-tracked spec value. Absent key = not available. */
export interface SpecValue {
  value: number | string | boolean | string[];
  unit?: string;
  sourceUrl?: string;
  sourceType: SourceType;
  verification: Verification;
  lastUpdated: string; // ISO date
  region?: string; // e.g. "IN", "GLOBAL"
  variant?: string; // e.g. "12GB/256GB"
  /** Measurement conditions, e.g. { version: "AnTuTu v10" }. */
  conditions?: Record<string, string>;
}

export interface PhoneRecord {
  id: string;
  brand: string;
  model: string;
  variant?: string;
  region?: string;
  imageAssetId?: string;
  specs: Record<string, SpecValue>;
}

export type Priority = 'P0' | 'P1' | 'P2';
export type Tier = 'quick' | 'detailed' | 'techie';
export type WeightGroup =
  | 'performance' | 'camera' | 'battery' | 'display'
  | 'software' | 'price' | 'ai' | 'design' | 'none';

export interface CategoryDefinition {
  key: string;
  order: number;
  priority: Priority;
  labelKey: string; // i18n key
  descriptionKey: string;
  weightGroup: WeightGroup;
  video: { sceneType: string; maxFactsPerScene: number; enabledByDefault: boolean };
}

export type SpecType = 'number' | 'boolean' | 'enum' | 'text' | 'list';

export interface SpecDefinition {
  key: string;
  categoryKey: string;
  order: number;
  labelKey: string;
  explainKey?: string; // "why this matters" text key
  type: SpecType;
  unit?: string;
  tier: Tier; // lowest view mode that shows it
  /** How to pick the strongest value. 'none' = shown, never ranked. */
  direction: 'higher' | 'lower' | 'rank' | 'none';
  /** For direction 'rank': best first. */
  rankOrder?: string[];
  /** Differences smaller than this are "not meaningful" (no highlight). */
  minMeaningfulDelta?: number;
  /** Condition keys that must match for values to be comparable. */
  comparableBy?: string[];
  /** Relative importance inside its category (0–1). */
  weight: number;
}

export interface Registry {
  version: string;
  categories: CategoryDefinition[];
  specs: SpecDefinition[];
}

export interface Cell {
  phoneId: string;
  status: 'available' | 'not_available' | 'not_verified';
  /** Canonical display string — the ONLY text either surface may show. */
  display: string;
  value?: SpecValue['value'];
  unit?: string;
  sourceType?: SourceType;
  sourceUrl?: string;
  lastUpdated?: string;
  conditions?: Record<string, string>;
  isBest: boolean;
}

export interface Row {
  specKey: string;
  labelKey: string;
  explainKey?: string;
  tier: Tier;
  cells: Cell[];
  winnerIds: string[];
  comparable: boolean;
  meaningful: boolean;
  note?: 'incomparable_conditions' | 'insufficient_verified_data' | 'tie' | 'not_meaningful';
}

export interface CategoryResult {
  key: string;
  priority: Priority;
  labelKey: string;
  weightGroup: WeightGroup;
  video: CategoryDefinition['video'];
  rows: Row[];
  /** Per-phone category score 0–100 from verified, comparable rows only. */
  scores: Record<string, number | null>;
  winnerIds: string[];
  coverage: number; // share of cells with verified data
}

export interface ComparisonSnapshot {
  schema: 'mobileverse.snapshot/1';
  engineVersion: string;
  registryVersion: string;
  createdAt: string;
  phones: { id: string; brand: string; model: string; variant?: string; region?: string; imageAssetId?: string }[];
  categories: CategoryResult[];
  warnings: { phoneId: string; specKey: string; kind: 'missing' | 'unverified' }[];
  /** sha256 of everything above except createdAt. */
  contentHash: string;
}

export type Weights = Partial<Record<Exclude<WeightGroup, 'none'>, number>>;
