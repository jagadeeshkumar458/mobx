import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSnapshot, verifySnapshot, defaultRegistry, toDashboard, toStoryboard,
  validateStoryboard, assertRenderable, recommend,
} from '../src/index.ts';
import { alpha, beta, gamma, delta, epsilon, fixedNow } from './fixtures.ts';

const snap = (...p: typeof alpha[]) => buildSnapshot(p, defaultRegistry, { now: fixedNow });
const row = (s: ReturnType<typeof snap>, cat: string, spec: string) =>
  s.categories.find((c) => c.key === cat)!.rows.find((r) => r.specKey === spec)!;

// ---- Single source of truth --------------------------------------------------

test('every video fact is byte-identical to the dashboard cell it came from', () => {
  const s = snap(alpha, beta, gamma);
  const dash = toDashboard(s, 'techie');
  const sb = toStoryboard(s, { durationSec: 90 });
  const facts = sb.scenes.flatMap((sc) => sc.facts);
  assert.ok(facts.length > 10, 'storyboard should carry facts');
  for (const f of facts) {
    const cell = dash.categories.find((c) => c.key === f.categoryKey)!.rows.find((r) => r.specKey === f.specKey)!.cells.find((c) => c.phoneId === f.phoneId)!;
    assert.equal(f.display, cell.display);
    assert.equal(f.isBest, cell.isBest);
  }
  assert.equal(dash.snapshotHash, sb.snapshotHash);
});

test('the verdict scene and the dashboard agree for the same weights', () => {
  const s = snap(alpha, beta);
  const weights = { battery: 3, price: 3 };
  const dashRec = toDashboard(s, 'quick', weights).recommendation;
  const sb = toStoryboard(s, { weights });
  const verdict = sb.scenes.find((x) => x.id === 'verdict')!.narration;
  assert.ok(dashRec.bestPhoneId);
  const winner = s.phones.find((p) => p.id === dashRec.bestPhoneId)!;
  assert.ok(verdict.includes(winner.model), `verdict "${verdict}" should name ${winner.model}`);
});

test('snapshot is frozen and its hash is deterministic', () => {
  const a = snap(alpha, beta);
  const b = buildSnapshot([alpha, beta], defaultRegistry, { now: () => new Date('2030-01-01') });
  assert.equal(a.contentHash, b.contentHash, 'createdAt must not affect the hash');
  assert.ok(verifySnapshot(a));
  assert.throws(() => { (a.categories[0].rows[0].cells[0] as { display: string }).display = 'hacked'; });
});

test('render is refused if the storyboard points at a different snapshot', () => {
  const s1 = snap(alpha, beta);
  const s2 = snap(alpha, gamma);
  const sb = toStoryboard(s1);
  assert.throws(() => assertRenderable(sb, s2), /failed validation/);
});

test('a tampered snapshot fails hash verification', () => {
  const s = snap(alpha, beta);
  const forged = JSON.parse(JSON.stringify(s));
  forged.categories[0].rows[2].cells[0].display = '9,999,999';
  assert.equal(verifySnapshot(forged), false);
});

test('user-edited narration cannot introduce numbers that are not in the snapshot', () => {
  const s = snap(alpha, beta);
  const sb = toStoryboard(s);
  const battery = sb.scenes.find((x) => x.categoryKey === 'battery')!;
  assert.deepEqual(validateStoryboard(sb, s), []);
  const edited = { ...sb, scenes: sb.scenes.map((x) => x === battery ? { ...x, narration: x.narration + ' It lasts 999 hours!', narrationEditedByUser: true } : x) };
  const issues = validateStoryboard(edited, s);
  assert.equal(issues.length, 1);
  assert.match(issues[0].problem, /999/);
});

test('editing a fact value in the storyboard is caught', () => {
  const s = snap(alpha, beta);
  const sb = toStoryboard(s);
  const sc = sb.scenes.find((x) => x.facts.length)!;
  const tampered = { ...sb, scenes: sb.scenes.map((x) => x === sc ? { ...x, facts: [{ ...x.facts[0], display: '1 Hz' }, ...x.facts.slice(1)] } : x) };
  assert.ok(validateStoryboard(tampered, s).some((i) => /differs from snapshot/.test(i.problem)));
});

test('Telugu storyboard uses the same values as English', () => {
  const s = snap(alpha, beta);
  const en = toStoryboard(s, { language: 'en' });
  const te = toStoryboard(s, { language: 'te' });
  assert.deepEqual(te.scenes.map((x) => x.facts), en.scenes.map((x) => x.facts));
  assert.deepEqual(validateStoryboard(te, s), []);
  assert.match(te.scenes[0].narration, /చూద్దాం/);
});

// ---- Data honesty -------------------------------------------------------------

test('missing specs show "Not available" and never appear as video facts', () => {
  const s = snap(alpha, beta);
  const zoom = row(s, 'camera', 'optical_zoom_x');
  assert.equal(zoom.cells.find((c) => c.phoneId === 'fx-beta')!.display, 'Not available');
  assert.ok(s.warnings.some((w) => w.phoneId === 'fx-beta' && w.specKey === 'optical_zoom_x' && w.kind === 'missing'));
  const facts = toStoryboard(s).scenes.flatMap((x) => x.facts);
  assert.ok(!facts.some((f) => f.phoneId === 'fx-beta' && f.specKey === 'optical_zoom_x'));
});

test('unverified and user-reported values are shown but never win', () => {
  const s = snap(alpha, beta, gamma);
  const batt = row(s, 'battery', 'battery_mah');
  const g = batt.cells.find((c) => c.phoneId === 'fx-gamma')!;
  assert.equal(g.status, 'not_verified');
  assert.match(g.display, /not verified/);
  assert.deepEqual(batt.winnerIds, ['fx-beta']);
  const charge = row(s, 'battery', 'wired_charging_w');
  assert.ok(!charge.winnerIds.includes('fx-gamma'), 'user-reported 120 W must not beat verified figures');
});

test('benchmarks from different versions are not ranked against each other', () => {
  const s = snap(alpha, gamma);
  const r = row(s, 'performance', 'antutu');
  assert.equal(r.comparable, false);
  assert.equal(r.note, 'incomparable_conditions');
  assert.deepEqual(r.winnerIds, []);
  const same = row(snap(alpha, beta), 'performance', 'antutu');
  assert.deepEqual(same.winnerIds, ['fx-alpha']);
});

test('lower-is-better specs and meaningful-difference thresholds', () => {
  const s = snap(alpha, beta);
  assert.deepEqual(row(s, 'price', 'current_price_inr').winnerIds, ['fx-beta']);
  assert.deepEqual(row(s, 'design', 'weight_g').winnerIds, ['fx-alpha']);
  // 7.5 h vs 8.2 h is below the 0.75 h threshold → no highlighted winner
  const sot = row(s, 'battery', 'screen_on_time_h');
  assert.equal(sot.note, 'not_meaningful');
  assert.deepEqual(sot.winnerIds, []);
});

test('megapixels and chipset names are shown, never ranked', () => {
  const s = snap(alpha, beta);
  assert.equal(row(s, 'camera', 'main_camera_mp').winnerIds.length, 0);
  assert.equal(row(s, 'performance', 'chipset').winnerIds.length, 0);
});

// ---- Selection rules & recommendations ---------------------------------------

test('supports 1–5 phones, rejects 6 and duplicates', () => {
  assert.ok(snap(alpha));
  const five = snap(alpha, beta, gamma, delta, epsilon);
  assert.equal(five.phones.length, 5);
  assert.throws(() => snap(alpha, beta, gamma, delta, epsilon, { ...alpha, id: 'six' }), /between 1 and 5/);
  assert.throws(() => snap(alpha, alpha), /Duplicate/);
  const sb = toStoryboard(five, { durationSec: 60 });
  for (const sc of sb.scenes) assert.ok(sc.facts.length <= 10, `scene ${sc.id} overcrowded: ${sc.facts.length} facts`);
  assert.deepEqual(validateStoryboard(sb, five), []);
});

test('changing priorities changes the recommendation, using only the snapshot', () => {
  const s = snap(alpha, beta);
  const perf = recommend(s, { performance: 5, display: 3 });
  const budget = recommend(s, { price: 5, battery: 3 });
  assert.equal(perf.bestPhoneId, 'fx-alpha');
  assert.equal(budget.bestPhoneId, 'fx-beta');
});

test('view modes filter rows of the same snapshot without changing values', () => {
  const s = snap(alpha, beta);
  const quick = toDashboard(s, 'quick');
  const techie = toDashboard(s, 'techie');
  const count = (d: typeof quick) => d.categories.reduce((a, c) => a + c.rows.length, 0);
  assert.ok(count(quick) < count(techie));
  const q = quick.categories.find((c) => c.key === 'display')!.rows.find((r) => r.specKey === 'refresh_rate_hz')!;
  const t = techie.categories.find((c) => c.key === 'display')!.rows.find((r) => r.specKey === 'refresh_rate_hz')!;
  assert.deepEqual(q, t);
});
