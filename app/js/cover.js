// The poster compositor: white frame, photo panels with per-panel crop and
// grade, caption band, badge, palms and film grain. composeCover is the single
// source of truth for both the live preview and the exported PNG.

import { panelShapes, captionBand, traceShape } from './layouts.js';
import { GRADES, applyGradeOverlay } from './grades.js';
import { drawCaption, drawBadge, drawBandPalm } from './lettering.js';
import { grainTile } from './grain.js';

export const FRAME_WHITE = '#f7f4ef';

/** Clamp a crop offset so the photo always covers its panel. */
export function clampCrop(panel, photo, shape) {
  const base = Math.max(shape.w / photo.w, shape.h / photo.h);
  const scale = base * panel.zoom;
  const overX = Math.max(0, (photo.w * scale - shape.w) / 2);
  const overY = Math.max(0, (photo.h * scale - shape.h) / 2);
  panel.dx = Math.min(overX, Math.max(-overX, panel.dx));
  panel.dy = Math.min(overY, Math.max(-overY, panel.dy));
}

function drawPanel(ctx, shape, panel, photo, grade) {
  ctx.save();
  traceShape(ctx, shape);
  ctx.clip();
  clampCrop(panel, photo, shape);
  const base = Math.max(shape.w / photo.w, shape.h / photo.h);
  const scale = base * panel.zoom;
  const dw = photo.w * scale;
  const dh = photo.h * scale;
  const dx = shape.x + (shape.w - dw) / 2 + panel.dx;
  const dy = shape.y + (shape.h - dh) / 2 + panel.dy;
  ctx.filter = grade.filter;
  ctx.drawImage(photo.canvas, dx, dy, dw, dh);
  ctx.filter = 'none';
  applyGradeOverlay(ctx, shape, grade);
  ctx.restore();
}

/** Render the full poster at exactly W x H. */
export function composeCover(state, photos, W, H) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = FRAME_WHITE;
  ctx.fillRect(0, 0, W, H);

  const shapes = panelShapes(state.layout, W, H);
  const grade = GRADES[state.grade];
  for (let i = 0; i < shapes.length; i++) {
    const panel = state.panels[i];
    const photo = panel && photos[panel.src];
    if (!photo) continue;
    drawPanel(ctx, shapes[i], panel, photo, grade);
  }

  const band = captionBand(W, H);
  if (state.palms) drawBandPalm(ctx, band);
  drawCaption(ctx, band, state, W);
  if (state.badge) drawBadge(ctx, band.x + band.w - band.h * 0.52, band.y + band.h * 0.5, band.h * 0.42);

  if (state.grain) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.12;
    ctx.drawImage(grainTile(W, H), 0, 0);
    ctx.restore();
  }
  return canvas;
}

/** Export the poster as a PNG download at the chosen post size. */
export function exportCover(state, photos, size) {
  const canvas = composeCover(state, photos, size.w, size.h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('PNG encoding failed')); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-cover-${size.w}x${size.h}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(blob);
    }, 'image/png');
  });
}