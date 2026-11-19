// grades.js — the colour grades that give any photo or scene the Vice City
// look: a canvas filter pass plus blended gradient overlays and a vignette.
// Each grade is pure data so the editor can show it as a swatch.

export const GRADES = [
  {
    id: 'sunset',
    name: 'Vice Sunset',
    swatch: 'linear-gradient(180deg,#3b1160,#ff5e78 55%,#ffb347)',
    filter: 'saturate(1.28) contrast(1.06)',
    overlay: { stops: [[0, '#3b1160'], [0.55, '#ff5e78'], [1, '#ffb347']], blend: 'overlay', alpha: 0.34 },
    vignette: 0.30,
  },
  {
    id: 'neon',
    name: 'Neon Night',
    swatch: 'linear-gradient(180deg,#00e5ff,#7a2bff 50%,#ff2fd6)',
    filter: 'saturate(1.45) contrast(1.12) brightness(0.94)',
    overlay: { stops: [[0, '#00e5ff'], [0.5, '#7a2bff'], [1, '#ff2fd6']], blend: 'overlay', alpha: 0.42 },
    lift: { color: '#12043a', blend: 'screen', alpha: 0.22 },
    vignette: 0.42,
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    swatch: 'linear-gradient(180deg,#ffe0a0,#ffcf6e 50%,#ff7a3d)',
    filter: 'saturate(1.18) contrast(1.05)',
    overlay: { stops: [[0, '#ffe0a0'], [0.5, '#ffcf6e'], [1, '#ff7a3d']], blend: 'overlay', alpha: 0.30 },
    vignette: 0.24,
  },
  {
    id: 'ocean',
    name: 'Ocean Drive',
    swatch: 'linear-gradient(180deg,#0affd9,#2aa8c9 55%,#0a6cff)',
    filter: 'saturate(1.25) contrast(1.06)',
    overlay: { stops: [[0, '#0affd9'], [0.55, '#2aa8c9'], [1, '#0a6cff']], blend: 'overlay', alpha: 0.32 },
    vignette: 0.28,
  },
  {
    id: 'raw',
    name: 'No Grade',
    swatch: 'linear-gradient(180deg,#888,#444)',
    filter: 'none',
    overlay: null,
    vignette: 0.12,
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** Apply a grade inside an already-clipped panel rect. */
export function applyGrade(ctx, x, y, w, h, grade) {
  if (grade.overlay) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    for (const [o, c] of grade.overlay.stops) g.addColorStop(o, c);
    ctx.save();
    ctx.globalCompositeOperation = grade.overlay.blend;
    ctx.globalAlpha = grade.overlay.alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
  if (grade.lift) {
    ctx.save();
    ctx.globalCompositeOperation = grade.lift.blend;
    ctx.globalAlpha = grade.lift.alpha;
    ctx.fillStyle = grade.lift.color;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
  if (grade.vignette > 0) {
    const cx = x + w / 2, cy = y + h / 2;
    const r = Math.max(w, h) * 0.75;
    const v = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
    v.addColorStop(0, 'rgba(10,2,24,0)');
    v.addColorStop(1, `rgba(10,2,24,${grade.vignette})`);
    ctx.fillStyle = v;
    ctx.fillRect(x, y, w, h);
  }
}