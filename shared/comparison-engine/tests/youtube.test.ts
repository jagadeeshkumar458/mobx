import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSnapshot, defaultRegistry, toStoryboard, toPublishKit, toChapters, toScript, toSrt, specLabel, YT_LIMITS, type PhoneRecord } from '../src/index.ts';

const seed = JSON.parse(fs.readFileSync(new URL('../../../database/seed/phones.json', import.meta.url), 'utf8')).records as PhoneRecord[];
const pick = (...ids: string[]) => ids.map((id) => seed.find((p) => p.id === id)!);
const opts = { categoryLabel: (k: string) => k[0].toUpperCase() + k.slice(1), specLabel: (k: string) => specLabel('en', k) };
const trio = buildSnapshot(pick('google-pixel-10', 'apple-iphone-17', 'samsung-galaxy-s26'), defaultRegistry);

test('Android and Apple phones are scored side by side in the core categories', () => {
  for (const key of ['camera', 'display', 'design', 'connectivity', 'price']) {
    const cat = trio.categories.find((c) => c.key === key)!;
    for (const p of trio.phones) assert.notEqual(cat.scores[p.id], null, `${p.id} has no ${key} score`);
  }
});

test('publish kit respects YouTube limits', () => {
  for (const dur of [undefined, 60, 180]) {
    const sb = toStoryboard(trio, { durationSec: dur });
    const kit = toPublishKit(trio, sb, opts);
    assert.ok(kit.titles.length >= 3);
    for (const t of kit.titles) { assert.ok(t.length <= YT_LIMITS.title, t); assert.match(t, /Pixel 10 vs iPhone 17 vs Galaxy S26/); }
    assert.ok(kit.description.length <= YT_LIMITS.description, `description is ${kit.description.length} chars`);
    assert.ok(kit.tags.join(',').length <= YT_LIMITS.tags);
    assert.equal(new Set(kit.tags).size, kit.tags.length);
    assert.match(kit.description, new RegExp(trio.contentHash.slice(0, 12)));
  }
});

test('chapters start at 0:00, are at least 10 s long and stay inside the video', () => {
  for (const dur of [undefined, 60, 90, 300]) {
    const sb = toStoryboard(trio, { durationSec: dur });
    const total = sb.scenes.reduce((a, s) => a + s.durationSec, 0);
    const ch = toChapters(sb, opts.categoryLabel);
    assert.equal(ch[0].startSec, 0);
    ch.forEach((c, i) => {
      const end = i < ch.length - 1 ? ch[i + 1].startSec : total;
      assert.ok(end - c.startSec >= YT_LIMITS.minChapterSec - 0.5, `${c.label} is ${end - c.startSec}s`);
    });
  }
});

test('captions cover the video in order and the script carries every narration', () => {
  const sb = toStoryboard(trio);
  const total = sb.scenes.reduce((a, s) => a + s.durationSec, 0);
  const toSec = (t: string) => { const [h, m, s] = t.replace(',', '.').split(':').map(Number); return h * 3600 + m * 60 + s; };
  const cues = toSrt(sb).trim().split('\n\n').map((c) => c.split('\n')[1].split(' --> ').map(toSec));
  let last = 0;
  for (const [a, b] of cues) { assert.ok(a >= last - 0.002 && b > a); last = b; }
  assert.ok(last <= total + 0.01);
  const script = toScript(sb, (sc) => sc.type);
  for (const sc of sb.scenes) if (sc.narration) assert.ok(script.includes(sc.narration.trim()));
});

test('voiceover pacing gives every scene enough time for its narration and still validates', async () => {
  const { validateStoryboard, speakSec } = await import('../src/index.ts');
  const sb = toStoryboard(trio, { pace: 'voiceover' });
  for (const sc of sb.scenes) assert.ok(sc.durationSec >= speakSec(sc.narration) - 0.5, `${sc.id}: ${sc.durationSec}s for ${speakSec(sc.narration)}s of narration`);
  assert.deepEqual(validateStoryboard(sb, trio), []);
});
