// layouts.js — panel layouts for the cover, in the spirit of the classic
// multi-panel game posters: a grid, a hero collage, a diagonal duo and a
// mosaic. Every layout returns panels as rects or polygons in cover pixels,
// with a border gap between them; the renderer clips each panel to its shape.

/** Border width for a cover size: a bold poster frame, scale-invariant. */
export function borderWidth(w, h) {
  return Math.max(4, Math.round(Math.min(w, h) * 0.016));
}

/** Rect panels on a cols x rows grid inside the frame. */
function grid(w, h, b, cols, rows) {
  const panels = [];
  const cw = (w - b * (cols + 1)) / cols;
  const ch = (h - b * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      panels.push({ x: b + c * (cw + b), y: b + r * (ch + b), w: cw, h: ch });
    }
  }
  return panels;
}

/** The six-panel poster grid: 2x3 portrait, 3x2 landscape. */
function layoutGrid(w, h, b) {
  return w >= h ? grid(w, h, b, 3, 2) : grid(w, h, b, 2, 3);
}

/** Hero collage: one large panel plus three smaller ones. */
function layoutHero(w, h, b) {
  if (w >= h) {
    const bigW = (w - b * 2) * 0.60;
    const smallW = w - b * 3 - bigW;
    const smallH = (h - b * 4) / 3;
    const panels = [{ x: b, y: b, w: bigW, h: h - b * 2 }];
    for (let i = 0; i < 3; i++) {
      panels.push({ x: b * 2 + bigW, y: b + i * (smallH + b), w: smallW, h: smallH });
    }
    return panels;
  }
  const bigH = (h - b * 2) * 0.58;
  const smallH = h - b * 3 - bigH;
  const smallW = (w - b * 4) / 3;
  const panels = [{ x: b, y: b, w: w - b * 2, h: bigH }];
  for (let i = 0; i < 3; i++) {
    panels.push({ x: b + i * (smallW + b), y: b * 2 + bigH, w: smallW, h: smallH });
  }
  return panels;
}

/** Diagonal duo: two panels split by a slanted border. */
function layoutDuo(w, h, b) {
  const g = b * 0.75;
  const topX = w * 0.60, botX = w * 0.40;
  return [
    { poly: [[0, 0], [topX - g, 0], [botX - g, h], [0, h]] },
    { poly: [[topX + g, 0], [w, 0], [w, h], [botX + g, h]] },
  ];
}

/** Mosaic: one big panel beside (or above) four smaller ones. */
function layoutMosaic(w, h, b) {
  if (w >= h) {
    const bigH = (h - b * 2) * 0.55;
    const smallH = h - b * 3 - bigH;
    const smallW = (w - b * 5) / 4;
    const panels = [{ x: b, y: b, w: w - b * 2, h: bigH }];
    for (let i = 0; i < 4; i++) {
      panels.push({ x: b + i * (smallW + b), y: b * 2 + bigH, w: smallW, h: smallH });
    }
    return panels;
  }
  const bigW = (w - b * 2) * 0.55;
  const smallW = w - b * 3 - bigW;
  const smallH = (h - b * 3) / 2;
  const panels = [{ x: b, y: b, w: bigW, h: h - b * 2 }];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      panels.push({ x: b * 2 + bigW + c * (smallW + b), y: b + r * (smallH + b), w: smallW, h: smallH });
    }
  }
  return panels;
}

/** The layouts the editor offers, with their panel counts. */
export const LAYOUTS = [
  { id: 'grid', name: 'Poster Grid', panels: 6, compute: layoutGrid },
  { id: 'hero', name: 'Hero Collage', panels: 4, compute: layoutHero },
  { id: 'mosaic', name: 'Mosaic', panels: 5, compute: layoutMosaic },
  { id: 'duo', name: 'Diagonal Duo', panels: 2, compute: layoutDuo },
];

/** Panel shapes for a layout at a cover size. */
export function panelShapes(layoutId, w, h) {
  const layout = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0];
  return layout.compute(w, h, borderWidth(w, h));
}

/** The bounding rect of a panel shape (rect or polygon). */
export function panelBounds(shape) {
  if (!shape.poly) return shape;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of shape.poly) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Clip a context to a panel shape. */
export function clipPanel(ctx, shape) {
  ctx.beginPath();
  if (shape.poly) {
    ctx.moveTo(shape.poly[0][0], shape.poly[0][1]);
    for (let i = 1; i < shape.poly.length; i++) ctx.lineTo(shape.poly[i][0], shape.poly[i][1]);
  } else {
    ctx.rect(shape.x, shape.y, shape.w, shape.h);
  }
  ctx.closePath();
  ctx.clip();
}

/** Hit-test a cover-space point against the panels; returns the index or -1. */
export function hitPanel(shapes, x, y) {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (s.poly) {
      let inside = false;
      const p = s.poly;
      for (let a = 0, b = p.length - 1; a < p.length; b = a++) {
        if (p[a][1] > y !== p[b][1] > y && x < ((p[b][0] - p[a][0]) * (y - p[a][1])) / (p[b][1] - p[a][1]) + p[a][0]) inside = !inside;
      }
      if (inside) return i;
    } else if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
      return i;
    }
  }
  return -1;
}