// lettering.js — the cover's typography: a bold auto-fitted caption in three
// original styles (sunset gradient, neon sign, chrome), a letter-spaced
// subtitle, a VI badge and palm silhouettes over a bottom scrim. All text is
// drawn programmatically with the app's bundled OFL fonts.

import { rng, palm } from './scenes.js';

export const CAPTION_STYLES = [
  { id: 'sunset', name: 'Sunset Strip' },
  { id: 'neon', name: 'Neon Sign' },
  { id: 'chrome', name: 'Chrome' },
];

const TITLE_FONT = 'Anton';
const SUB_FONT = 'Bungee';

/** Fit the title to the cover width, wrapping long lines at a space. */
function fitTitle(ctx, text, w, h) {
  const maxW = w * 0.90;
  let fs = Math.min(h * 0.24, w * 0.30);
  let lines = text.toUpperCase().split('\n');
  const fit = () => {
    ctx.font = `${fs}px ${TITLE_FONT}`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest > maxW) fs *= maxW / widest;
  };
  fit();
  // Only wrap when a single line would shrink below a bold poster size.
  if (lines.length === 1 && fs < h * 0.11 && lines[0].includes(' ')) {
    const words = lines[0].split(' ');
    let best = 1, bestDiff = Infinity;
    ctx.font = `${fs}px ${TITLE_FONT}`;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const diff = Math.abs(ctx.measureText(a).width - ctx.measureText(b).width);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    fs = Math.min(h * 0.15, w * 0.30);
    fit();
  }
  fs = Math.max(fs, h * 0.05);
  return { lines, fs };
}

/** The bottom palms and caption block; the scrim lives in the panels. */
export function drawCaption(ctx, w, h, caption, shapes = []) {
  const title = (caption.title ?? '').trim();
  const subtitle = (caption.subtitle ?? '').trim();

  // Palm silhouettes rising from the bottom corners, clipped to the panels
  // so they never smudge the poster's borders.
  if (caption.palms && shapes.length > 0) {
    const rand = rng(808);
    const ink = 'rgba(10,2,22,0.96)';
    ctx.save();
    ctx.beginPath();
    for (const shape of shapes) {
      if (shape.poly) {
        ctx.moveTo(shape.poly[0][0], shape.poly[0][1]);
        for (let i = 1; i < shape.poly.length; i++) ctx.lineTo(shape.poly[i][0], shape.poly[i][1]);
        ctx.closePath();
      } else {
        ctx.rect(shape.x, shape.y, shape.w, shape.h);
      }
    }
    ctx.clip();
    palm(ctx, w * 0.045, h * 1.03, h * 0.30, 0.12, ink, rand);
    palm(ctx, w * 0.965, h * 1.04, h * 0.34, -0.10, ink, rand);
    ctx.restore();
  }

  if (!title && !subtitle) return;
  const style = caption.style ?? 'sunset';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';

  let fs = 0, lines = [];
  if (title) {
    ctx.letterSpacing = '0px';
    ({ lines, fs } = fitTitle(ctx, title, w, h));
  }
  const subFs = Math.max(fs * 0.20, h * 0.02);
  // Anchor the block from the bottom so every line stays on the cover.
  const subBaseline = h * 0.955;
  const lastTitleBaseline = subtitle ? subBaseline - subFs * 1.45 : h * 0.94;
  let y = lastTitleBaseline - (lines.length - 1) * fs * 1.04;

  for (const line of lines) {
    ctx.font = `${fs}px ${TITLE_FONT}`;
    ctx.letterSpacing = `${fs * 0.015}px`;
    if (style === 'neon') {
      ctx.shadowColor = '#ff3df0';
      ctx.shadowBlur = fs * 0.32;
      ctx.strokeStyle = '#08222e';
      ctx.lineWidth = fs * 0.05;
      ctx.strokeText(line, w / 2, y);
      ctx.fillStyle = '#b9f6ff';
      ctx.fillText(line, w / 2, y);
      ctx.fillText(line, w / 2, y);
      ctx.shadowBlur = 0;
    } else {
      const g = ctx.createLinearGradient(0, y - fs * 0.86, 0, y + fs * 0.08);
      if (style === 'chrome') {
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.42, '#cdd8e6');
        g.addColorStop(0.55, '#7d8fa8'); g.addColorStop(0.72, '#eef3fa');
        g.addColorStop(1, '#9fb0c6');
      } else {
        g.addColorStop(0, '#ffe45e'); g.addColorStop(0.42, '#ff9a3d');
        g.addColorStop(0.75, '#ff4f8b'); g.addColorStop(1, '#c04dff');
      }
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = fs * 0.12;
      ctx.shadowOffsetY = fs * 0.05;
      ctx.strokeStyle = '#1c0834';
      ctx.lineWidth = fs * 0.10;
      ctx.strokeText(line, w / 2, y);
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.fillStyle = g;
      ctx.fillText(line, w / 2, y);
    }
    y += fs * 1.04;
  }

  if (subtitle) {
    ctx.font = `${subFs}px ${SUB_FONT}`;
    ctx.letterSpacing = `${subFs * 0.34}px`;
    ctx.fillStyle = style === 'neon' ? '#8ef3ff' : style === 'chrome' ? '#dfe8f4' : '#ffd9f0';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = subFs * 0.3;
    const sy = subBaseline;
    ctx.fillText(subtitle.toUpperCase(), w / 2, sy);
    ctx.shadowBlur = 0;
    // Flanking dashes.
    const tw = ctx.measureText(subtitle.toUpperCase()).width;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = Math.max(1.5, subFs * 0.09);
    const dash = subFs * 0.9, gap = subFs * 0.5;
    ctx.beginPath();
    ctx.moveTo(w / 2 - tw / 2 - gap - dash, sy - subFs * 0.3);
    ctx.lineTo(w / 2 - tw / 2 - gap, sy - subFs * 0.3);
    ctx.moveTo(w / 2 + tw / 2 + gap, sy - subFs * 0.3);
    ctx.lineTo(w / 2 + tw / 2 + gap + dash, sy - subFs * 0.3);
    ctx.stroke();
  }
  ctx.letterSpacing = '0px';
  ctx.restore();

  // VI badge, top-right: an original gradient monogram in a rounded frame.
  if (caption.badge) {
    const s = Math.min(w, h) * 0.115;
    const bx = w - s * 1.32, by = s * 0.42;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(bx, by, s * 1.06, s * 0.8, s * 0.14);
    ctx.fillStyle = 'rgba(12,3,26,0.82)';
    ctx.fill();
    const bg = ctx.createLinearGradient(bx, by, bx + s, by + s);
    bg.addColorStop(0, '#ffe45e'); bg.addColorStop(0.5, '#ff4f8b'); bg.addColorStop(1, '#7a2bff');
    ctx.strokeStyle = bg;
    ctx.lineWidth = Math.max(2, s * 0.05);
    ctx.stroke();
    ctx.font = `${s * 0.52}px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = `${s * 0.02}px`;
    const tg = ctx.createLinearGradient(0, by, 0, by + s * 0.8);
    tg.addColorStop(0, '#ffe45e'); tg.addColorStop(0.6, '#ff7ab8'); tg.addColorStop(1, '#c04dff');
    ctx.fillStyle = tg;
    ctx.fillText('VI', bx + s * 0.53, by + s * 0.44);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }
}