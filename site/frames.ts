// Video frame layouts, styled after the reference comparison videos.
// Frames are drawn ONLY from storyboard scenes (validated facts + phone names),
// so the video can never show a value the comparison page doesn't.
import type { Scene, ComparisonSnapshot } from '../shared/comparison-engine/src/index.ts';

type Phone = ComparisonSnapshot['phones'][number];
type Cell = { display: string; isBest: boolean };

export type Layout =
  | 'intro' | 'reveal' | 'versusTable' | 'bigStat' | 'chipCards' | 'statRows' | 'verdict' | 'outro';

export interface Beat {
  sceneId: string;
  layout: Layout;
  durationSec: number;
  title?: string;
  /** specKey → phoneId → cell, in scene order. */
  specs: { key: string; label: string; cells: Record<string, Cell> }[];
  theme: 'mint' | 'yellow' | 'dark' | 'light' | 'lavender' | 'purple';
  highlightPhoneId?: string | null;
}

export interface FrameContext {
  phones: Phone[];
  label: (specKey: string) => string;
  categoryTitle: (key: string) => string;
  text: { vs: string; winner: string; tooClose: string; sources: string; placeholder: string };
  snapshotHash: string;
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Short column label like the references: PIXEL / IPHONE / GALAXY. */
export function shortName(p: Phone, all: Phone[]): string {
  const series = /^(Pixel|iPhone|Galaxy)\b/i.exec(p.model)?.[1];
  const short = series ?? p.brand;
  const clash = all.filter((q) => (/^(Pixel|iPhone|Galaxy)\b/i.exec(q.model)?.[1] ?? q.brand).toLowerCase() === short.toLowerCase()).length > 1;
  return clash ? p.model : short;
}

const CATEGORY_THEME: Record<string, Beat['theme']> = {
  performance: 'light', camera: 'lavender', display: 'light', battery: 'dark',
  software: 'purple', price: 'yellow', ai: 'purple', design: 'mint',
};

/** Splits a scene into beats. Values come straight from scene.facts. */
export function buildBeats(scene: Scene, ctx: FrameContext): Beat[] {
  const specs: Beat['specs'] = [];
  for (const f of scene.facts) {
    let s = specs.find((x) => x.key === f.specKey);
    if (!s) { s = { key: f.specKey, label: ctx.label(f.specKey), cells: {} }; specs.push(s); }
    s.cells[f.phoneId] = { display: f.display, isBest: f.isBest };
  }
  const base = { sceneId: scene.id, specs: [] as Beat['specs'], theme: 'purple' as Beat['theme'] };
  let beats: Omit<Beat, 'durationSec'>[] = [];

  if (scene.type === 'intro') beats = [{ ...base, layout: 'intro' }];
  else if (scene.type === 'phoneReveal') beats = [{ ...base, layout: 'reveal', theme: 'mint' }];
  else if (scene.type === 'verdict') beats = [{ ...base, layout: 'verdict', highlightPhoneId: scene.highlightPhoneId }];
  else if (scene.type === 'outro') beats = [{ ...base, layout: 'outro', theme: 'dark' }];
  else if (specs.length) {
    const title = ctx.categoryTitle(scene.categoryKey ?? '');
    const theme = CATEGORY_THEME[scene.categoryKey ?? ''] ?? 'purple';
    const chip = specs.find((s) => s.key === 'chipset');
    const rest = specs.filter((s) => s !== chip);
    if (chip) beats.push({ ...base, layout: 'chipCards', title, specs: [chip], theme: 'light' });
    if (rest.length >= 2) {
      beats.push({ ...base, layout: scene.categoryKey === 'camera' ? 'statRows' : 'versusTable', title, specs: rest, theme: scene.categoryKey === 'camera' ? 'dark' : 'purple' });
    }
    // Spotlight up to two specs with a clear winner, as big numbers over each phone.
    for (const s of rest.filter((x) => Object.values(x.cells).some((c) => c.isBest)).slice(0, 2)) {
      beats.push({ ...base, layout: 'bigStat', title: s.label, specs: [s], theme });
    }
    if (!beats.length) beats.push({ ...base, layout: 'versusTable', title, specs: rest, theme: 'purple' });
  }
  const each = Math.round((scene.durationSec / Math.max(beats.length, 1)) * 10) / 10;
  return beats.map((b) => ({ ...b, durationSec: each }));
}

function phoneArt(): string {
  return `<div class="vf-phone" aria-hidden="true"><i></i></div>`;
}

function splitValue(display: string): [string, string] {
  // Only split "3,000 nits" / "₹89,999" / "5 x" style values; "4K60" stays whole.
  const m = /^([₹]?[\d,]+(?:\.\d+)?)(?:\s+(.+))?$/.exec(display);
  return m ? [m[1], m[2] ?? ''] : [display, ''];
}

export function renderFrame(b: Beat, ctx: FrameContext): string {
  const ps = ctx.phones;
  const n = ps.length;
  const cols = `style="--cols:${n}"`;
  const head = (style: 'caps' | 'pill') => `<div class="vf-cols" ${cols}>${ps.map((p) =>
    style === 'caps' ? `<div class="vf-caps">${esc(shortName(p, ps))}</div>` : `<div><span class="vf-pill">${esc(p.brand)} ${esc(p.model)}</span></div>`).join('')}</div>`;

  switch (b.layout) {
    case 'intro':
      return `<div class="vf vf-purple"><div class="vf-vsrow"><div class="vf-vs">${ctx.text.vs}</div>
        <div class="vf-cols vf-grow" ${cols}>${ps.map((p) => `<div class="vf-col">${phoneArt()}<div class="vf-caps sm">${esc(shortName(p, ps))}</div><div class="vf-sub">${esc(p.model)}</div></div>`).join('')}</div></div>
        <div class="vf-note">${ctx.text.placeholder}</div></div>`;

    case 'reveal':
      return `<div class="vf vf-mint">${head('caps')}<div class="vf-cols vf-grow" ${cols}>${ps.map(() => `<div class="vf-col">${phoneArt()}</div>`).join('')}</div></div>`;

    case 'versusTable': {
      const rows = b.specs.map((s, i) => `<div class="vf-tr ${i % 2 ? 'alt' : ''}" ${cols}><div class="vf-td-label">${esc(s.label)}</div>${ps.map((p) => {
        const c = s.cells[p.id];
        return `<div class="vf-td ${c ? (c.isBest ? 'best' : '') : 'na'}">${c ? esc(c.display) : 'N/A'}</div>`;
      }).join('')}</div>`).join('');
      return `<div class="vf vf-purple vf-table"><div class="vf-thead" ${cols}><div class="vf-vs">${ctx.text.vs}</div>${ps.map((p) => `<div class="vf-col">${phoneArt()}<div class="vf-caps sm">${esc(shortName(p, ps))}</div></div>`).join('')}</div>
        <div class="vf-tbody">${rows}</div>${b.title ? `<div class="vf-tag">${esc(b.title)}</div>` : ''}</div>`;
    }

    case 'bigStat': {
      const s = b.specs[0];
      const style = b.theme === 'light' || b.theme === 'lavender' ? 'pill' : 'caps';
      return `<div class="vf vf-${b.theme}">${style === 'caps' ? head('caps') : ''}
        <div class="vf-cols vf-grow" ${cols}>${ps.map((p) => {
          const c = s.cells[p.id];
          const [num, unit] = c ? splitValue(c.display) : ['N/A', ''];
          return `<div class="vf-col">${style === 'pill' ? `<span class="vf-pill">${esc(p.model)}</span>` : ''}
            <div class="vf-stage">${phoneArt()}<div class="vf-big ${c ? (c.isBest ? 'best' : '') : 'na'}"><b>${esc(num)}</b>${unit ? `<span>${esc(unit)}</span>` : ''}</div></div></div>`;
        }).join('')}</div><div class="vf-tag">${esc(s.label)}</div></div>`;
    }

    case 'chipCards': {
      const s = b.specs[0];
      return `<div class="vf vf-light vf-chips"><div class="vf-band" ${cols}>${ps.map((p) => `<div>${esc(p.brand)} ${esc(p.model)}</div>`).join('')}</div>
        <div class="vf-cols vf-grow" ${cols}>${ps.map((p, i) => `<div class="vf-chipcard c${i % 5}"><div class="vf-chipname">${s.cells[p.id] ? esc(s.cells[p.id].display) : 'N/A'}</div>${phoneArt()}</div>`).join('')}</div></div>`;
    }

    case 'statRows':
      return `<div class="vf vf-dark">${b.title ? `<div class="vf-title">${esc(b.title)}</div>` : ''}${head('pill')}
        <div class="vf-cols vf-grow vf-top" ${cols}>${ps.map((p) => `<div class="vf-stats">${b.specs.map((s) => {
          const c = s.cells[p.id];
          return `<div><span>${esc(s.label)}:</span> <b class="${c ? (c.isBest ? 'best' : '') : 'na'}">${c ? esc(c.display) : 'N/A'}</b></div>`;
        }).join('')}</div>`).join('')}</div></div>`;

    case 'verdict': {
      const w = ps.find((p) => p.id === b.highlightPhoneId);
      return `<div class="vf vf-purple"><div class="vf-cols vf-grow" ${cols}>${ps.map((p) => `<div class="vf-col ${p.id === w?.id ? 'win' : 'dim'}">${phoneArt()}<div class="vf-caps sm">${esc(shortName(p, ps))}</div></div>`).join('')}</div>
        <div class="vf-verdict">${w ? `${ctx.text.winner}: <b>${esc(w.brand)} ${esc(w.model)}</b>` : ctx.text.tooClose}</div></div>`;
    }

    case 'outro':
      return `<div class="vf vf-dark vf-center"><div class="vf-title">${ctx.text.sources}</div><div class="vf-sub">snapshot ${esc(ctx.snapshotHash.slice(0, 12))}</div></div>`;
  }
}
