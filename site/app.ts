// MobileVerse engine demo. Everything shown here — the comparison table, the
// recommendation and the video storyboard — comes from ONE snapshot built by
// the shared engine, exactly as the real app will do on the server.
import {
  buildSnapshot, defaultRegistry, toDashboard, toStoryboard, validateStoryboard,
  DEFAULT_WEIGHTS, specLabel, type ComparisonSnapshot, type PhoneRecord, type Storyboard, type Tier, type Weights,
} from '../shared/comparison-engine/src/index.ts';
// Real phones with a source on every value (validated in tests/seed.test.ts).
import seed from '../database/seed/phones.json' with { type: 'json' };
// Fictional test phones — not real products.
import { alpha, beta, gamma, delta, epsilon } from '../shared/comparison-engine/tests/fixtures.ts';

const REAL = seed.records as unknown as PhoneRecord[];
const FICTIONAL = [alpha, beta, gamma, delta, epsilon];
const PHONES = [...REAL, ...FICTIONAL];
type Lang = 'en' | 'te';

const CATEGORY_LABELS: Record<string, string> = {
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
  selected: REAL.map((p) => p.id),
  mode: 'detailed' as Tier,
  weights: { ...DEFAULT_WEIGHTS } as Weights,
  lang: 'en' as Lang,
  duration: 60,
  edits: {} as Record<string, string>,
};

let snapshot: ComparisonSnapshot;
let storyboard: Storyboard;

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const label = (key: string) => EXTRA_LABELS[key] ?? specLabel('en', key);
const phoneName = (id: string) => { const p = snapshot.phones.find((x) => x.id === id)!; return `${p.brand} ${p.model}`; };

function rebuild() {
  const phones = state.selected.map((id) => PHONES.find((p) => p.id === id)!);
  snapshot = buildSnapshot(phones, defaultRegistry);
  storyboard = toStoryboard(snapshot, { language: state.lang, durationSec: state.duration, weights: state.weights });
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
      <span>${esc(phoneName(r.phoneId))}</span><span class="small">${r.score ?? '—'} · data ${Math.round(r.confidence * 100)}%</span>
      <div class="bar"><i style="width:${r.score ?? 0}%"></i></div>
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
    return `<label class="slider"><span>${WEIGHT_LABELS[k]}</span>
      <input type="range" min="0" max="5" step="0.5" value="${v}" data-weight="${k}" aria-label="${WEIGHT_LABELS[k]} priority">
      <output>${v}</output></label>`;
  }).join('');
  return `<div class="card sticky" id="rec">
    <h2 style="font-size:18px">Your priorities</h2>
    <p class="small" style="margin:4px 0 10px">Drag to reweight. The video's verdict scene uses the same calculation.</p>
    ${sliders}<div id="rec-results">${renderRecResults()}</div></div>`;
}

function renderCategories(): string {
  const d = toDashboard(snapshot, state.mode, state.weights);
  return d.categories.filter((c) => c.rows.length).map((c) => {
    const head = snapshot.phones.map((p) => `<th>${esc(p.model)}</th>`).join('');
    const scores = snapshot.phones.map((p) => {
      const s = c.scores[p.id];
      return `<span class="${c.winnerIds.includes(p.id) ? 'win' : ''}">${esc(p.model)} <b>${s ?? '—'}</b></span>`;
    }).join('');
    const rows = c.rows.map((r) => `<tr><td class="label">${esc(label(r.specKey))}${r.note ? `<span class="note">${NOTE_TEXT[r.note]}</span>` : ''}</td>${
      r.cells.map((cell) => {
        const cls = cell.isBest ? 'best' : cell.status === 'not_available' ? 'na' : cell.status === 'not_verified' ? 'unv' : '';
        const title = cell.sourceType ? `Source: ${cell.sourceType.replace(/_/g, ' ')}${cell.conditions ? ' · ' + Object.values(cell.conditions).join(', ') : ''}` : '';
        return `<td class="${cls}" title="${esc(title)}">${esc(cell.display)}</td>`;
      }).join('')}</tr>`).join('');
    return `<article class="card">
      <div class="cat-head"><h3>${esc(CATEGORY_LABELS[c.key] ?? c.key)}</h3>
        <div class="badges"><span class="badge ${c.priority === 'P0' ? 'p0' : ''}">${c.priority}</span><span class="badge">${Math.round(c.coverage * 100)}% verified</span></div></div>
      ${snapshot.phones.length > 1 && Object.values(c.scores).some((v) => v !== null) ? `<div class="scores">Score: ${scores}</div>` : ''}
      <div class="table-wrap"><table><thead><tr><th>Spec</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
    </article>`;
  }).join('') || '<p class="empty">No data for this view.</p>';
}

function renderStoryboard(): string {
  const scenes = storyboard.scenes.map((s) => `
    <div class="scene" data-scene="${s.id}">
      <div class="scene-top"><b>${esc(s.type)}</b><span>${s.durationSec}s</span></div>
      ${s.type === 'phoneReveal' ? '<p class="small" style="margin:0">Phone images animate in (no narration)</p>'
        : `<textarea data-narration="${s.id}" aria-label="Narration for ${esc(s.type)}" lang="${state.lang}">${esc(state.edits[s.id] ?? s.narration)}</textarea>`}
      ${s.facts.length ? `<div class="facts">${s.facts.map((f) => `<span class="fact ${f.isBest ? 'best' : ''}">${esc(snapshot.phones.find((p) => p.id === f.phoneId)!.model)} · ${esc(f.display)}</span>`).join('')}</div>` : ''}
      <div class="issue" data-issue="${s.id}"></div>
    </div>`).join('');
  return `<section class="section card" id="video">
    <div class="section-head"><div><h2>Video storyboard</h2>
      <p class="hint">Built from the same snapshot. Try editing a narration to add a number that isn't in the data.</p></div>
      <div class="controls">
        <label>Language <select data-ctl="lang"><option value="en" ${state.lang === 'en' ? 'selected' : ''}>English</option><option value="te" ${state.lang === 'te' ? 'selected' : ''}>తెలుగు</option></select></label>
        <label>Length <select data-ctl="duration">${[30, 60, 90, 120].map((d) => `<option value="${d}" ${state.duration === d ? 'selected' : ''}>${d}s</option>`).join('')}</select></label>
        <button class="btn" data-ctl="reset">Reset edits</button>
      </div></div>
    <div id="status" class="status"></div>
    <div class="scenes">${scenes}</div>
  </section>`;
}

function chip(p: PhoneRecord): string {
  const on = state.selected.includes(p.id);
  const full = !on && state.selected.length === 5;
  return `<button class="chip" data-phone="${p.id}" aria-pressed="${on}" ${full ? 'disabled title="Up to 5 phones"' : ''}>${esc(p.brand)} ${esc(p.model)}</button>`;
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
  return `<section class="section card"><h2>Sources</h2>
    <p class="hint">Checked ${esc(REAL[0].specs[Object.keys(REAL[0].specs)[0]].lastUpdated)}. Hover a table cell to see its source type.</p>
    ${byPhone.map(({ p, map }) => `<h3 class="src-phone">${esc(p.brand)} ${esc(p.model)} <span class="small">${esc(p.variant ?? '')} · ${esc(p.region ?? '')}</span></h3>
      <ul class="sources">${[...map].map(([url, e]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(new URL(url).hostname.replace(/^www\./, ''))}</a>
        <span class="small">${[...e.types].join(', ')} · ${e.specs.map(esc).join(', ')}</span></li>`).join('')}</ul>`).join('')}
  </section>`;
}

function updateValidation() {
  const issues = validateStoryboard(editedStoryboard(), snapshot);
  const status = document.getElementById('status')!;
  status.className = `status ${issues.length ? 'bad' : 'ok'}`;
  status.textContent = issues.length
    ? `Render blocked: ${issues.length} problem${issues.length > 1 ? 's' : ''}. The video can only say what the verified data says.`
    : `Ready to render — every value matches snapshot ${snapshot.contentHash.slice(0, 12)}.`;
  document.querySelectorAll<HTMLElement>('[data-scene]').forEach((el) => {
    const mine = issues.filter((i) => i.sceneId === el.dataset.scene);
    el.classList.toggle('invalid', mine.length > 0);
    el.querySelector<HTMLElement>('[data-issue]')!.textContent = mine.map((i) => i.problem).join(' · ');
  });
}

function render() {
  const app = document.getElementById('app')!;
  const missing = snapshot.warnings.filter((w) => w.kind === 'missing').length;
  const unverified = snapshot.warnings.filter((w) => w.kind === 'unverified').length;
  app.innerHTML = `
  <header class="top"><div class="wrap">
    <div class="brand"><h1>Mobile<span>Verse</span></h1><span class="sub">Comparison engine demo</span></div>
    <p class="lede">One verified snapshot feeds both the comparison page and the video storyboard, so a spec can never say one thing on the site and another in a video.</p>
    <div class="banner">Real phones show only values a source stated, each with its link below; anything else shows “Not available”. Prices are India launch prices. The “Fixture” phones are fictional and only demonstrate edge cases.</div>
  </div></header>
  <main class="wrap">
    <section class="section">
      <div class="section-head"><h2>Pick 1–5 phones</h2><span class="hint">Click to add or remove</span></div>
      <p class="group-label">Real phones · sourced</p>
      <div class="chips">${REAL.map(chip).join('')}</div>
      <p class="group-label">Fictional test phones</p>
      <div class="chips">${FICTIONAL.map(chip).join('')}</div>
      <div class="meta"><span>Snapshot <code>${snapshot.contentHash.slice(0, 12)}</code></span><span>Engine ${snapshot.engineVersion}</span><span>Rules ${snapshot.registryVersion}</span><span>${missing} missing · ${unverified} unverified values</span></div>
    </section>
    <div class="grid">
      <div class="stack">
        <div class="section-head" style="margin:0"><h2>Comparison</h2>
          <div class="tabs" role="tablist">${(['quick', 'detailed', 'techie'] as Tier[]).map((m) => `<button class="tab" role="tab" data-mode="${m}" aria-selected="${state.mode === m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div></div>
        ${renderCategories()}
      </div>
      <aside>${renderRecommendation()}</aside>
    </div>
    ${renderStoryboard()}
    ${renderSources()}
  </main>
  <footer><div class="wrap">Source: <a href="https://github.com/jagadeeshkumar458/mobx">github.com/jagadeeshkumar458/mobx</a> · Engine code in <code>shared/comparison-engine</code></div></footer>`;
  updateValidation();
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const phone = t.closest<HTMLElement>('[data-phone]')?.dataset.phone;
  if (phone) {
    const on = state.selected.includes(phone);
    if (on && state.selected.length === 1) return;
    if (!on && state.selected.length === 5) return;
    state.selected = on ? state.selected.filter((x) => x !== phone) : [...state.selected, phone];
    rebuild(); render(); return;
  }
  const mode = t.closest<HTMLElement>('[data-mode]')?.dataset.mode as Tier | undefined;
  if (mode) { state.mode = mode; render(); return; }
  if (t.closest('[data-ctl="reset"]')) { state.edits = {}; render(); }
});

document.addEventListener('change', (e) => {
  const t = e.target as HTMLSelectElement;
  if (t.dataset.ctl === 'lang') { state.lang = t.value as Lang; rebuild(); render(); }
  if (t.dataset.ctl === 'duration') { state.duration = Number(t.value); rebuild(); render(); }
  if (t.dataset.weight) {
    // Weights affect the verdict scene too, so rebuild the storyboard from the same snapshot.
    storyboard = toStoryboard(snapshot, { language: state.lang, durationSec: state.duration, weights: state.weights });
    state.edits = {}; render();
  }
});

document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (t.dataset.weight) {
    state.weights = { ...state.weights, [t.dataset.weight]: Number(t.value) };
    t.parentElement!.querySelector('output')!.textContent = t.value;
    document.getElementById('rec-results')!.innerHTML = renderRecResults();
  }
  if (t.dataset.narration) { state.edits[t.dataset.narration] = t.value; updateValidation(); }
});

rebuild();
render();
