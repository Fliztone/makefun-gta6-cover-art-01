// Caption lettering and the poster's original ornaments: an auto-fitted bold
// headline in three finishes (sunset gradient, neon glow, chrome), a hand-drawn
// VI badge and palm silhouettes. Fonts are the OFL files under app/fonts.

import { paintPalm } from './scenes.js';

const CAPTION_FONT = 'Anton, "Arial Narrow", sans-serif';
const BADGE_FONT = 'Bungee, sans-serif';

export const CAPTION_STYLES = {
  sunset: { label: 'Sunset Gradient' },
  neon: { label: 'Neon Glow' },
  chrome: { label: 'Chrome' },
};

/** Fit the headline to the band: shrink until it fits, never wrap. */
function fitCaption(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px ${CAPTION_FONT}`;
  const width = ctx.measureText(text).width;
  if (width > maxWidth) size = Math.max(12, size * (maxWidth / width));
  ctx.font = `${size}px ${CAPTION_FONT}`;
  return size;
}

/**
 * Draw the caption inside the white band. The badge reserves the right edge
 * and the decorative palm the left, so the text centers in what remains.
 */
export function drawCaption(ctx, band, state, W) {
  const text = (state.caption || '').trim().toUpperCase();
  if (!text) return;
  const pad = band.h * 0.22;
  const leftReserve = state.palms ? band.h * 0.62 : pad;
  const rightReserve = state.badge ? band.h * 1.06 : pad;
  const areaX = band.x + leftReserve;
  const areaW = band.w - leftReserve - rightReserve;
  if (areaW <= 0) return;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${Math.round(band.h * 0.012)}px`; } catch { /* older engines */ }
  const size = fitCaption(ctx, text, areaW, band.h * 0.68);
  const cx = areaX + areaW / 2;
  const cy = band.y + band.h * 0.52;
  const top = cy - size * 0.5;

  if (state.captionStyle === 'sunset') {
    const g = ctx.createLinearGradient(0, top, 0, top + size);
    g.addColorStop(0, '#ffe95e');
    g.addColorStop(0.42, '#ff9e3d');
    g.addColorStop(0.72, '#ff4f9a');
    g.addColorStop(1, '#8b2fd6');
    ctx.shadowColor = 'rgba(40,8,60,0.3)';
    ctx.shadowBlur = size * 0.06;
    ctx.shadowOffsetY = size * 0.03;
    ctx.fillStyle = g;
    ctx.fillText(text, cx, cy);
  } else if (state.captionStyle === 'neon') {
    ctx.shadowColor = '#ff3df0';
    ctx.shadowBlur = size * 0.4;
    ctx.fillStyle = '#ffe9fb';
    ctx.fillText(text, cx, cy);
    ctx.fillText(text, cx, cy);
    ctx.shadowColor = '#23d9ff';
    ctx.shadowBlur = size * 0.16;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, cx, cy);
  } else {
    const g = ctx.createLinearGradient(0, top, 0, top + size);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.36, '#cfd6e6');
    g.addColorStop(0.5, '#5a6478');
    g.addColorStop(0.56, '#e9eff8');
    g.addColorStop(0.82, '#9aa4b8');
    g.addColorStop(1, '#f4f7ff');
    ctx.lineWidth = Math.max(1.5, size * 0.022);
    ctx.strokeStyle = 'rgba(22,26,44,0.85)';
    ctx.strokeText(text, cx, cy);
    ctx.fillStyle = g;
    ctx.fillText(text, cx, cy);
  }
  ctx.restore();
}

/**
 * The original VI badge: a sunset disc under a white ring, two palm
 * silhouettes and bold VI letters. Drawn from paths, not taken from any game.
 */
export function drawBadge(ctx, cx, cy, r) {
  ctx.save();
  // soft drop shadow to lift it off the white band
  ctx.shadowColor = 'rgba(30,10,50,0.35)';
  ctx.shadowBlur = r * 0.25;
  ctx.shadowOffsetY = r * 0.06;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const disc = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  disc.addColorStop(0, '#ffd75e');
  disc.addColorStop(0.5, '#ff5f8f');
  disc.addColorStop(1, '#7b2ff7');
  ctx.fillStyle = disc;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // palms inside the disc, clipped to it
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.94, 0, Math.PI * 2);
  ctx.clip();
  paintPalm(ctx, cx - r * 0.55, cy + r * 0.95, r * 0.9, 0.14, 'rgba(28,10,48,0.9)');
  paintPalm(ctx, cx + r * 0.6, cy + r * 0.98, r * 0.78, -0.12, 'rgba(28,10,48,0.9)');
  ctx.restore();
  // ring + letters
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.09;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.font = `${r * 0.92}px ${BADGE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = r * 0.14;
  ctx.strokeStyle = 'rgba(30,10,50,0.55)';
  ctx.strokeText('VI', cx, cy - r * 0.16);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('VI', cx, cy - r * 0.16);
  ctx.restore();
}

/** Decorative palm tucked inside the left edge of the caption band. */
export function drawBandPalm(ctx, band) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(band.x, band.y, band.w, band.h);
  ctx.clip();
  const height = band.h * 0.68;
  paintPalm(ctx, band.x + band.h * 0.26, band.y + band.h * 0.98, height, 0.12, 'rgba(35,12,58,0.88)');
  ctx.restore();
}