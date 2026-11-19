// Poster geometry: the white frame, the caption band and the panel shapes for
// each of the four layouts. All sizes derive from the export dimensions, so a
// layout keeps its proportions at 1080x1080, 1080x1350 and 1920x1080.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

export const LAYOUTS = ['grid', 'hero', 'mosaic', 'duo'];

/** Frame metrics shared by every layout at a given export size. */
export function frameMetrics(W, H) {
  const border = Math.round(W * 0.022);
  const gutter = Math.round(W * 0.012);
  const bandH = Math.round(H * (W > H ? 0.26 : 0.21));
  return {
    border,
    gutter,
    bandH,
    area: {
      x: border,
      y: border,
      w: W - border * 2,
      h: H - border * 2 - bandH - gutter,
    },
  };
}

/** The white caption band along the bottom of the poster. */
export function captionBand(W, H) {
  const m = frameMetrics(W, H);
  return { x: m.border, y: H - m.border - m.bandH, w: W - m.border * 2, h: m.bandH };
}

function rect(x, y, w, h) {
  return { x, y, w, h };
}

/**
 * Panel shapes in fill order. Each shape carries a bounding box for the photo
 * transform and, for the diagonal duo, a clip polygon.
 */
export function panelShapes(layout, W, H) {
  const { area, gutter } = frameMetrics(W, H);
  const { x, y, w, h } = area;
  if (layout === 'grid') {
    const cw = (w - gutter) / 2;
    const ch = (h - gutter) / 2;
    return [
      rect(x, y, cw, ch),
      rect(x + cw + gutter, y, cw, ch),
      rect(x, y + ch + gutter, cw, ch),
      rect(x + cw + gutter, y + ch + gutter, cw, ch),
    ];
  }
  if (layout === 'hero') {
    const topH = (h - gutter) * 0.62;
    const bottomH = h - gutter - topH;
    const cw = (w - gutter) / 2;
    return [
      rect(x, y, w, topH),
      rect(x, y + topH + gutter, cw, bottomH),
      rect(x + cw + gutter, y + topH + gutter, cw, bottomH),
    ];
  }
  if (layout === 'mosaic') {
    const leftW = (w - gutter) * 0.58;
    const rightW = w - gutter - leftW;
    const ch = (h - gutter) / 2;
    return [
      rect(x, y, leftW, h),
      rect(x + leftW + gutter, y, rightW, ch),
      rect(x + leftW + gutter, y + ch + gutter, rightW, ch),
    ];
  }
  // duo: two panels split by a slanted white band
  const topSplit = 0.56;
  const bottomSplit = 0.44;
  const gap = gutter * 1.7;
  const left = rect(x, y, w * topSplit + gap / 2, h);
  left.poly = [
    [x, y],
    [x + w * topSplit, y],
    [x + w * bottomSplit, y + h],
    [x, y + h],
  ];
  const right = rect(x + w * topSplit + gap, y, w - w * topSplit - gap, h);
  right.poly = [
    [x + w * topSplit + gap, y],
    [x + w, y],
    [x + w, y + h],
    [x + w * bottomSplit + gap, y + h],
  ];
  return [left, right];
}

export function panelCount(layout) {
  return layout === 'grid' ? 4 : layout === 'duo' ? 2 : 3;
}

/** Trace a panel shape (polygon for the duo, rectangle otherwise). */
export function traceShape(ctx, shape) {
  ctx.beginPath();
  if (shape.poly) {
    ctx.moveTo(shape.poly[0][0], shape.poly[0][1]);
    for (let i = 1; i < shape.poly.length; i++) ctx.lineTo(shape.poly[i][0], shape.poly[i][1]);
    ctx.closePath();
  } else {
    ctx.rect(shape.x, shape.y, shape.w, shape.h);
  }
}

/** Point-in-shape test used to pick the panel under the pointer. */
export function shapeContains(shape, px, py) {
  if (!shape.poly) {
    return px >= shape.x && px <= shape.x + shape.w && py >= shape.y && py <= shape.y + shape.h;
  }
  let inside = false;
  const pts = shape.poly;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}