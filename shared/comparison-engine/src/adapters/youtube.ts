// YouTube publish kit: titles, description with chapters, tags, script and captions.
// Everything is derived from the snapshot and its storyboard, so the text under
// the video can never disagree with the video or the comparison page.
import type { Cell, ComparisonSnapshot } from '../types.ts';
import { recommend } from '../recommend.ts';
import type { Storyboard } from './video.ts';

export const YT_LIMITS = { title: 100, description: 5000, tags: 500, minChapterSec: 10, minChapters: 3, shortsMaxSec: 180 } as const;
/** Comfortable narration pace, words per second (~150 wpm). */
export const WORDS_PER_SEC = 2.5;

export interface Chapter { startSec: number; label: string }
export interface PublishKit {
  titles: string[];
  description: string;
  chapters: Chapter[];
  tags: string[];
  hashtags: string[];
  pinnedComment: string;
}
export interface KitOptions {
  categoryLabel: (key: string) => string;
  specLabel: (key: string) => string;
  /** Link back to the comparison page, added to the description when given. */
  pageUrl?: string;
}

type Phone = ComparisonSnapshot['phones'][number];

/** "Pixel 10", "iPhone 17", "Galaxy S26", but "OnePlus 15", "POCO X8 Pro". */
export function videoName(p: Phone): string {
  return /^(Pixel|iPhone|Galaxy)\b/i.test(p.model) ? p.model : `${p.brand} ${p.model}`;
}

export const timestamp = (sec: number) => {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
};

/** Chapters YouTube will accept: first at 0:00, each at least 10 s long. */
export function toChapters(sb: Storyboard, categoryLabel: (k: string) => string): Chapter[] {
  const segs: { startSec: number; label: string; len: number }[] = [];
  let at = 0;
  for (const sc of sb.scenes) {
    const label = sc.categoryKey ? categoryLabel(sc.categoryKey) : sc.type === 'verdict' ? 'Verdict' : sc.type === 'intro' ? 'Intro' : '';
    // Unlabelled scenes (phone reveal, outro) belong to the chapter before them.
    if (label || !segs.length) segs.push({ startSec: at, label: label || 'Intro', len: sc.durationSec });
    else segs[segs.length - 1].len += sc.durationSec;
    at += sc.durationSec;
  }
  // Chapters under 10 s are merged into a neighbour (the next one, or the previous for the last).
  for (let i = 0; i < segs.length && segs.length > 1;) {
    if (segs[i].len >= YT_LIMITS.minChapterSec) { i++; continue; }
    const into = i < segs.length - 1 ? i + 1 : i - 1;
    const [first, second] = into > i ? [segs[i], segs[into]] : [segs[into], segs[i]];
    segs.splice(Math.min(i, into), 2, { startSec: first.startSec, label: `${first.label} & ${second.label}`, len: first.len + second.len });
    if (into < i) i--;
  }
  return segs.map(({ startSec, label }) => ({ startSec: Math.round(startSec), label }));
}

const fit = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`);

function cellOf(s: ComparisonSnapshot, specKey: string, phoneId: string): Cell | undefined {
  for (const c of s.categories) {
    const r = c.rows.find((x) => x.specKey === specKey);
    if (r) return r.cells.find((x) => x.phoneId === phoneId);
  }
  return undefined;
}

const KEY_SPECS = ['launch_price_inr', 'chipset', 'screen_size_in', 'display_tech', 'refresh_rate_hz', 'main_camera_mp', 'battery_mah', 'wired_charging_w', 'os_at_launch', 'os_updates_years', 'weight_g'];

export function toPublishKit(s: ComparisonSnapshot, sb: Storyboard, o: KitOptions): PublishKit {
  const names = s.phones.map(videoName);
  const vs = names.join(' vs ');
  const year = s.createdAt.slice(0, 4);
  const rec = s.phones.length > 1 ? recommend(s, sb.weights) : null;
  const best = rec?.bestPhoneId ? videoName(s.phones.find((p) => p.id === rec.bestPhoneId)!) : null;
  const scored = s.categories.filter((c) => c.weightGroup !== 'none' && Object.values(c.scores).some((v) => v !== null));
  const wins = (id: string) => scored.filter((c) => c.winnerIds.length === 1 && c.winnerIds[0] === id).map((c) => o.categoryLabel(c.key));
  const specCount = sb.scenes.reduce((a, sc) => a + new Set(sc.facts.map((f) => f.specKey)).size, 0);
  const topics = sb.scenes.filter((sc) => sc.categoryKey).slice(0, 4).map((sc) => o.categoryLabel(sc.categoryKey!).split(' ')[0]);

  const titles = (s.phones.length > 1 ? [
    `${vs}: Which One Should You Buy in ${year}?`,
    `${vs} — Full Specs Comparison (${topics.join(', ')})`,
    `${vs} | ${specCount} Specs Compared, ${best ? 'One Winner' : 'Too Close to Call'}`,
    best && wins(rec!.bestPhoneId!).length ? `${best} Wins ${wins(rec!.bestPhoneId!).slice(0, 2).join(' & ')}? ${vs} Compared` : `${vs}: The Differences That Actually Matter`,
  ] : [
    `${vs}: Full Specs, Price and Features (${year})`,
    `${vs} — Everything the Spec Sheet Says`,
  ]).map((t) => fit(t, YT_LIMITS.title));

  const chapters = toChapters(sb, o.categoryLabel);

  const verdictLines = s.phones.length > 1 ? [
    ...scored.map((c) => `${o.categoryLabel(c.key)}: ${c.winnerIds.length === 1 ? videoName(s.phones.find((p) => p.id === c.winnerIds[0])!) : 'too close to call'}`),
    `Overall (for the priorities used in this video): ${best ?? 'too close to call'}`,
  ] : [];

  const specLines = s.phones.map((p) => {
    const parts = KEY_SPECS.map((k) => { const c = cellOf(s, k, p.id); return c?.status === 'available' ? `${o.specLabel(k)}: ${c.display}` : ''; }).filter(Boolean);
    return `${p.brand} ${p.model}${p.variant ? ` (${p.variant})` : ''}\n${parts.map((x) => `• ${x}`).join('\n')}`;
  });

  const sourceLines = s.phones.map((p) => {
    const urls = new Set<string>();
    for (const c of s.categories) for (const r of c.rows) {
      const cell = r.cells.find((x) => x.phoneId === p.id);
      if (cell?.status === 'available' && cell.sourceUrl && !cell.sourceUrl.includes('example.test')) urls.add(cell.sourceUrl);
    }
    return urls.size ? `${p.brand} ${p.model}:\n${[...urls].map((u) => `• ${u}`).join('\n')}` : '';
  }).filter(Boolean);

  const tagBase = (x: string) => x.toLowerCase().replace(/[^a-z0-9+ ]/g, ' ').replace(/\s+/g, ' ').trim();
  const pairs = names.flatMap((a, i) => names.slice(i + 1).map((b) => `${a} vs ${b}`));
  const tagPool = [vs, ...pairs, ...names, ...names.map((n) => `${n} specs`), ...names.map((n) => `${n} price in india`),
    ...new Set(s.phones.map((p) => p.brand)), 'phone comparison', 'smartphone comparison', `best phone ${year}`, 'specs comparison', 'which phone to buy', 'camera comparison', 'battery comparison'];
  const tags: string[] = [];
  let used = 0;
  for (const raw of tagPool) {
    const tag = tagBase(raw);
    if (!tag || tags.includes(tag) || used + tag.length + 1 > YT_LIMITS.tags) continue;
    tags.push(tag); used += tag.length + 1;
  }
  const hashtags = [...new Set([...names.map((n) => `#${n.replace(/[^A-Za-z0-9]/g, '')}`), '#PhoneComparison', '#Smartphone'])].slice(0, 5);

  const head = [
    s.phones.length > 1
      ? `${vs}: ${specCount} specs compared side by side — ${topics.join(', ').toLowerCase()} and more. Every figure comes from a cited source; nothing is estimated.`
      : `${vs}: ${specCount} specs from cited sources.`,
    o.pageUrl ? `Interactive comparison: ${o.pageUrl}` : '',
    '', 'CHAPTERS', ...chapters.map((c) => `${timestamp(c.startSec)} ${c.label}`),
    ...(verdictLines.length ? ['', 'WHO WINS WHAT', ...verdictLines] : []),
    '', 'KEY SPECS', specLines.join('\n\n'),
  ].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n');
  const tail = ['', 'Prices are India launch prices for the variant shown. A spec that no source states is left out rather than guessed.',
    `Data snapshot ${s.contentHash.slice(0, 12)}.`, '', hashtags.join(' ')].join('\n');
  // Sources go in as long as they fit YouTube's description limit.
  let sources = sourceLines.length ? `\n\nSOURCES\n${sourceLines.join('\n\n')}` : '';
  if ((head + sources + tail).length > YT_LIMITS.description) {
    const room = YT_LIMITS.description - head.length - tail.length - 80;
    const cut = sources.slice(0, Math.max(0, room));
    sources = room > 200 ? `${cut.slice(0, cut.lastIndexOf('\n'))}\n• More sources on the comparison page` : '';
  }
  const description = head + sources + tail;

  const pinnedComment = s.phones.length > 1
    ? `Which one would you pick — ${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}? Tell us what matters most to you (camera, battery, price) and which phones to compare next.`
    : `What should we compare the ${names[0]} against? Drop the phone in the comments.`;

  return { titles, description, chapters, tags, hashtags, pinnedComment };
}

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);
/** Seconds a narrator needs for this text at a comfortable pace. */
export const speakSec = (text: string) => Math.round((wordCount(text) / WORDS_PER_SEC) * 10) / 10;

/** Voiceover script with a timestamp per scene. */
export function toScript(sb: Storyboard, sceneLabel: (sc: Storyboard['scenes'][number]) => string): string {
  let at = 0;
  const parts: string[] = [];
  for (const sc of sb.scenes) {
    if (sc.narration.trim()) parts.push(`[${timestamp(at)}] ${sceneLabel(sc).toUpperCase()} (${sc.durationSec}s on screen, ~${speakSec(sc.narration)}s to read)\n${sc.narration.trim()}`);
    at += sc.durationSec;
  }
  return `${parts.join('\n\n')}\n`;
}

const srtTime = (sec: number) => {
  const ms = Math.round(sec * 1000);
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

/** Captions (.srt): each scene's sentences share that scene's time, by length. */
export function toSrt(sb: Storyboard): string {
  const cues: string[] = [];
  let at = 0; let n = 1;
  for (const sc of sb.scenes) {
    const sentences = (sc.narration.match(/[^.!?。]+[.!?。]*\s*/g) ?? []).map((x) => x.trim()).filter(Boolean);
    const total = sentences.reduce((a, x) => a + x.length, 0);
    let t = at;
    for (const sentence of sentences) {
      const len = (sentence.length / total) * sc.durationSec;
      cues.push(`${n++}\n${srtTime(t)} --> ${srtTime(t + len)}\n${sentence}`);
      t += len;
    }
    at += sc.durationSec;
  }
  return `${cues.join('\n\n')}\n`;
}
