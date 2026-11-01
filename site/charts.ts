// SVG charts for the comparison page. They draw only category scores the
// engine computed from verified data; a missing score is shown as a gap, not 0.
import type { ComparisonSnapshot } from '../shared/comparison-engine/src/index.ts';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const RADAR_KEYS = ['performance', 'camera', 'display', 'battery', 'software', 'price', 'ai', 'design'];

export function radarChart(s: ComparisonSnapshot, labels: Record<string, string>): string {
  const keys = RADAR_KEYS.filter((k) => s.categories.find((c) => c.key === k && Object.values(c.scores).some((v) => v !== null)));
  if (keys.length < 3 || s.phones.length < 1) return `<p class="empty">Not enough verified data across categories to draw the radar yet.</p>`;
  const size = 320, cx = size / 2, cy = size / 2, R = 118;
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / keys.length;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const rings = [0.25, 0.5, 0.75, 1].map((f) => `<polygon class="rd-ring" points="${keys.map((_, i) => pt(i, R * f).join(',')).join(' ')}"/>`).join('');
  const axes = keys.map((k, i) => {
    const [x, y] = pt(i, R); const [lx, ly] = pt(i, R + 22);
    const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end';
    return `<line class="rd-axis" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/><text class="rd-label" x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="middle">${esc(labels[k] ?? k)}</text>`;
  }).join('');
  const shapes = s.phones.map((p, pi) => {
    const pts = keys.map((k, i) => {
      const v = s.categories.find((c) => c.key === k)!.scores[p.id];
      return { xy: pt(i, (R * (v ?? 0)) / 100), v };
    });
    // Missing scores are skipped, never drawn as zero.
    const known = pts.filter((x) => x.v !== null);
    const dots = known.map(({ xy }) => `<circle class="rd-dot" cx="${xy[0]}" cy="${xy[1]}" r="3.2"/>`).join('');
    const shape = known.length >= 3 ? `<polygon points="${known.map((x) => x.xy.join(',')).join(' ')}"/>`
      : known.length === 2 ? `<polyline points="${known.map((x) => x.xy.join(',')).join(' ')}"/>` : '';
    return `<g class="rd-shape" style="--c:var(--p${pi});--d:${pi}">${shape}${dots}</g>`;
  }).join('');
  return `<svg class="radar" viewBox="-60 -10 ${size + 120} ${size + 20}" role="img" aria-label="Radar chart of category scores">${rings}${axes}${shapes}</svg>`;
}

/** Animated ring gauge (0–100). Null renders an empty dashed ring. */
export function scoreRing(value: number | null, idx: number, size = 64): string {
  const v = value ?? 0;
  return `<svg class="ring ${value === null ? 'none' : ''}" width="${size}" height="${size}" viewBox="0 0 36 36" style="--c:var(--p${idx});--v:${v}" aria-hidden="true">
    <circle class="ring-bg" cx="18" cy="18" r="15.5" pathLength="100"/>
    <circle class="ring-fg" cx="18" cy="18" r="15.5" pathLength="100"/>
    <text x="18" y="19" text-anchor="middle" dominant-baseline="middle">${value ?? '—'}</text></svg>`;
}
