import { test } from 'node:test';
import assert from 'node:assert/strict';
import seed from '../../../database/seed/phones.json' with { type: 'json' };
import { validatePhoneRecords, buildSnapshot, defaultRegistry, toStoryboard, validateStoryboard, type PhoneRecord } from '../src/index.ts';
import * as fx from './fixtures.ts';

// JSON is untrusted input; the validator test below is what vouches for it.
const records = seed.records as unknown as PhoneRecord[];
const FIRST = ['google-pixel-11', 'apple-iphone-18-pro', 'samsung-galaxy-s26'];
const pick = (ids: string[]) => ids.map((id) => records.find((r) => r.id === id)!);
const snap = () => buildSnapshot(pick(FIRST), defaultRegistry);
const row = (cat: string, spec: string) => snap().categories.find((c) => c.key === cat)!.rows.find((r) => r.specKey === spec)!;
const cell = (cat: string, spec: string, id: string) => row(cat, spec).cells.find((c) => c.phoneId === id)!;

test('seed records pass the import validator', () => {
  assert.deepEqual(validatePhoneRecords(records, defaultRegistry), []);
});

test('validator rejects values without a source, wrong types and unknown keys', () => {
  const bad: PhoneRecord = { id: 'x', brand: 'X', model: 'Y', specs: {
    battery_mah: { value: '5000', sourceType: 'manufacturer', verification: 'verified', lastUpdated: '2026-11-02', sourceUrl: 'https://a.test' },
    refresh_rate_hz: { value: 120, sourceType: 'manufacturer', verification: 'verified', lastUpdated: '2026-11-02' },
    made_up_spec: { value: 1, sourceType: 'manufacturer', verification: 'verified', lastUpdated: '2026-11-02', sourceUrl: 'https://a.test' },
    antutu: { value: 1, sourceType: 'estimated', verification: 'verified', lastUpdated: '2026-11-02', sourceUrl: 'https://a.test' },
  } };
  const problems = validatePhoneRecords([bad], defaultRegistry).map((i) => `${i.specKey}: ${i.problem}`);
  assert.ok(problems.some((p) => p.startsWith('battery_mah: Value must be a number')));
  assert.ok(problems.some((p) => p.startsWith('refresh_rate_hz: A https source URL')));
  assert.ok(problems.some((p) => p.startsWith('made_up_spec: Unknown spec key')));
  assert.ok(problems.some((p) => p.startsWith('antutu: Estimated or unverified')));
  assert.ok(problems.some((p) => p.startsWith('antutu: Measurement condition "version"')));
});

test('test fixtures also pass the validator', () => {
  assert.deepEqual(validatePhoneRecords([fx.alpha, fx.beta, fx.gamma, fx.delta, fx.epsilon], defaultRegistry), []);
});

test('values no source stated stay "Not available"', () => {
  assert.equal(cell('battery', 'battery_mah', 'apple-iphone-18-pro').display, 'Not available');
  assert.equal(cell('battery', 'wired_charging_w', 'apple-iphone-18-pro').display, 'Not available');
  assert.equal(cell('performance', 'antutu', 'google-pixel-11').display, 'Not available');
});

test('unconfirmed figures are labelled and never win', () => {
  // The ₹99,999 price-hike headline could not be confirmed, so it stays unverified.
  const price = cell('price', 'current_price_inr', 'samsung-galaxy-s26');
  assert.equal(price.status, 'not_verified');
  assert.match(price.display, /not verified/);
  assert.deepEqual(row('price', 'current_price_inr').winnerIds, []);
  // Every seed value marked unverified must also be shown as such.
  for (const r of records) for (const [k, v] of Object.entries(r.specs)) {
    if (v.verification === 'unverified') assert.equal(v.sourceType, 'not_verified', `${r.id}.${k}`);
  }
});

test('brightness measured differently (peak vs outdoor peak) is not ranked', () => {
  assert.equal(row('display', 'peak_brightness_nits').note, 'incomparable_conditions');
});

test('verified differences are ranked', () => {
  assert.deepEqual(row('camera', 'optical_zoom_x').winnerIds, ['google-pixel-11']);
  assert.deepEqual(row('camera', 'video_max').winnerIds, ['samsung-galaxy-s26']); // 8K beats 4K120 in the rank list
  assert.deepEqual(row('design', 'weight_g').winnerIds, ['samsung-galaxy-s26']);
  assert.deepEqual(row('battery', 'battery_mah').winnerIds, ['google-pixel-11']);
  assert.equal(row('display', 'refresh_rate_hz').note, 'tie');
});

test('every real phone works in comparisons of up to five, page and video agreeing', () => {
  // Walk all records in groups of five so each phone is compared at least once.
  for (let i = 0; i < records.length; i += 5) {
    const s = buildSnapshot(records.slice(i, i + 5), defaultRegistry);
    for (const language of ['en', 'te'] as const) assert.deepEqual(validateStoryboard(toStoryboard(s, { language }), s), []);
  }
});

test('flagship batch: higher-is-better and lower-is-better rank correctly', () => {
  const s = buildSnapshot(pick(['poco-x8-pro-max', 'oneplus-15', 'tecno-pova-curve-2']), defaultRegistry);
  const r = (cat: string, spec: string) => s.categories.find((c) => c.key === cat)!.rows.find((x) => x.specKey === spec)!;
  assert.deepEqual(r('battery', 'battery_mah').winnerIds, ['poco-x8-pro-max']);
  assert.deepEqual(r('battery', 'wired_charging_w').winnerIds, ['oneplus-15']);
  assert.deepEqual(r('price', 'launch_price_inr').winnerIds, ['tecno-pova-curve-2']);
  assert.deepEqual(r('display', 'refresh_rate_hz').winnerIds, ['oneplus-15']);
});

test('phone ids are unique and every record has brand, model, variant and region', () => {
  assert.equal(new Set(records.map((r) => r.id)).size, records.length);
  for (const r of records) assert.ok(r.brand && r.model && r.variant && r.region, r.id);
});
