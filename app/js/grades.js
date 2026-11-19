// The five color grades. Each grade is a canvas filter applied while the photo
// is drawn, plus a gradient wash and a vignette, so grading stays fast and
// deterministic (no per-pixel loops, no randomness).

import { traceShape } from './layouts.js';

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    swatch: ['#ffd75e', '#ff4f9a', '#7b2fd6'],
    filter: 'saturate(1.35) contrast(1.08) brightness(1.03)',
    wash: [[0, 'rgba(255,196,90,0.34)'], [0.55, 'rgba(255,84,150,0.28)'], [1, 'rgba(96,32,168,0.36)']],
    blend: 'soft-light',
    vignette: 0.24,
  },
  neon: {
    label: 'Neon Night',
    swatch: ['#23d9ff', '#3a2a8a', '#ff3fd8'],
    filter: 'saturate(1.55) contrast(1.2) brightness(0.82)',
    wash: [[0, 'rgba(32,220,255,0.32)'], [1, 'rgba(255,44,220,0.36)']],
    blend: 'soft-light',
    vignette: 0.42,
  },
  golden: {
    label: 'Golden Hour',
    swatch: ['#ffe9a8', '#ffb02e', '#c96a2e'],
    filter: 'sepia(0.3) saturate(1.5) contrast(1.06)',
    wash: [[0, 'rgba(255,220,130,0.38)'], [1, 'rgba(255,122,52,0.32)']],
    blend: 'soft-light',
    vignette: 0.18,
  },
  ocean: {
    label: 'Ocean Drive',
    swatch: ['#8fe8e0', '#2e9ec9', '#1c3f8f'],
    filter: 'saturate(1.28) contrast(1.07) hue-rotate(12deg) brightness(1.02)',
    wash: [[0, 'rgba(90,226,230,0.3)'], [1, 'rgba(24,84,200,0.36)']],
    blend: 'soft-light',
    vignette: 0.22,
  },
  raw: {
    label: 'Raw Photo',
    swatch: ['#cfcfcf', '#8a8a8a', '#4a4a4a'],
    filter: 'none',
    wash: null,
    blend: null,
    vignette: 0,
  },
};

export const GRADE_IDS = Object.keys(GRADES);

/** Draw the grade's wash and vignette inside the current clip. */
export function applyGradeOverlay(ctx, shape, grade) {
  const { x, y, w, h } = shape;
  if (grade.wash) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    for (const [p, c] of grade.wash) g.addColorStop(p, c);
    ctx.save();
    ctx.globalCompositeOperation = grade.blend;
    ctx.fillStyle = g;
    traceShape(ctx, shape);
    ctx.fill();
    ctx.restore();
  }
  if (grade.vignette > 0) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.hypot(w, h) / 2;
    const g = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
    g.addColorStop(0, 'rgba(12,4,32,0)');
    g.addColorStop(1, `rgba(12,4,32,${grade.vignette})`);
    ctx.fillStyle = g;
    traceShape(ctx, shape);
    ctx.fill();
  }
}