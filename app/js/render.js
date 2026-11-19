// render.js — the cover compositor: panel shapes, fitted photos with the
// chosen grade, the caption block and a deterministic film-grain pass. The
// same function paints the live preview and the full-resolution export, so
// what the editor shows is exactly what the PNG holds.

import { panelShapes, panelBounds, clipPanel, borderWidth } from './layouts.js';
import { gradeById, applyGrade } from './grades.js';
import { drawCaption } from './lettering.js';
import { drawScene, rng } from './scenes.js';

const FALLBACK_SCENES = ['muse', 'sunset-drive', 'heli-beach', 'neon-street', 'ocean-boat', 'skyline-dusk'];

/** A seeded noise tile, built once: the grain is identical on every run. */
let grainTile = null;
function grainPattern(ctx) {
  if (!grainTile) {
    const rand = rng(909);
    const c = document.createElement('canvas');
    c.width = 140; c.height = 140;
    const g = c.getContext('2d');
    const data = g.createImageData(140, 140);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 128 + (rand() - 0.5) * 110;
      data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
    }
    g.putImageData(data, 0, 0);
    grainTile = c;
  }
  return ctx.createPattern(grainTile, 'repeat');
}

/** Draw an image cover-fitted into a panel with the panel's zoom and offset. */
function drawFitted(ctx, img, bounds, panel, filter) {
  const iw = img.width, ih = img.height;
  if (!iw || !ih) return;
  const zoom = Math.min(3, Math.max(1, panel.zoom ?? 1));
  const scale = Math.max(bounds.w / iw, bounds.h / ih) * zoom;
  const dw = iw * scale, dh = ih * scale;
  const maxOX = Math.max(0, (dw - bounds.w) / 2);
  const maxOY = Math.max(0, (dh - bounds.h) / 2);
  const ox = Math.min(1, Math.max(-1, panel.ox ?? 0)) * maxOX;
  const oy = Math.min(1, Math.max(-1, panel.oy ?? 0)) * maxOY;
  ctx.filter = filter;
  ctx.drawImage(img, bounds.x + (bounds.w - dw) / 2 + ox, bounds.y + (bounds.h - dh) / 2 + oy, dw, dh);
  ctx.filter = 'none';
}

/**
 * Paint the whole cover. `resolveImage(id)` returns the image (canvas or
 * HTMLImageElement) for a panel's source id, or null. `opts.selected` draws
 * the editor's selection outline (preview only, never in an export).
 */
export function renderCover(ctx, w, h, state, resolveImage, opts = {}) {
  const b = borderWidth(w, h);
  ctx.save();
  ctx.fillStyle = state.border === 'black' ? '#0d0716' : '#f5f0e6';
  ctx.fillRect(0, 0, w, h);

  const shapes = panelShapes(state.layout, w, h);
  const grade = gradeById(state.grade);
  shapes.forEach((shape, i) => {
    const bounds = panelBounds(shape);
    const panel = state.panels[i] ?? {};
    ctx.save();
    clipPanel(ctx, shape);
    const img = panel.src ? resolveImage(panel.src) : null;
    if (img) {
      drawFitted(ctx, img, bounds, panel, grade.filter);
    } else {
      ctx.save();
      ctx.translate(bounds.x, bounds.y);
      drawScene(ctx, FALLBACK_SCENES[i % FALLBACK_SCENES.length], bounds.w, bounds.h);
      ctx.restore();
    }
    applyGrade(ctx, bounds.x, bounds.y, bounds.w, bounds.h, grade);
    // Bottom scrim inside the panel only, so the poster borders stay crisp.
    const scrim = ctx.createLinearGradient(0, h * 0.52, 0, h);
    scrim.addColorStop(0, 'rgba(14,3,30,0)');
    scrim.addColorStop(0.55, 'rgba(14,3,30,0.55)');
    scrim.addColorStop(1, 'rgba(14,3,30,0.94)');
    ctx.fillStyle = scrim;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.restore();
  });

  drawCaption(ctx, w, h, state.caption, shapes);

  // Film grain, deterministic and subtle.
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Editor selection outline (never part of an export).
  if (opts.selected !== undefined && opts.selected >= 0 && shapes[opts.selected]) {
    const shape = shapes[opts.selected];
    ctx.save();
    ctx.beginPath();
    if (shape.poly) {
      ctx.moveTo(shape.poly[0][0], shape.poly[0][1]);
      for (let i = 1; i < shape.poly.length; i++) ctx.lineTo(shape.poly[i][0], shape.poly[i][1]);
      ctx.closePath();
    } else {
      ctx.rect(shape.x, shape.y, shape.w, shape.h);
    }
    ctx.strokeStyle = '#35e0ff';
    ctx.lineWidth = Math.max(2.5, w * 0.0035);
    ctx.shadowColor = '#35e0ff';
    ctx.shadowBlur = w * 0.012;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}