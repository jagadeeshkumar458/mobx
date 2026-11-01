import { test } from 'node:test';
import assert from 'node:assert/strict';
import seed from '../../../database/seed/phones.json' with { type: 'json' };
import { validatePhoneRecords, buildSnapshot, defaultRegistry, toStoryboard, validateStoryboard, type PhoneRecord } from '../src/index.ts';
import * as fx from './fixtures.ts';

// JSON is untrusted input; the validator test below is what vouches for it.
const records = seed.records as unknown as PhoneRecord[];
const snap = () => buildSnapshot(records, defaultRegistry);
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

test('Samsung figures from unconfirmed reports are labelled and never win', () => {
  const upd = cell('software', 'os_updates_years', 'samsung-galaxy-s26');
  assert.equal(upd.status, 'not_verified');
  assert.match(upd.display, /not verified/);
  assert.deepEqual(row('price', 'current_price_inr').winnerIds, []);
});

test('brightness measured differently (peak vs outdoor peak) is not ranked', () => {
  assert.equal(row('display', 'peak_brightness_nits').note, 'incomparable_conditions');
});

test('verified differences are ranked', () => {
  assert.deepEqual(row('camera', 'optical_zoom_x').winnerIds, ['google-pixel-11']);
  assert.deepEqual(row('camera', 'video_max').winnerIds, ['apple-iphone-18-pro']);
  assert.deepEqual(row('design', 'weight_g').winnerIds, ['samsung-galaxy-s26']);
  assert.deepEqual(row('battery', 'battery_mah').winnerIds, ['google-pixel-11']);
  assert.equal(row('display', 'refresh_rate_hz').note, 'tie');
});

test('video storyboard from the real phones validates', () => {
  const s = snap();
  for (const language of ['en', 'te'] as const) assert.deepEqual(validateStoryboard(toStoryboard(s, { language }), s), []);
});
