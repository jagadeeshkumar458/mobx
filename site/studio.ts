// YouTube studio helpers that need a browser: thumbnail drawing and video export.
// Both draw only what the storyboard frames already show.
import type { Beat, FrameContext } from './frames.ts';
import { renderFrame } from './frames.ts';

export type Format = 'landscape' | 'shorts';
export const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  landscape: { w: 1280, h: 720, label: '16:9 video (1280×720)' },
  shorts: { w: 720, h: 1280, label: '9:16 Shorts (720×1280)' },
};

const loadImage = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const img = new Image();
  img.onload = () => res(img); img.onerror = () => rej(new Error('Image failed to load'));
  img.src = src;
});

export function download(name: string, data: Blob | string, type = 'text/plain;charset=utf-8') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---------- Thumbnail ----------

export interface ThumbOptions {
  names: string[];
  headline: string;
  images: (string | undefined)[];
  winnerIndex: number; // -1 = none
  style: 'dark' | 'bright';
}
const THUMB_COLORS = ['#4de0c4', '#8b7cff', '#ff8a5c', '#ffd166', '#5cc8ff'];

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function fitText(g: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight = 900, min = 22): number {
  let s = size;
  do { g.font = `${weight} ${s}px Montserrat, Inter, Arial, sans-serif`; s -= 2; } while (g.measureText(text).width > maxW && s > min);
  return s + 2;
}

/** Draws a 1280×720 thumbnail: big names, VS badges, optional phone photos. */
export async function drawThumbnail(canvas: HTMLCanvasElement, o: ThumbOptions): Promise<void> {
  const W = 1280, H = 720;
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d')!;
  const dark = o.style === 'dark';
  const bg = g.createLinearGradient(0, 0, W, H);
  if (dark) { bg.addColorStop(0, '#2a1250'); bg.addColorStop(0.55, '#120a24'); bg.addColorStop(1, '#05040a'); }
  else { bg.addColorStop(0, '#ffe45c'); bg.addColorStop(1, '#ff9d2e'); }
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const ink = dark ? '#ffffff' : '#111111';
  const n = o.names.length;
  const colW = W / n;
  const imgs = await Promise.all(o.images.map((src) => (src ? loadImage(src).catch(() => null) : null)));

  // Coloured column glows so each phone gets its own zone.
  o.names.forEach((_, i) => {
    const cx = colW * i + colW / 2;
    const glow = g.createRadialGradient(cx, 430, 20, cx, 430, colW * 0.75);
    glow.addColorStop(0, `${THUMB_COLORS[i % 5]}${dark ? '66' : '55'}`); glow.addColorStop(1, `${THUMB_COLORS[i % 5]}00`);
    g.fillStyle = glow; g.fillRect(colW * i, 120, colW, H - 120);
  });

  // Headline band.
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const headline = o.headline.trim().toUpperCase();
  if (headline) {
    fitText(g, headline, W - 120, 92);
    g.lineWidth = 14; g.strokeStyle = dark ? '#000000' : '#ffffff'; g.lineJoin = 'round';
    g.strokeText(headline, W / 2, 86);
    g.fillStyle = dark ? '#ffe45c' : '#111111'; g.fillText(headline, W / 2, 86);
  }

  o.names.forEach((name, i) => {
    const cx = colW * i + colW / 2;
    const ph = 320, pw = ph * 0.47, top = 165;
    const img = imgs[i];
    g.save();
    g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
    if (img) {
      const k = Math.min((colW - 60) / img.width, ph / img.height);
      g.drawImage(img, cx - (img.width * k) / 2, top + (ph - img.height * k) / 2, img.width * k, img.height * k);
    } else {
      roundRect(g, cx - pw / 2, top, pw, ph, 30); g.fillStyle = '#17171c'; g.fill();
      g.shadowColor = 'transparent';
      g.lineWidth = 6; g.strokeStyle = THUMB_COLORS[i % 5]; g.stroke();
      g.beginPath(); g.arc(cx, top + 26, 7, 0, Math.PI * 2); g.fillStyle = '#000'; g.fill();
    }
    g.restore();
    // Name plate.
    const label = name.toUpperCase();
    const size = fitText(g, label, colW - 50, n <= 2 ? 78 : n === 3 ? 60 : 44);
    const y = 608;
    const tw = g.measureText(label).width;
    roundRect(g, cx - tw / 2 - 22, y - size * 0.72, tw + 44, size * 1.44, 16);
    g.fillStyle = i === o.winnerIndex ? THUMB_COLORS[0] : dark ? 'rgba(0,0,0,.72)' : '#111111'; g.fill();
    g.fillStyle = i === o.winnerIndex ? '#06120f' : '#ffffff'; g.fillText(label, cx, y + 2);
    if (i === o.winnerIndex) {
      g.font = '900 30px Montserrat, Inter, Arial, sans-serif';
      g.fillStyle = dark ? THUMB_COLORS[0] : '#111'; g.fillText('★ OUR PICK', cx, y - size * 0.72 - 26);
    }
  });

  // VS badges between columns.
  for (let i = 1; i < n; i++) {
    const x = colW * i, y = 350, r = n <= 3 ? 58 : 44;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = '#ff2d55'; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 24; g.fill(); g.shadowColor = 'transparent';
    g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.stroke();
    g.font = `italic 900 ${r}px Montserrat, Inter, Arial, sans-serif`; g.fillStyle = '#ffffff'; g.fillText('VS', x, y + 3);
  }
  void ink;
}

// ---------- Video export ----------

let cssCache: string | null = null;

async function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b); });
}

/** Page CSS plus the web fonts, inlined so frames render standalone inside an SVG. */
async function frameCss(): Promise<string> {
  if (cssCache !== null) return cssCache;
  let css = '';
  for (const sheet of [...document.styleSheets]) {
    try { css += [...sheet.cssRules].map((r) => r.cssText).join('\n'); } catch { /* cross-origin sheet: fonts, handled below */ }
  }
  try {
    const link = document.querySelector<HTMLLinkElement>('link[href*="fonts.googleapis.com/css"]');
    if (link) {
      const fontCss = await (await fetch(link.href)).text();
      // Keep only the Latin and Telugu subsets of the frame fonts to stay small.
      const blocks = [...fontCss.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g)]
        .filter((m) => (m[1] === 'latin' || m[1] === 'telugu') && /Montserrat|Noto Sans Telugu/.test(m[2]));
      const inlined = await Promise.all(blocks.map(async (m) => {
        const url = /url\((https:[^)]+)\)/.exec(m[2])?.[1];
        if (!url) return '';
        const data = await blobToDataUrl(await (await fetch(url)).blob());
        return m[2].replace(url, data);
      }));
      css += inlined.join('\n');
    }
  } catch { /* offline or blocked: frames fall back to system fonts */ }
  cssCache = css.replace(/@import[^;]+;/g, '');
  return cssCache;
}

/** Renders one storyboard frame to a bitmap at the given size. */
async function frameImage(b: Beat, ctx: FrameContext, w: number, h: number, css: string): Promise<HTMLImageElement> {
  const host = document.createElement('div');
  host.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  host.className = 'screen';
  host.setAttribute('style', `width:${w}px;height:${h}px;border-radius:0;aspect-ratio:auto;font-family:Montserrat,Inter,Arial,sans-serif`);
  host.innerHTML = `<style>${css}</style>${renderFrame(b, ctx)}`;
  const xhtml = new XMLSerializer().serializeToString(host);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject x="0" y="0" width="${w}" height="${h}">${xhtml}</foreignObject></svg>`;
  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

export interface ExportOptions {
  beats: Beat[];
  ctx: FrameContext;
  format: Format;
  /** Shorts only: text above and below the 16:9 frame. */
  title: string;
  footer: string;
  /** Optional voiceover or music file mixed into the video. */
  audio?: File | null;
  onProgress: (done: number, total: number, stage: string) => void;
  signal: { cancelled: boolean };
}

export const canExport = () => typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream;

/**
 * Records the storyboard to a WebM file in real time: every card is drawn to a
 * canvas for exactly its storyboard duration, with a short slide between cards.
 */
export async function exportVideo(o: ExportOptions): Promise<Blob | null> {
  const { w, h } = FORMATS[o.format];
  const fw = w, fh = Math.round((w * 9) / 16);
  const fy = o.format === 'shorts' ? Math.round((h - fh) / 2) : 0;
  const total = o.beats.reduce((a, b) => a + b.durationSec, 0);

  o.onProgress(0, total, 'Preparing frames');
  const css = await frameCss();
  const frames: HTMLImageElement[] = [];
  for (const b of o.beats) {
    if (o.signal.cancelled) return null;
    frames.push(await frameImage(b, o.ctx, fw, fh, css));
    o.onProgress(0, total, `Preparing frames ${frames.length}/${o.beats.length}`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d')!;
  const stream = canvas.captureStream(30);

  let audioCtx: AudioContext | null = null;
  let audioSrc: AudioBufferSourceNode | null = null;
  if (o.audio) {
    audioCtx = new AudioContext();
    const buf = await audioCtx.decodeAudioData(await o.audio.arrayBuffer());
    const dest = audioCtx.createMediaStreamDestination();
    audioSrc = audioCtx.createBufferSource(); audioSrc.buffer = buf; audioSrc.connect(dest);
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  }

  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
  const rec = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>((res) => { rec.onstop = () => res(); });

  const drawChrome = (b: Beat) => {
    if (o.format !== 'shorts') return;
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#2a1250'); bg.addColorStop(0.5, '#0b0716'); bg.addColorStop(1, '#05040a');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff';
    // Title wraps onto up to three lines above the frame.
    const words = o.title.toUpperCase().split(' ');
    g.font = '900 64px Montserrat, Inter, Arial, sans-serif';
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (g.measureText(next).width > w - 80 && line) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    const top = fy / 2 - ((lines.length - 1) * 76) / 2;
    lines.slice(0, 3).forEach((l, i) => {
      g.fillStyle = /^VS$/i.test(l.trim()) ? '#ff2d55' : '#ffffff';
      g.fillText(l, w / 2, top + i * 76);
    });
    g.fillStyle = '#7cf2c9'; g.font = '800 46px Montserrat, Inter, Arial, sans-serif';
    g.fillText((b.title ?? '').toUpperCase(), w / 2, fy + fh + 110, w - 60);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '600 30px Inter, Arial, sans-serif';
    g.fillText(o.footer, w / 2, h - 120, w - 80);
  };

  const SLIDE = 0.45;
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const startAt = performance.now();
  rec.start(1000);
  audioSrc?.start();

  let elapsedBefore = 0;
  try {
    for (let i = 0; i < o.beats.length; i++) {
      const b = o.beats[i];
      const t0 = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          if (o.signal.cancelled) return resolve();
          const t = (performance.now() - t0) / 1000;
          drawChrome(b);
          if (o.format !== 'shorts') { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }
          const k = i > 0 && t < SLIDE ? ease(t / SLIDE) : 1;
          if (k < 1) {
            g.globalAlpha = 1 - k; g.drawImage(frames[i - 1], -fw * 0.06 * k, fy, fw, fh);
            g.globalAlpha = k; g.drawImage(frames[i], fw * 0.07 * (1 - k), fy, fw, fh);
            g.globalAlpha = 1;
          } else g.drawImage(frames[i], 0, fy, fw, fh);
          o.onProgress(Math.min(total, elapsedBefore + t), total, 'Recording');
          if (t >= b.durationSec) resolve(); else setTimeout(tick, 1000 / 30);
        };
        tick();
      });
      if (o.signal.cancelled) break;
      elapsedBefore += b.durationSec;
    }
  } finally {
    void startAt;
    try { audioSrc?.stop(); } catch { /* not started */ }
    rec.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    void audioCtx?.close();
  }
  return o.signal.cancelled ? null : new Blob(chunks, { type: 'video/webm' });
}
