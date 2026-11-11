// MobileVerse engine demo. Everything shown here — the comparison table, the
// recommendation and the video storyboard — comes from ONE snapshot built by
// the shared engine, exactly as the real app will do on the server.
import {
  buildSnapshot, defaultRegistry, toDashboard, toStoryboard, validateStoryboard,
  DEFAULT_WEIGHTS, specLabel, toPublishKit, toScript, toSrt, videoName, timestamp, speakSec, recommend, YT_LIMITS, type ComparisonSnapshot, type PhoneRecord, type Storyboard, type Tier, type Weights,
} from '../shared/comparison-engine/src/index.ts';
// Real phones with a source on every value (validated in tests/seed.test.ts).
import seed from '../database/seed/phones.json' with { type: 'json' };
// Fictional test phones — not real products.
import { alpha, beta, gamma, delta, epsilon } from '../shared/comparison-engine/tests/fixtures.ts';
import { buildBeats, renderFrame, type Beat, type FrameContext } from './frames.ts';
import { icon, CATEGORY_ICON } from './icons.ts';
import { radarChart, scoreRing, RADAR_KEYS } from './charts.ts';
import { drawThumbnail, exportVideo, canExport, download, FORMATS, type Format } from './studio.ts';

const REAL = seed.records as unknown as PhoneRecord[];
const FICTIONAL = [alpha, beta, gamma, delta, epsilon];
const PHONES = [...REAL, ...FICTIONAL];
type Lang = 'en' | 'te';

const CATEGORY_LABELS: Record<string, string> = {
  overview: 'Overview',
  performance: 'Processor & performance', camera: 'Camera', display: 'Display', battery: 'Battery & charging',
  software: 'Software & updates', price: 'Price & value', ai: 'AI features', design: 'Build & design',
  audio: 'Audio', connectivity: 'Connectivity', biometrics: 'Biometrics & sensors', reliability: 'Reliability',
  service: 'Service & repair', ecosystem: 'Ecosystem', reviews: 'Reviews & ratings', recommendation: 'Recommendation',
};
const EXTRA_LABELS: Record<string, string> = {
  chipset: 'Chipset', process_node_nm: 'Process node', main_camera_mp: 'Main camera', main_sensor: 'Main sensor',
  main_sensor_size_inch: 'Sensor size', display_tech: 'Display type', screen_size_in: 'Screen size',
  os_at_launch: 'OS at launch', ai_assistant: 'AI assistant', frame_material: 'Frame', headphone_jack: '3.5 mm jack',
  esim: 'eSIM', known_issues: 'Known issues', cross_device_sharing: 'Cross-device sharing', expert_rating: 'Expert rating',
  launch_date: 'Launch date', dimensions_mm: 'Dimensions', colours: 'Colours', cpu: 'CPU', gpu: 'GPU', storage_options: 'Storage options',
  main_aperture: 'Main camera aperture', ultrawide_mp: 'Ultra-wide camera', telephoto_mp: 'Telephoto camera', front_camera_mp: 'Front camera',
  resolution: 'Resolution', screen_protection: 'Screen protection', back_material: 'Back', bluetooth_version: 'Bluetooth', usb: 'USB',
  face_unlock: 'Face unlock', ai_features: 'AI features', circle_to_search: 'Circle to Search',
};
const NOTE_TEXT: Record<string, string> = {
  incomparable_conditions: 'Measured under different test conditions, so not ranked',
  insufficient_verified_data: 'Not enough verified data to rank',
  tie: 'Tie',
  not_meaningful: 'Difference too small to matter',
};
const WEIGHT_LABELS: Record<string, string> = {
  performance: 'Performance', camera: 'Camera', battery: 'Battery', display: 'Display',
  software: 'Software', price: 'Price', ai: 'AI', design: 'Design',
};
const PROFILE_LABELS: Record<string, string> = {
  gamer: 'Gamers', photographer: 'Photographers', student: 'Students', business: 'Business', longTermUser: 'Long-term use',
};

const state = {
  selected: ['google-pixel-11', 'apple-iphone-18-pro', 'samsung-galaxy-s26'],
  mode: 'detailed' as Tier,
  weights: { ...DEFAULT_WEIGHTS } as Weights,
  lang: 'en' as Lang,
  duration: undefined as number | undefined, // undefined = auto: every comparable spec at reading pace
  edits: {} as Record<string, string>,
  pace: 'reading' as 'reading' | 'voiceover',
};

/** Creator inputs for the YouTube studio. Kept in memory only; never part of the snapshot. */
const studio = {
  images: {} as Record<string, string>,
  headline: 'Which one wins?',
  thumbStyle: 'dark' as 'dark' | 'bright',
  format: 'landscape' as Format,
  showPick: false,
  audio: null as File | null,
  exporting: null as { cancelled: boolean } | null,
};
const SHORT_LABELS: Record<string, string> = {
  performance: 'Performance', camera: 'Camera', display: 'Display', battery: 'Battery', software: 'Software', price: 'Price',
  ai: 'AI', design: 'Design', audio: 'Audio', connectivity: 'Connectivity', biometrics: 'Biometrics',
};
const storyOpts = () => ({ language: state.lang, durationSec: state.duration, weights: state.weights, pace: state.pace });

const FRAME_TEXT: Record<Lang, FrameContext['text']> = {
  en: { vs: 'VS', winner: 'Winner', tooClose: 'Too close to call', sources: 'Sources in the description', placeholder: 'Phone outlines are placeholders until licensed images are added' },
  te: { vs: 'VS', winner: 'విజేత', tooClose: 'తేడా చాలా తక్కువ', sources: 'మూలాలు వివరణలో ఉన్నాయి', placeholder: 'ఫోన్ చిత్రాలు తాత్కాలికమైనవి' },
};
const player = { index: 0, playing: false, timer: 0 as unknown as ReturnType<typeof setTimeout> };

/** View-only state (never affects the snapshot). */
const ui = {
  openMenu: null as string | null,
  query: '',
  diffOnly: false,
  collapsed: new Set<string>(['audio', 'connectivity', 'biometrics', 'reliability', 'service', 'ecosystem', 'reviews']),
  lastHash: '',
};

const BRAND_ORDER = ['Apple', 'Google', 'Samsung', 'OnePlus', 'Xiaomi', 'Redmi', 'POCO', 'realme', 'vivo', 'iQOO', 'OPPO', 'Motorola', 'Nothing', 'Infinix', 'Tecno'];
const TEST_GROUP = 'Test phones';
const byNewest = (a: PhoneRecord, b: PhoneRecord) => {
  const da = String(a.specs.launch_date?.value ?? ''), db = String(b.specs.launch_date?.value ?? '');
  if (da && db && da !== db) return db.localeCompare(da);
  return b.model.localeCompare(a.model, 'en', { numeric: true });
};
const GROUPS: { brand: string; phones: PhoneRecord[] }[] = [
  ...[...new Set([...BRAND_ORDER, ...REAL.map((p) => p.brand)])]
    .map((brand) => ({ brand, phones: REAL.filter((p) => p.brand === brand).sort(byNewest) }))
    .filter((g) => g.phones.length),
  { brand: TEST_GROUP, phones: FICTIONAL },
];
const colorIndex = (id: string) => Math.max(0, state.selected.indexOf(id));
const priceOf = (p: PhoneRecord) => typeof p.specs.launch_price_inr?.value === 'number' ? `₹${(p.specs.launch_price_inr.value as number).toLocaleString('en-IN')}` : '';

let snapshot: ComparisonSnapshot;
let storyboard: Storyboard;

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const label = (key: string) => EXTRA_LABELS[key] ?? specLabel('en', key);
const phoneName = (id: string) => { const p = snapshot.phones.find((x) => x.id === id)!; return `${p.brand} ${p.model}`; };

function rebuild() {
  stopPlayer();
  const phones = state.selected.map((id) => PHONES.find((p) => p.id === id)!);
  snapshot = buildSnapshot(phones, defaultRegistry);
  storyboard = toStoryboard(snapshot, storyOpts());
  state.edits = {};
}

function editedStoryboard(): Storyboard {
  return { ...storyboard, scenes: storyboard.scenes.map((s) => s.id in state.edits ? { ...s, narration: state.edits[s.id], narrationEditedByUser: true } : s) };
}

function renderRecResults(): string {
  const d = toDashboard(snapshot, state.mode, state.weights);
  const rec = d.recommendation;
  const rows = rec.ranking.map((r, i) => `
    <div class="rank-row ${i === 0 && rec.bestPhoneId ? 'lead' : ''}">
      <span>${i === 0 && rec.bestPhoneId ? icon('crown', 'xs') : ''}${esc(phoneName(r.phoneId))}</span><span class="small">${r.score ?? '—'} · data ${Math.round(r.confidence * 100)}%</span>
      <div class="bar"><i style="width:${r.score ?? 0}%;--c:var(--p${snapshot.phones.findIndex((p) => p.id === r.phoneId)})"></i></div>
    </div>`).join('');
  const verdict = snapshot.phones.length < 2 ? ''
    : rec.bestPhoneId
      ? `<div class="verdict">For these priorities: <strong>${esc(phoneName(rec.bestPhoneId))}</strong></div>`
      : `<div class="verdict close">Too close to call — the scores are near each other or too little verified data.</div>`;
  const profiles = snapshot.phones.length < 2 ? '' : `<h3 style="font-size:15px;margin-top:18px">Best for</h3><ul class="profiles">${
    Object.entries(d.profiles).map(([k, r]) => `<li><span>${PROFILE_LABELS[k] ?? k}</span><span>${r.bestPhoneId ? esc(phoneName(r.bestPhoneId)) : 'Too close'}</span></li>`).join('')}</ul>`;
  return `<div class="rank">${rows}</div>${verdict}${profiles}`;
}

function renderRecommendation(): string {
  const sliders = Object.keys(WEIGHT_LABELS).map((k) => {
    const v = state.weights[k as keyof Weights] ?? 0;
    return `<label class="slider" style="--fill:${(v / 5) * 100}%">${icon(CATEGORY_ICON[k] ?? 'info', 'sm')}<span>${WEIGHT_LABELS[k]}</span>
      <input type="range" min="0" max="5" step="0.5" value="${v}" data-weight="${k}" aria-label="${WEIGHT_LABELS[k]} priority">
      <output>${v}</output></label>`;
  }).join('');
  return `<div class="card glass sticky" id="rec">
    <div class="card-title">${icon('sliders')}<h2>Your priorities</h2></div>
    <p class="small" style="margin:4px 0 12px">Drag to reweight. The video's verdict scene uses the same calculation.</p>
    ${sliders}<div id="rec-results">${renderRecResults()}</div></div>`;
}

function rowIsSame(r: { cells: { display: string; status: string }[] }): boolean {
  const vals = r.cells.map((c) => c.display);
  return vals.every((v) => v === vals[0]);
}

function miniBars(r: { cells: { value?: unknown; status: string }[]; note?: string }): number[] | null {
  if (r.note === 'incomparable_conditions') return null;
  const nums = r.cells.map((c) => (c.status === 'available' && typeof c.value === 'number' ? (c.value as number) : null));
  const valid = nums.filter((n): n is number => n !== null);
  if (valid.length < 2) return null;
  const max = Math.max(...valid);
  return nums.map((n) => (n === null || max <= 0 ? 0 : Math.round((n / max) * 100)));
}

function renderCategories(): string {
  const d = toDashboard(snapshot, state.mode, state.weights);
  const cats = d.categories.filter((c) => c.rows.length);
  if (!cats.length) return '<p class="empty">No data for this view.</p>';
  return cats.map((c, ci) => {
    const rows = c.rows.filter((r) => !(ui.diffOnly && snapshot.phones.length > 1 && rowIsSame(r)));
    const open = !ui.collapsed.has(c.key);
    const head = snapshot.phones.map((p, i) => `<th><span class="dot" style="--c:var(--p${i})"></span>${esc(p.model)}</th>`).join('');
    const body = rows.map((r) => {
      const bars = miniBars(r);
      return `<tr data-spec="${esc(label(r.specKey).toLowerCase())}"><td class="label">${esc(label(r.specKey))}${r.note ? `<span class="note">${NOTE_TEXT[r.note]}</span>` : ''}</td>${
        r.cells.map((cell, i) => {
          const cls = cell.isBest ? 'best' : cell.status === 'not_available' ? 'na' : cell.status === 'not_verified' ? 'unv' : '';
          const tip = cell.sourceType ? `${cell.sourceType.replace(/_/g, ' ')}${cell.conditions ? ' · ' + Object.values(cell.conditions).join(', ') : ''}${cell.sourceUrl && !cell.sourceUrl.includes('example.test') ? ' · ' + new URL(cell.sourceUrl).hostname.replace(/^www\./, '') : ''}` : '';
          return `<td class="${cls}" ${tip ? `data-tip="${esc(tip)}" tabindex="0"` : ''}>${cell.isBest ? icon('trophy', 'xs') : ''}<span>${esc(cell.display)}</span>${bars ? `<i class="mbar" style="--w:${bars[i]}%;--c:var(--p${i})"></i>` : ''}</td>`;
        }).join('')}</tr>`;
    }).join('');
    const scores = snapshot.phones.length > 1 && Object.values(c.scores).some((v) => v !== null)
      ? `<div class="score-strip">${snapshot.phones.map((p, i) => {
          const v = c.scores[p.id];
          return `<div class="sc ${c.winnerIds.includes(p.id) ? 'win' : ''}" style="--c:var(--p${i});--w:${v ?? 0}%"><span>${esc(p.model)}</span><b>${v ?? '—'}</b><i></i></div>`;
        }).join('')}</div>` : '';
    return `<article class="card acc ${open ? 'open' : ''} rise" style="--i:${ci}" data-cat="${c.key}">
      <button class="acc-head" data-acc="${c.key}" aria-expanded="${open}">
        <span class="cat-ic">${icon(CATEGORY_ICON[c.key] ?? 'info')}</span>
        <span class="acc-title"><h3>${esc(CATEGORY_LABELS[c.key] ?? c.key)}</h3><span class="small">${rows.length} spec${rows.length === 1 ? '' : 's'}${ui.diffOnly ? ' that differ' : ''}</span></span>
        <span class="badges"><span class="badge ${c.priority === 'P0' ? 'p0' : ''}">${c.priority}</span><span class="badge cov" style="--cov:${Math.round(c.coverage * 100)}%">${Math.round(c.coverage * 100)}% verified</span></span>
        ${icon('chevron', 'chev')}
      </button>
      <div class="acc-body"><div class="acc-inner">
        ${scores}
        ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Spec</th>${head}</tr></thead><tbody>${body}</tbody></table></div>` : `<p class="empty">No differences in this category.</p>`}
      </div></div>
    </article>`;
  }).join('');
}

function renderVersus(): string {
  const rec = toDashboard(snapshot, state.mode, state.weights).recommendation;
  const byId = new Map(rec.ranking.map((r) => [r.phoneId, r]));
  return `<div class="versus" style="--n:${snapshot.phones.length}">${snapshot.phones.map((p, i) => {
    const r = byId.get(p.id);
    const rec0 = PHONES.find((x) => x.id === p.id)!;
    const lead = rec.bestPhoneId === p.id;
    return `<div class="vs-card rise ${lead ? 'lead' : ''}" style="--c:var(--p${i});--i:${i}">
      ${lead ? `<span class="crown" title="Best for your priorities">${icon('crown')}</span>` : ''}
      <div class="vs-phone">${icon('phone', 'lg')}</div>
      <div class="vs-info"><span class="vs-brand">${esc(p.brand)}</span><b>${esc(p.model)}</b><span class="small">${esc(p.variant ?? '')}${priceOf(rec0) ? ' · ' + priceOf(rec0) : ''}</span></div>
      ${snapshot.phones.length > 1 ? `<div class="vs-score">${scoreRing(r?.score ?? null, i)}<span class="small">data ${Math.round((r?.confidence ?? 0) * 100)}%</span></div>` : ''}
      <button class="icon-btn vs-x" data-phone="${p.id}" aria-label="Remove ${esc(p.model)}" ${snapshot.phones.length === 1 ? 'disabled' : ''}>${icon('x', 'sm')}</button>
    </div>`;
  }).join('')}</div>`;
}

function renderWinners(): string {
  if (snapshot.phones.length < 2) return '';
  const tiles = RADAR_KEYS.map((k, ti) => {
    const c = snapshot.categories.find((x) => x.key === k);
    if (!c) return '';
    const has = Object.values(c.scores).some((v) => v !== null);
    const w = c.winnerIds.map((id) => snapshot.phones.find((p) => p.id === id)!).filter(Boolean);
    const wi = w.length ? snapshot.phones.findIndex((p) => p.id === w[0].id) : -1;
    return `<div class="win-tile rise" style="--i:${ti};${wi >= 0 ? `--c:var(--p${wi})` : ''}">
      <span class="wt-ic">${icon(CATEGORY_ICON[k])}</span>
      <span class="wt-cat">${esc(CATEGORY_LABELS[k])}</span>
      <b class="wt-win ${w.length ? '' : 'muted'}">${w.length ? esc(w[0].model) : has ? 'Too close' : c.rows.some((r) => r.cells.some((x) => x.status === 'available')) ? 'Not scored' : 'No data yet'}</b>
      <span class="wt-bars">${snapshot.phones.map((p, i) => `<i style="--c:var(--p${i});--h:${c.scores[p.id] ?? 0}%" title="${esc(p.model)}: ${c.scores[p.id] ?? '—'}"></i>`).join('')}</span>
    </div>`;
  }).join('');
  return `<div class="winners">${tiles}</div>`;
}

function renderRadar(): string {
  return `<div class="card radar-card rise">
    <div class="card-title">${icon('radar')}<h2>Category scores</h2><span class="small">0–100 from verified, comparable specs</span></div>
    <div class="radar-wrap">${radarChart(snapshot, CATEGORY_LABELS)}
      <ul class="legend">${snapshot.phones.map((p, i) => {
        const gaps = RADAR_KEYS.filter((k) => { const c = snapshot.categories.find((x) => x.key === k); return c && Object.values(c.scores).some((v) => v !== null) && c.scores[p.id] === null; });
        return `<li style="--c:var(--p${i})"><span class="dot"></span><span>${esc(p.brand)} ${esc(p.model)}${gaps.length ? `<small>No score yet: ${gaps.map((k) => esc(CATEGORY_LABELS[k])).join(', ')}</small>` : ''}</span></li>`;
      }).join('')}</ul></div>
  </div>`;
}

function renderToolbar(): string {
  const modes: Tier[] = ['quick', 'detailed', 'techie'];
  const mi = modes.indexOf(state.mode);
  return `<div class="toolbar">
    <div class="seg" role="tablist" style="--i:${mi}">${modes.map((m) => `<button role="tab" data-mode="${m}" aria-selected="${state.mode === m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
    <label class="switch"><input type="checkbox" data-ui="diff" ${ui.diffOnly ? 'checked' : ''}><span class="track"><span class="knob"></span></span>Differences only</label>
    <div class="spec-search">${icon('search', 'sm')}<input type="search" data-ui="specfilter" placeholder="Filter specs (e.g. camera, 5G)" aria-label="Filter specs"></div>
    <div class="tb-actions">
      <button class="icon-btn" data-ui="expand" title="Expand all" aria-label="Expand all">${icon('expand', 'sm')}</button>
      <button class="icon-btn" data-ui="collapse" title="Collapse all" aria-label="Collapse all">${icon('collapse', 'sm')}</button>
    </div>
  </div>`;
}

function kit() {
  return toPublishKit(snapshot, editedStoryboard(), {
    categoryLabel: (k) => SHORT_LABELS[k] ?? CATEGORY_LABELS[k] ?? k,
    specLabel: label,
    pageUrl: location.protocol.startsWith('http') ? location.origin + location.pathname : undefined,
  });
}
const fileSlug = () => snapshot.phones.map((p) => videoName(p).toLowerCase().replace(/[^a-z0-9]+/g, '-')).join('-vs-');
const sceneLabel = (s: Storyboard['scenes'][number]) => (s.categoryKey ? CATEGORY_LABELS[s.categoryKey] ?? s.categoryKey : s.type === 'phoneReveal' ? 'Phone reveal' : s.type[0].toUpperCase() + s.type.slice(1));
const copyBtn = (id: string, text = 'Copy') => `<button class="btn sm" data-copy="${id}">${text}</button>`;

function renderKit(): string {
  const k = kit();
  const total = storyboard.scenes.reduce((a, s) => a + s.durationSec, 0);
  const count = (n: number, max: number) => `<span class="count-pill ${n > max ? 'over' : ''}">${n}/${max}</span>`;
  return `
    <div class="kit-block"><div class="kit-head"><h4>Title ideas</h4><span class="small">Pick one; names first so search finds it</span></div>
      <ul class="titles">${k.titles.map((t, i) => `<li><span id="kit-title-${i}">${esc(t)}</span>${count(t.length, YT_LIMITS.title)}${copyBtn(`kit-title-${i}`)}</li>`).join('')}</ul></div>
    <div class="kit-block"><div class="kit-head"><h4>Description</h4>${count(k.description.length, YT_LIMITS.description)}${copyBtn('kit-desc')}</div>
      <p class="small">Chapters match the video's timing (${fmt(total)}), and every source the video relies on is listed.</p>
      <textarea id="kit-desc" class="kit-text" readonly rows="12">${esc(k.description)}</textarea></div>
    <div class="kit-grid">
      <div class="kit-block"><div class="kit-head"><h4>Tags</h4>${count(k.tags.join(',').length, YT_LIMITS.tags)}${copyBtn('kit-tags')}</div>
        <textarea id="kit-tags" class="kit-text" readonly rows="4">${esc(k.tags.join(', '))}</textarea></div>
      <div class="kit-block"><div class="kit-head"><h4>Pinned comment</h4>${copyBtn('kit-pin')}</div>
        <textarea id="kit-pin" class="kit-text" readonly rows="4">${esc(k.pinnedComment)}</textarea></div>
    </div>`;
}

function renderStoryboard(): string {
  const total = storyboard.scenes.reduce((a, s) => a + s.durationSec, 0);
  const scenes = storyboard.scenes.map((s) => {
    const text = state.edits[s.id] ?? s.narration;
    const read = speakSec(text);
    return `
    <div class="scene" data-scene="${s.id}">
      <div class="scene-top"><b>${esc(sceneLabel(s))}</b><span>${s.durationSec}s</span></div>
      ${s.type === 'phoneReveal' ? '<p class="small" style="margin:0">Phones animate in (no narration)</p>'
        : `<textarea data-narration="${s.id}" aria-label="Narration for ${esc(sceneLabel(s))}" lang="${state.lang}">${esc(text)}</textarea>
           <div class="read ${read > s.durationSec + 0.5 ? 'over' : ''}" data-read="${s.id}" data-dur="${s.durationSec}">~${read}s to say · ${s.durationSec}s on screen</div>`}
      ${s.facts.length ? `<div class="facts">${s.facts.map((f) => `<span class="fact ${f.isBest ? 'best' : ''}">${esc(snapshot.phones.find((p) => p.id === f.phoneId)!.model)} · ${esc(f.display)}</span>`).join('')}</div>` : ''}
      <div class="issue" data-issue="${s.id}"></div>
    </div>`; }).join('');
  const uploads = snapshot.phones.map((p, i) => `<label class="img-slot" style="--c:var(--p${i})">
      <span class="img-prev">${studio.images[p.id] ? `<img src="${esc(studio.images[p.id])}" alt="">` : icon('phone', 'lg')}</span>
      <span><b>${esc(p.model)}</b><span class="small">${studio.images[p.id] ? 'Replace image' : 'Add image (PNG with transparent background works best)'}</span></span>
      <input type="file" accept="image/*" data-image="${p.id}" hidden>
      ${studio.images[p.id] ? `<button class="icon-btn xs" data-image-clear="${p.id}" aria-label="Remove image for ${esc(p.model)}">${icon('x', 'xs')}</button>` : ''}</label>`).join('');
  const shortsTooLong = studio.format === 'shorts' && total > YT_LIMITS.shortsMaxSec;
  return `<section class="section card" id="video">
    <div class="section-head"><div><div class="card-title">${icon('video')}<h2>YouTube studio</h2></div>
      <p class="hint">Everything a comparison video needs, built from the same verified snapshot as the tables above: storyboard, script, captions, the video file, thumbnail, title, description and tags.</p></div>
      <div class="controls">
        <label>Language <select data-ctl="lang"><option value="en" ${state.lang === 'en' ? 'selected' : ''}>English</option><option value="te" ${state.lang === 'te' ? 'selected' : ''}>తెలుగు</option></select></label>
        <label>Length <select data-ctl="duration"><option value="auto" ${state.duration === undefined ? 'selected' : ''}>Auto (all specs)</option>${[60, 90, 120, 180, 300].map((d) => `<option value="${d}" ${state.duration === d ? 'selected' : ''}>${d < 120 ? d + 's' : d / 60 + ' min'}</option>`).join('')}</select></label>
        <label>Pacing <select data-ctl="pace" ${state.duration !== undefined ? 'disabled title="Pacing applies to Auto length"' : ''}><option value="reading" ${state.pace === 'reading' ? 'selected' : ''}>Music only (reading pace)</option><option value="voiceover" ${state.pace === 'voiceover' ? 'selected' : ''}>Voiceover (cards wait for narration)</option></select></label>
        <button class="btn" data-ctl="reset">Reset edits</button>
      </div></div>
    <div id="status" class="status"></div>

    <ol class="steps">
      <li class="step"><h3><span class="step-n">1</span>Preview</h3>
        <p class="hint">${storyboard.scenes.length} scenes, ${fmt(total)}. Every card stays up at least 3 seconds. The exported video shows exactly these cards with this timing.</p>
        <div class="player" id="player">${renderPlayer()}</div></li>

      <li class="step"><h3><span class="step-n">2</span>Phone images <span class="small">optional</span></h3>
        <p class="hint">Use product images you have the right to publish (press-kit renders or your own photos). They appear in the video and the thumbnail. Without them, outlines are drawn. Images stay in this browser tab.</p>
        <div class="img-slots">${uploads}</div></li>

      <li class="step"><h3><span class="step-n">3</span>Script</h3>
        <p class="hint">Edit any line. A number that isn't in the verified data blocks the export. Lines marked in amber take longer to say than their cards are on screen: shorten them or switch Pacing to Voiceover.</p>
        <div class="scenes">${scenes}</div>
        <div class="row-actions"><button class="btn" data-dl="script">Download script (.txt)</button><button class="btn" data-dl="srt">Download captions (.srt)</button></div></li>

      <li class="step"><h3><span class="step-n">4</span>Export video</h3>
        <p class="hint">Records in this browser, in real time (${fmt(total)}), to a WebM file that YouTube accepts. Keep this tab in front while it records. Add a voiceover or music file and it is mixed in.</p>
        <div class="controls export">
          <label>Format <select data-ctl="format">${(Object.keys(FORMATS) as Format[]).map((f) => `<option value="${f}" ${studio.format === f ? 'selected' : ''}>${FORMATS[f].label}</option>`).join('')}</select></label>
          <label class="file-pick">Audio <input type="file" accept="audio/*" data-ctl="audio"><span class="small">${studio.audio ? esc(studio.audio.name) : 'none'}</span></label>
          <button class="btn primary" data-ctl="export" ${canExport() ? '' : 'disabled title="This browser cannot record video; use Chrome, Edge or Firefox"'}>${icon('video', 'sm')} Export video</button>
        </div>
        ${shortsTooLong ? `<p class="warn-line">Shorts can be at most 3 minutes; this cut is ${fmt(total)}. Choose a 60s, 90s, 2 min or 3 min length above.</p>` : ''}
        <div id="export-status" class="export-status" hidden></div></li>

      <li class="step"><h3><span class="step-n">5</span>Thumbnail</h3>
        <p class="hint">1280×720 PNG. Short, high-contrast text reads best at small sizes.</p>
        <div class="thumb-maker"><canvas id="thumb-canvas" width="1280" height="720" aria-label="Thumbnail preview"></canvas>
          <div class="thumb-ctl">
            <label>Headline <input type="text" data-ctl="headline" maxlength="28" value="${esc(studio.headline)}"></label>
            <label>Style <select data-ctl="thumbstyle"><option value="dark" ${studio.thumbStyle === 'dark' ? 'selected' : ''}>Dark</option><option value="bright" ${studio.thumbStyle === 'bright' ? 'selected' : ''}>Bright</option></select></label>
            <label class="check"><input type="checkbox" data-ctl="showpick" ${studio.showPick ? 'checked' : ''}> Mark the recommended phone (gives the result away)</label>
            <button class="btn" data-dl="thumb">Download thumbnail (.png)</button>
          </div></div></li>

      <li class="step"><h3><span class="step-n">6</span>Title, description and tags</h3>
        <div id="kit">${renderKit()}</div></li>
    </ol>
  </section>`;
}

function refreshThumb() {
  const canvas = document.getElementById('thumb-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const best = snapshot.phones.length > 1 ? recommend(snapshot, state.weights).bestPhoneId : null;
  void drawThumbnail(canvas, {
    names: snapshot.phones.map(videoName), headline: studio.headline, style: studio.thumbStyle,
    images: snapshot.phones.map((p) => studio.images[p.id]),
    winnerIndex: best && studio.showPick ? snapshot.phones.findIndex((p) => p.id === best) : -1,
  });
}

async function runExport() {
  if (studio.exporting) { studio.exporting.cancelled = true; return; }
  if (validateStoryboard(editedStoryboard(), snapshot).length) { toast('Fix the script problems first', 'info'); return; }
  const box = document.getElementById('export-status')!;
  const btn = document.querySelector<HTMLElement>('[data-ctl="export"]')!;
  const signal = { cancelled: false };
  studio.exporting = signal; stopPlayer();
  btn.textContent = 'Cancel export';
  box.hidden = false;
  try {
    const blob = await exportVideo({
      beats: beats(), ctx: frameCtx(), format: studio.format, audio: studio.audio, signal,
      title: snapshot.phones.map(videoName).join(' vs '), footer: 'Full comparison on the channel',
      onProgress: (done, total, stage) => { box.innerHTML = `<div class="bar"><i style="width:${Math.round((done / total) * 100)}%"></i></div><span>${esc(stage)} · ${fmt(done)} / ${fmt(total)}</span>`; },
    });
    if (blob) {
      download(`${fileSlug()}${studio.format === 'shorts' ? '-shorts' : ''}.webm`, blob);
      box.innerHTML = `<span>Done: ${(blob.size / 1048576).toFixed(1)} MB WebM saved to your downloads.</span>`;
      toast('Video exported');
    } else box.innerHTML = '<span>Export cancelled.</span>';
  } catch (err) {
    box.innerHTML = `<span class="bad">Export failed: ${esc((err as Error).message)}</span>`;
  } finally {
    studio.exporting = null;
    const b2 = document.querySelector<HTMLElement>('[data-ctl="export"]');
    if (b2) b2.innerHTML = `${icon('video', 'sm')} Export video`;
  }
}

function phoneItem(p: PhoneRecord, showBrand = false): string {
  const on = state.selected.includes(p.id);
  const full = !on && state.selected.length === 5;
  const meta = [priceOf(p), p.specs.chipset?.value ? String(p.specs.chipset.value) : ''].filter(Boolean).join(' · ');
  return `<button class="dd-item ${on ? 'on' : ''}" role="menuitemcheckbox" aria-checked="${on}" data-phone="${p.id}" ${full ? 'disabled title="Up to 5 phones"' : ''} ${on ? `style="--c:var(--p${colorIndex(p.id)})"` : ''}>
    <span class="cbox">${icon('check', 'xs')}</span>
    <span class="dd-name">${showBrand ? `<em>${esc(p.brand)}</em> ` : ''}${esc(p.model)}</span>
    <span class="dd-meta">${esc(meta)}</span></button>`;
}

function renderSearchResults(): string {
  const q = ui.query.trim().toLowerCase();
  if (!q) return '';
  const hits = PHONES.filter((p) => `${p.brand} ${p.model} ${p.specs.chipset?.value ?? ''}`.toLowerCase().includes(q)).slice(0, 12);
  return hits.length ? hits.map((p) => phoneItem(p, true)).join('') : `<p class="dd-empty">No phones match “${esc(ui.query)}”.</p>`;
}

function renderPicker(): string {
  const brands = GROUPS.map((g) => {
    const sel = g.phones.filter((p) => state.selected.includes(p.id)).length;
    const open = ui.openMenu === g.brand;
    const initials = g.brand === TEST_GROUP ? '?' : g.brand.slice(0, 1).toUpperCase();
    return `<div class="dd ${open ? 'open' : ''}">
      <button class="dd-btn ${sel ? 'has' : ''}" data-menu="${esc(g.brand)}" aria-haspopup="true" aria-expanded="${open}">
        <span class="logo">${initials}</span><span>${esc(g.brand)}</span><span class="count">${g.phones.length}</span>
        ${sel ? `<span class="sel-badge">${sel}</span>` : ''}${icon('chevron', 'chev sm')}
      </button>
      <div class="dd-menu" role="menu" aria-label="${esc(g.brand)} phones">
        <div class="dd-head"><b>${esc(g.brand)}</b><span class="small">${g.phones.length} phone${g.phones.length === 1 ? '' : 's'}${g.brand === TEST_GROUP ? ' · fictional' : ''}</span></div>
        <div class="dd-list">${g.phones.map((p) => phoneItem(p)).join('')}</div>
      </div>
    </div>`;
  }).join('');
  const tray = state.selected.map((id, i) => {
    const p = PHONES.find((x) => x.id === id)!;
    return `<span class="tray-chip" style="--c:var(--p${i})"><span class="dot"></span>${esc(p.brand)} ${esc(p.model)}
      <button class="icon-btn xs" data-phone="${id}" aria-label="Remove ${esc(p.model)}" ${state.selected.length === 1 ? 'disabled' : ''}>${icon('x', 'xs')}</button></span>`;
  }).join('');
  return `<section class="picker card glass" id="pick">
    <div class="picker-top">
      <div class="card-title">${icon('phone')}<h2>Choose phones</h2><span class="small">${state.selected.length}/5 selected</span></div>
      <div class="search-box ${ui.query ? 'open' : ''}">${icon('search', 'sm')}
        <input type="search" data-ui="search" value="${esc(ui.query)}" placeholder="Search ${REAL.length} phones, brands or chips" aria-label="Search phones" autocomplete="off">
        <div class="dd-menu search-menu" role="menu" id="search-results">${renderSearchResults()}</div>
      </div>
    </div>
    <div class="brand-bar">${brands}</div>
    <div class="tray">${tray}<span class="small tray-hint">${state.selected.length === 5 ? 'Maximum reached — remove one to add another' : 'Pick from a brand or search'}</span></div>
  </section>`;
}

/** Every source URL the current snapshot relies on, grouped by phone. */
function renderSources(): string {
  const byPhone = snapshot.phones.map((p) => {
    const map = new Map<string, { specs: string[]; types: Set<string> }>();
    for (const c of snapshot.categories) for (const r of c.rows) {
      const cell = r.cells.find((x) => x.phoneId === p.id);
      if (!cell?.sourceUrl || cell.sourceUrl.includes('example.test')) continue;
      const e = map.get(cell.sourceUrl) ?? { specs: [], types: new Set() };
      e.specs.push(label(r.specKey) + (cell.status === 'not_verified' ? ' (not verified)' : ''));
      e.types.add(cell.sourceType!.replace(/_/g, ' '));
      map.set(cell.sourceUrl, e);
    }
    return { p, map };
  }).filter((x) => x.map.size);
  if (!byPhone.length) return '';
  return `<section class="section card" id="sources"><div class="card-title">${icon('link')}<h2>Sources</h2></div>
    <p class="hint">Checked ${esc(REAL[0].specs[Object.keys(REAL[0].specs)[0]].lastUpdated)}. Hover a table cell to see its source type.</p>
    ${byPhone.map(({ p, map }) => `<h3 class="src-phone">${esc(p.brand)} ${esc(p.model)} <span class="small">${esc(p.variant ?? '')} · ${esc(p.region ?? '')}</span></h3>
      <ul class="sources">${[...map].map(([url, e]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(new URL(url).hostname.replace(/^www\./, ''))}</a>
        <span class="small">${[...e.types].join(', ')} · ${e.specs.map(esc).join(', ')}</span></li>`).join('')}</ul>`).join('')}
  </section>`;
}

function frameCtx(): FrameContext {
  return {
    phones: snapshot.phones,
    label: (k) => (state.lang === 'en' ? label(k) : specLabel(state.lang, k)),
    categoryTitle: (k) => CATEGORY_LABELS[k] ?? k,
    text: FRAME_TEXT[state.lang],
    snapshotHash: snapshot.contentHash,
    images: studio.images,
  };
}

function beats(): Beat[] {
  const ctx = frameCtx();
  return editedStoryboard().scenes.flatMap((sc) => buildBeats(sc, ctx));
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

function renderPlayer(): string {
  const bs = beats();
  if (player.index >= bs.length) player.index = 0;
  const ctx = frameCtx();
  const total = bs.reduce((a, b) => a + b.durationSec, 0);
  const elapsed = bs.slice(0, player.index).reduce((a, b) => a + b.durationSec, 0);
  return `<div class="screen" role="img" aria-label="Frame ${player.index + 1} of ${bs.length}">${renderFrame(bs[player.index], ctx)}</div>
    <div class="player-bar">
      <button class="icon-btn" data-play="prev" aria-label="Previous frame">${icon('prev', 'sm')}</button>
      <button class="play-btn" data-play="toggle" aria-label="${player.playing ? 'Pause' : 'Play'}">${icon(player.playing ? 'pause' : 'play')}</button>
      <button class="icon-btn" data-play="next" aria-label="Next frame">${icon('next', 'sm')}</button>
      <span class="time">${fmt(elapsed)} / ${fmt(total)} · card ${player.index + 1} of ${bs.length} · ${bs[player.index].durationSec}s on screen</span>
    </div>
    <div class="shot-bar" aria-hidden="true">${bs.map((b, i) => `<i style="--w:${b.durationSec}" class="${i < player.index ? 'done' : i === player.index ? 'now' : ''}"></i>`).join('')}</div>
    <div class="filmstrip">${bs.map((b, i) => `<button class="thumb" data-beat="${i}" aria-current="${i === player.index}"><div class="screen">${renderFrame(b, ctx)}</div><small>${esc(b.title ?? b.layout)} · ${b.durationSec}s</small></button>`).join('')}</div>`;
}

function updatePlayer(animate = true) {
  const el = document.getElementById('player');
  if (!el) return;
  const old = el.querySelector<HTMLElement>(':scope > .screen > .vf');
  el.innerHTML = renderPlayer();
  const screen = el.querySelector<HTMLElement>(':scope > .screen')!;
  const fresh = screen.querySelector<HTMLElement>('.vf')!;
  if (!animate) return;
  fresh.classList.add('enter');
  if (old) {
    old.classList.remove('enter'); old.classList.add('leave');
    screen.insertBefore(old, fresh);
    setTimeout(() => old.remove(), 950);
  }
  el.querySelector<HTMLElement>('.thumb[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

function schedule() {
  clearTimeout(player.timer);
  if (!player.playing) return;
  const bs = beats();
  player.timer = setTimeout(() => {
    if (player.index >= bs.length - 1) { player.playing = false; player.index = 0; }
    else player.index++;
    updatePlayer(); schedule();
  }, bs[player.index].durationSec * 1000);
}

function stopPlayer() { player.playing = false; player.index = 0; clearTimeout(player.timer); }

function updateValidation() {
  const issues = validateStoryboard(editedStoryboard(), snapshot);
  const status = document.getElementById('status')!;
  status.className = `status ${issues.length ? 'bad' : 'ok'}`;
  status.textContent = issues.length
    ? `Export blocked: ${issues.length} problem${issues.length > 1 ? 's' : ''}. The video can only say what the verified data says.`
    : `Ready to export — every value matches snapshot ${snapshot.contentHash.slice(0, 12)}.`;
  document.querySelectorAll<HTMLElement>('[data-scene]').forEach((el) => {
    const mine = issues.filter((i) => i.sceneId === el.dataset.scene);
    el.classList.toggle('invalid', mine.length > 0);
    el.querySelector<HTMLElement>('[data-issue]')!.textContent = mine.map((i) => i.problem).join(' · ');
  });
}

function toast(msg: string, kind: 'ok' | 'info' = 'ok') {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `${icon(kind === 'ok' ? 'check' : 'info', 'sm')}<span>${esc(msg)}</span>`;
  host.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2400);
  setTimeout(() => el.remove(), 2800);
}

function currentTheme(): 'light' | 'dark' {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function render() {
  const app = document.getElementById('app')!;
  const missing = snapshot.warnings.filter((w) => w.kind === 'missing').length;
  const unverified = snapshot.warnings.filter((w) => w.kind === 'unverified').length;
  const entering = ui.lastHash !== snapshot.contentHash;
  ui.lastHash = snapshot.contentHash;
  const values = REAL.reduce((a, p) => a + Object.keys(p.specs).length, 0);
  const brands = new Set(REAL.map((p) => p.brand)).size;
  app.innerHTML = `
  <header class="appbar"><div class="wrap appbar-in">
    <a class="logo-mark" href="#top" aria-label="MobileVerse home"><span class="lm-ic">${icon('phone')}</span><span class="lm-text">Mobile<b>Verse</b></span></a>
    <nav class="nav">${[['#compare', 'Compare', 'radar'], ['#rec', 'Priorities', 'sliders'], ['#video', 'YouTube studio', 'video'], ['#sources', 'Sources', 'link']]
      .map(([h, t, ic]) => `<a href="${h}">${icon(ic, 'sm')}<span>${t}</span></a>`).join('')}</nav>
    <button class="icon-btn theme-btn" data-ui="theme" aria-label="Switch to ${currentTheme() === 'dark' ? 'light' : 'dark'} theme">${icon(currentTheme() === 'dark' ? 'sun' : 'moon')}</button>
  </div></header>
  <section class="hero" id="top"><div class="wrap">
    <span class="eyebrow">${icon('shield', 'sm')} Verified comparison engine</span>
    <h1>Compare phones on <span class="grad">facts you can check</span></h1>
    <p class="lede">One verified snapshot feeds the comparison and the video storyboard, so a spec can never say one thing on the page and another in a video.</p>
    <div class="stats">
      <div class="stat"><b>${REAL.length}</b><span>phones</span></div>
      <div class="stat"><b>${brands}</b><span>brands</span></div>
      <div class="stat"><b>${values.toLocaleString('en-IN')}</b><span>sourced values</span></div>
    </div>
    <p class="banner">${icon('info', 'sm')}<span>Only values a source stated are shown, each linked under Sources; anything else says “Not available”. Prices are India launch prices. “Fixture” phones are fictional test data.</span></p>
  </div></section>
  <main class="wrap ${entering ? 'entering' : ''}">
    ${renderPicker()}
    <div class="meta"><span>${icon('shield', 'xs')} Snapshot <code>${snapshot.contentHash.slice(0, 12)}</code></span><span>Engine ${snapshot.engineVersion}</span><span>Rules ${snapshot.registryVersion}</span><span>${missing} missing · ${unverified} unverified values</span></div>
    <section class="section" id="compare">
      ${renderVersus()}
      ${renderWinners()}
      <div class="grid">
        <div class="stack">
          ${snapshot.phones.length > 1 ? renderRadar() : ''}
          <div class="section-head"><div class="card-title">${icon('overview')}<h2>Full comparison</h2></div></div>
          ${renderToolbar()}
          <div class="cats">${renderCategories()}</div>
        </div>
        <aside>${renderRecommendation()}</aside>
      </div>
    </section>
    ${renderStoryboard()}
    ${renderSources()}
  </main>
  <footer><div class="wrap foot-in"><a href="https://github.com/jagadeeshkumar458/mobx">${icon('github', 'sm')} jagadeeshkumar458/mobx</a><span>Engine code in <code>shared/comparison-engine</code></span></div></footer>`;
  updateValidation();
  refreshThumb();
}

function setPhones(next: string[], msg: string) {
  state.selected = next;
  rebuild(); render();
  toast(msg);
}

function filterSpecs(q: string) {
  const needle = q.trim().toLowerCase();
  document.querySelectorAll<HTMLElement>('.cats tr[data-spec]').forEach((tr) => {
    tr.hidden = !!needle && !tr.dataset.spec!.includes(needle);
  });
  document.querySelectorAll<HTMLElement>('.cats .acc').forEach((card) => {
    const any = [...card.querySelectorAll<HTMLElement>('tr[data-spec]')].some((tr) => !tr.hidden);
    card.classList.toggle('filtered-out', !!needle && !any);
    if (needle && any) { card.classList.add('open'); card.querySelector('.acc-head')!.setAttribute('aria-expanded', 'true'); }
  });
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;

  const menu = t.closest<HTMLElement>('[data-menu]')?.dataset.menu;
  if (menu) {
    ui.openMenu = ui.openMenu === menu ? null : menu;
    document.querySelectorAll<HTMLElement>('.dd').forEach((dd) => {
      const btn = dd.querySelector<HTMLElement>('[data-menu]')!;
      const open = btn.dataset.menu === ui.openMenu;
      dd.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
    });
    return;
  }

  const phone = t.closest<HTMLElement>('[data-phone]')?.dataset.phone;
  if (phone) {
    const on = state.selected.includes(phone);
    const p = PHONES.find((x) => x.id === phone)!;
    if (on && state.selected.length === 1) return;
    if (!on && state.selected.length === 5) { toast('You can compare up to 5 phones', 'info'); return; }
    if (t.closest('.search-menu')) ui.query = '';
    setPhones(on ? state.selected.filter((x) => x !== phone) : [...state.selected, phone], `${on ? 'Removed' : 'Added'} ${p.brand} ${p.model}`);
    return;
  }

  // Click outside any open dropdown closes it.
  if (ui.openMenu && !t.closest('.dd')) {
    ui.openMenu = null;
    document.querySelectorAll('.dd.open').forEach((dd) => { dd.classList.remove('open'); dd.querySelector('[data-menu]')!.setAttribute('aria-expanded', 'false'); });
  }

  const acc = t.closest<HTMLElement>('[data-acc]')?.dataset.acc;
  if (acc) {
    const card = t.closest<HTMLElement>('.acc')!;
    const open = !card.classList.contains('open');
    card.classList.toggle('open', open);
    t.closest('[data-acc]')!.setAttribute('aria-expanded', String(open));
    if (open) ui.collapsed.delete(acc); else ui.collapsed.add(acc);
    return;
  }

  const uiAct = t.closest<HTMLElement>('[data-ui]')?.dataset.ui;
  if (uiAct === 'expand' || uiAct === 'collapse') {
    document.querySelectorAll<HTMLElement>('.cats .acc').forEach((card) => {
      const open = uiAct === 'expand';
      card.classList.toggle('open', open);
      card.querySelector('.acc-head')!.setAttribute('aria-expanded', String(open));
      if (open) ui.collapsed.delete(card.dataset.cat!); else ui.collapsed.add(card.dataset.cat!);
    });
    return;
  }
  if (uiAct === 'theme') {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('mv-theme', next); } catch { /* storage unavailable */ }
    const btn = t.closest<HTMLElement>('[data-ui="theme"]')!;
    btn.innerHTML = icon(next === 'dark' ? 'sun' : 'moon');
    btn.setAttribute('aria-label', `Switch to ${next === 'dark' ? 'light' : 'dark'} theme`);
    return;
  }

  const mode = t.closest<HTMLElement>('[data-mode]')?.dataset.mode as Tier | undefined;
  if (mode) { state.mode = mode; render(); return; }
  if (t.closest('[data-ctl="reset"]')) { state.edits = {}; render(); return; }
  if (t.closest('[data-ctl="export"]')) { void runExport(); return; }
  const copy = t.closest<HTMLElement>('[data-copy]');
  if (copy) {
    const src = document.getElementById(copy.dataset.copy!) as HTMLElement | HTMLTextAreaElement | null;
    const text = src ? ('value' in src ? src.value : src.textContent ?? '') : '';
    void navigator.clipboard?.writeText(text).then(() => toast('Copied'), () => toast('Copy failed: select the text and copy it', 'info'));
    return;
  }
  const dl = t.closest<HTMLElement>('[data-dl]')?.dataset.dl;
  if (dl === 'script') { download(`${fileSlug()}-script.txt`, toScript(editedStoryboard(), sceneLabel)); return; }
  if (dl === 'srt') { download(`${fileSlug()}-captions.srt`, toSrt(editedStoryboard())); return; }
  if (dl === 'thumb') { (document.getElementById('thumb-canvas') as HTMLCanvasElement).toBlob((b) => b && download(`${fileSlug()}-thumbnail.png`, b), 'image/png'); return; }
  const clear = t.closest<HTMLElement>('[data-image-clear]')?.dataset.imageClear;
  if (clear) { e.preventDefault(); delete studio.images[clear]; stopPlayer(); render(); return; }
  const play = t.closest<HTMLElement>('[data-play]')?.dataset.play;
  if (play) {
    const n = beats().length;
    if (play === 'toggle') player.playing = !player.playing;
    if (play === 'prev') player.index = (player.index - 1 + n) % n;
    if (play === 'next') player.index = (player.index + 1) % n;
    updatePlayer(); schedule(); return;
  }
  const beat = t.closest<HTMLElement>('[data-beat]')?.dataset.beat;
  if (beat !== undefined) { player.index = Number(beat); updatePlayer(); schedule(); }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (ui.openMenu || ui.query)) {
    ui.openMenu = null; ui.query = '';
    document.querySelectorAll('.dd.open').forEach((dd) => dd.classList.remove('open'));
    const sr = document.getElementById('search-results'); if (sr) sr.innerHTML = '';
    document.querySelector('.search-box')?.classList.remove('open');
  }
});

document.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.ctl === 'lang') { state.lang = t.value as Lang; rebuild(); render(); }
  if (t.dataset.ctl === 'pace') { state.pace = t.value as typeof state.pace; rebuild(); render(); }
  if (t.dataset.ctl === 'format') { studio.format = t.value as Format; render(); }
  if (t.dataset.ctl === 'showpick') { studio.showPick = t.checked; refreshThumb(); }
  if (t.dataset.ctl === 'thumbstyle') { studio.thumbStyle = t.value as typeof studio.thumbStyle; refreshThumb(); }
  if (t.dataset.ctl === 'audio') { studio.audio = t.files?.[0] ?? null; t.parentElement!.querySelector('.small')!.textContent = studio.audio?.name ?? 'none'; }
  if (t.dataset.image && t.files?.[0]) {
    const id = t.dataset.image; const r = new FileReader();
    r.onload = () => { studio.images[id] = String(r.result); stopPlayer(); render(); toast('Image added'); };
    r.readAsDataURL(t.files[0]);
  }
  if (t.dataset.ctl === 'duration') { state.duration = t.value === 'auto' ? undefined : Number(t.value); rebuild(); render(); }
  if (t.dataset.ui === 'diff') { ui.diffOnly = t.checked; render(); }
  if (t.dataset.weight) {
    // Weights affect the verdict scene too, so rebuild the storyboard from the same snapshot.
    storyboard = toStoryboard(snapshot, storyOpts());
    state.edits = {}; stopPlayer(); render();
  }
});

document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (t.dataset.weight) {
    state.weights = { ...state.weights, [t.dataset.weight]: Number(t.value) };
    t.parentElement!.querySelector('output')!.textContent = t.value;
    (t.parentElement as HTMLElement).style.setProperty('--fill', `${(Number(t.value) / 5) * 100}%`);
    document.getElementById('rec-results')!.innerHTML = renderRecResults();
  }
  if (t.dataset.ui === 'search') {
    ui.query = t.value;
    document.getElementById('search-results')!.innerHTML = renderSearchResults();
    t.closest('.search-box')!.classList.toggle('open', !!ui.query.trim());
  }
  if (t.dataset.ui === 'specfilter') filterSpecs(t.value);
  if (t.dataset.narration) {
    state.edits[t.dataset.narration] = t.value; updateValidation();
    const r = document.querySelector<HTMLElement>(`[data-read="${t.dataset.narration}"]`);
    if (r) { const s = speakSec(t.value); r.textContent = `~${s}s to say · ${r.dataset.dur}s on screen`; r.classList.toggle('over', s > Number(r.dataset.dur) + 0.5); }
    const k = document.getElementById('kit'); if (k) k.innerHTML = renderKit();
  }
  if (t.dataset.ctl === 'headline') { studio.headline = t.value; refreshThumb(); }
});

try { const saved = localStorage.getItem('mv-theme'); if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved; } catch { /* storage unavailable */ }
if (!document.getElementById('toasts')) {
  const host = document.createElement('div'); host.id = 'toasts'; host.setAttribute('aria-live', 'polite'); document.body.appendChild(host);
}
rebuild();
render();
