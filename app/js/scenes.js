// scenes.js — original procedural Vice City scenes, drawn entirely in code.
// Every scene is a deterministic vector painting (seeded PRNG, no randomness
// between runs) that the app offers as built-in panel art, and that the app's
// sample images are rendered from. Nothing here is copied from any game.

/** Deterministic PRNG (mulberry32): the same seed paints the same scene. */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Vertical sky gradient from a list of [offset, color] stops. */
function sky(ctx, w, h, stops, y0 = 0, y1 = h) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, w, y1 - y0);
}

/** Tiny stars in the upper part of a scene. */
function stars(ctx, w, h, rand, n, maxY) {
  for (let i = 0; i < n; i++) {
    const x = rand() * w, y = rand() * maxY;
    ctx.globalAlpha = 0.25 + rand() * 0.6;
    ctx.fillStyle = rand() < 0.2 ? '#9be8ff' : '#fff6e8';
    const r = (0.4 + rand() * 1.1) * (w / 1080);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Soft horizontal cloud bands. */
function clouds(ctx, w, h, rand, y, color, n) {
  for (let i = 0; i < n; i++) {
    const cx = rand() * w, cy = y + (rand() - 0.5) * h * 0.1;
    const rw = w * (0.12 + rand() * 0.22), rh = h * (0.008 + rand() * 0.014);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rw);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(1, rh / rw); ctx.translate(-cx, -cy);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, rw, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

/** The striped synthwave sun, painted on a scratch canvas so the stripe gaps
 *  are true cut-outs, then composited with a warm glow. */
function sun(ctx, cx, cy, r, top, mid, bottom) {
  const pad = Math.ceil(r * 0.4);
  const size = Math.ceil(r * 2 + pad * 2);
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const s = c.getContext('2d');
  const cc = size / 2;
  const g = s.createLinearGradient(0, cc - r, 0, cc + r);
  g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, bottom);
  s.fillStyle = g;
  s.beginPath(); s.arc(cc, cc, r, 0, Math.PI * 2); s.fill();
  // Horizontal cut-outs across the lower half, thickening toward the bottom.
  s.globalCompositeOperation = 'destination-out';
  let y = cc + r * 0.08, gap = r * 0.035;
  while (y < cc + r) {
    s.fillRect(0, y, size, gap);
    y += gap + r * 0.115;
    gap *= 1.35;
  }
  // Glow behind the disc.
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.1);
  glow.addColorStop(0, 'rgba(255,150,90,0.5)');
  glow.addColorStop(0.5, 'rgba(255,90,140,0.18)');
  glow.addColorStop(1, 'rgba(255,90,140,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(c, cx - cc, cy - cc);
}

/** A palm silhouette: tapered curved trunk plus a fan of drooping fronds. */
export function palm(ctx, x, y, h, lean, color, rand) {
  const cx = x + lean * h, cy = y - h;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - h * 0.032, y);
  ctx.quadraticCurveTo(x + lean * h * 0.45 - h * 0.018, y - h * 0.55, cx - h * 0.011, cy);
  ctx.lineTo(cx + h * 0.011, cy);
  ctx.quadraticCurveTo(x + lean * h * 0.45 + h * 0.018, y - h * 0.55, x + h * 0.032, y);
  ctx.closePath(); ctx.fill();
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const ang = -Math.PI * (0.94 - 0.88 * t) + (rand() - 0.5) * 0.12;
    const L = h * (0.34 + rand() * 0.16);
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const droop = L * (0.30 + rand() * 0.22);
    const tx = cx + dx * L, ty = cy + dy * L * 0.62 + droop;
    const px = -dy, py = dx;
    const wdt = L * 0.10;
    const mx = cx + dx * L * 0.5, my = cy + dy * L * 0.31 + droop * 0.32;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(mx + px * wdt, my + py * wdt, tx, ty);
    ctx.quadraticCurveTo(mx - px * wdt * 0.55, my - py * wdt * 0.55 + droop * 0.18, cx, cy);
    ctx.closePath(); ctx.fill();
  }
  // Coconut cluster at the crown.
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx + (i - 1) * h * 0.022, cy + h * 0.02, h * 0.018, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A distant city skyline with lit windows. */
function skyline(ctx, x, y, w, h, color, rand, lit = '#ffd98a') {
  ctx.fillStyle = color;
  let bx = x;
  const boxes = [];
  while (bx < x + w) {
    const bw = w * (0.035 + rand() * 0.06);
    const bh = h * (0.3 + rand() * 0.7);
    boxes.push([bx, y - bh, bw, bh]);
    ctx.fillRect(bx, y - bh, bw, bh);
    if (rand() < 0.3) ctx.fillRect(bx + bw * 0.42, y - bh - h * 0.12, bw * 0.16, h * 0.12);
    bx += bw + w * 0.004;
  }
  const u = w / 1080;
  for (const [wx, wy, ww, wh] of boxes) {
    for (let gy = wy + wh * 0.08; gy < wy + wh * 0.94; gy += 7 * u) {
      for (let gx = wx + ww * 0.14; gx < wx + ww * 0.86; gx += 6 * u) {
        if (rand() < 0.32) {
          ctx.globalAlpha = 0.35 + rand() * 0.5;
          ctx.fillStyle = rand() < 0.18 ? '#7de8ff' : lit;
          ctx.fillRect(gx, gy, 2.4 * u, 3.4 * u);
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

/** Ocean: gradient body, shimmer rows and a broken sun-reflection column. */
function water(ctx, x, y, w, h, top, bottom, rand, sunX, sunColor) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const u = w / 1080;
  for (let i = 0; i < 46; i++) {
    const t = i / 46;
    const yy = y + t * t * h;
    const len = w * (0.02 + rand() * 0.1) * (0.4 + t);
    const xx = x + rand() * (w - len);
    ctx.globalAlpha = 0.05 + rand() * 0.12;
    ctx.fillStyle = rand() < 0.5 ? '#ffe9c9' : '#9be8ff';
    ctx.fillRect(xx, yy, len, Math.max(1, 1.6 * u * (0.5 + t)));
  }
  if (sunX !== undefined) {
    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      const yy = y + t * h * 0.96;
      const len = w * (0.03 + t * 0.09) * (0.6 + rand() * 0.8);
      ctx.globalAlpha = 0.3 * (1 - t) + 0.05;
      ctx.fillStyle = sunColor;
      ctx.fillRect(sunX - len / 2 + (rand() - 0.5) * w * 0.02, yy, len, Math.max(1.2, 2.6 * u));
    }
  }
  ctx.globalAlpha = 1;
}

/** A low 1980s wedge sports car, side view facing left, with neon underglow. */
function car(ctx, x, y, w, body, glass, glowColor) {
  const h = w * 0.30;
  // Underglow first, beneath the body.
  const ug = ctx.createRadialGradient(x + w * 0.5, y + h * 0.66, 0, x + w * 0.5, y + h * 0.66, w * 0.55);
  ug.addColorStop(0, glowColor); ug.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(x + w * 0.5, y + h * 0.66); ctx.scale(1, 0.22); ctx.translate(-(x + w * 0.5), -(y + h * 0.66));
  ctx.fillStyle = ug;
  ctx.beginPath(); ctx.arc(x + w * 0.5, y + h * 0.66, w * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.52);
  ctx.quadraticCurveTo(x + w * 0.06, y + h * 0.34, x + w * 0.28, y + h * 0.30);
  ctx.lineTo(x + w * 0.44, y + h * 0.06);
  ctx.quadraticCurveTo(x + w * 0.56, y, x + w * 0.66, y + h * 0.03);
  ctx.lineTo(x + w * 0.82, y + h * 0.26);
  ctx.lineTo(x + w * 0.94, y + h * 0.28);
  ctx.lineTo(x + w * 0.94, y + h * 0.16);
  ctx.lineTo(x + w, y + h * 0.16);
  ctx.lineTo(x + w, y + h * 0.24);
  ctx.lineTo(x + w * 0.98, y + h * 0.26);
  ctx.quadraticCurveTo(x + w, y + h * 0.4, x + w * 0.99, y + h * 0.58);
  ctx.lineTo(x + w * 0.86, y + h * 0.62);
  ctx.arc(x + w * 0.79, y + h * 0.62, w * 0.085, 0, Math.PI, true);
  ctx.lineTo(x + w * 0.30, y + h * 0.62);
  ctx.arc(x + w * 0.22, y + h * 0.62, w * 0.085, 0, Math.PI, true);
  ctx.lineTo(x + w * 0.02, y + h * 0.60);
  ctx.closePath(); ctx.fill();
  // Glasshouse.
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.47, y + h * 0.10);
  ctx.quadraticCurveTo(x + w * 0.56, y + h * 0.045, x + w * 0.64, y + h * 0.07);
  ctx.lineTo(x + w * 0.76, y + h * 0.26);
  ctx.lineTo(x + w * 0.36, y + h * 0.28);
  ctx.closePath(); ctx.fill();
  // Wheels and rims.
  for (const wx of [0.22, 0.79]) {
    ctx.fillStyle = '#0a0512';
    ctx.beginPath(); ctx.arc(x + w * wx, y + h * 0.62, w * 0.078, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9b8e8';
    ctx.beginPath(); ctx.arc(x + w * wx, y + h * 0.62, w * 0.034, 0, Math.PI * 2); ctx.fill();
  }
  // Shoulder highlight and headlight.
  ctx.strokeStyle = 'rgba(255,220,240,0.5)';
  ctx.lineWidth = Math.max(1, w * 0.006);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.05, y + h * 0.42);
  ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.30, x + w * 0.95, y + h * 0.34);
  ctx.stroke();
  const hl = ctx.createRadialGradient(x + w * 0.015, y + h * 0.44, 0, x + w * 0.015, y + h * 0.44, w * 0.09);
  hl.addColorStop(0, 'rgba(255,240,200,0.95)'); hl.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = hl;
  ctx.beginPath(); ctx.arc(x + w * 0.015, y + h * 0.44, w * 0.09, 0, Math.PI * 2); ctx.fill();
}

/** A helicopter silhouette with a blurred rotor disc. */
function heli(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.18);
  ctx.quadraticCurveTo(x + s * 0.05, y, x + s * 0.30, y);
  ctx.quadraticCurveTo(x + s * 0.46, y + s * 0.02, x + s * 0.50, y + s * 0.16);
  ctx.lineTo(x + s * 0.92, y + s * 0.10);
  ctx.lineTo(x + s * 0.98, y - s * 0.06);
  ctx.lineTo(x + s * 1.02, y - s * 0.05);
  ctx.lineTo(x + s * 0.97, y + s * 0.14);
  ctx.lineTo(x + s * 0.99, y + s * 0.20);
  ctx.lineTo(x + s * 0.50, y + s * 0.30);
  ctx.quadraticCurveTo(x + s * 0.30, y + s * 0.40, x + s * 0.12, y + s * 0.34);
  ctx.quadraticCurveTo(x, y + s * 0.30, x, y + s * 0.18);
  ctx.closePath(); ctx.fill();
  // Skids.
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.14, y + s * 0.36); ctx.lineTo(x + s * 0.16, y + s * 0.46);
  ctx.moveTo(x + s * 0.40, y + s * 0.36); ctx.lineTo(x + s * 0.40, y + s * 0.46);
  ctx.moveTo(x + s * 0.06, y + s * 0.47); ctx.lineTo(x + s * 0.52, y + s * 0.47);
  ctx.stroke();
  // Rotor mast and blurred disc.
  ctx.fillRect(x + s * 0.28, y - s * 0.08, s * 0.035, s * 0.09);
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(x + s * 0.30, y - s * 0.09, s * 0.62, s * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.8;
  ctx.fillRect(x - s * 0.30, y - s * 0.10, s * 1.2, s * 0.018);
  ctx.globalAlpha = 1;
  // Tail rotor.
  ctx.beginPath(); ctx.arc(x + s * 1.0, y - s * 0.02, s * 0.06, 0, Math.PI * 2); ctx.fill();
}

/** A speedboat with wake, facing right. */
function boat(ctx, x, y, s, hull, rand) {
  // Wake V behind the stern.
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.1, y + s * 0.16);
  ctx.quadraticCurveTo(x - s * 0.5, y + s * 0.30, x - s * 1.1, y + s * 0.62);
  ctx.moveTo(x + s * 0.1, y + s * 0.20);
  ctx.quadraticCurveTo(x - s * 0.4, y + s * 0.42, x - s * 0.8, y + s * 0.85);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 26; i++) {
    const t = rand();
    ctx.beginPath();
    ctx.arc(x - t * s * 1.0, y + s * (0.2 + t * 0.5) + (rand() - 0.5) * s * 0.16, s * 0.02 * (1 - t * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  // Hull.
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.10);
  ctx.lineTo(x + s * 0.86, y - s * 0.06);
  ctx.quadraticCurveTo(x + s, y - s * 0.02, x + s * 0.94, y + s * 0.10);
  ctx.lineTo(x + s * 0.8, y + s * 0.22);
  ctx.lineTo(x + s * 0.06, y + s * 0.24);
  ctx.closePath(); ctx.fill();
  // Windshield and console.
  ctx.fillStyle = '#9be8ff';
  ctx.beginPath();
  ctx.moveTo(x + s * 0.52, y - s * 0.02);
  ctx.lineTo(x + s * 0.66, y - s * 0.16);
  ctx.lineTo(x + s * 0.72, y - s * 0.02);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = hull;
  ctx.fillRect(x + s * 0.3, y - s * 0.06, s * 0.2, s * 0.08);
  // Bow spray.
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.arc(x + s * (0.9 + rand() * 0.18), y + s * (0.06 + rand() * 0.14), s * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A woman's silhouette bust (head, ponytail, shoulders) rising from the bottom. */
function figure(ctx, cx, yBottom, h, color, rim) {
  const w = h * 0.62;
  const headR = h * 0.105;
  const headY = yBottom - h * 0.80;
  const torso = () => {
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.055, yBottom - h * 0.66);
    ctx.quadraticCurveTo(cx - w * 0.30, yBottom - h * 0.60, cx - w * 0.36, yBottom - h * 0.44);
    ctx.quadraticCurveTo(cx - w * 0.42, yBottom - h * 0.26, cx - w * 0.30, yBottom - h * 0.14);
    ctx.quadraticCurveTo(cx - w * 0.24, yBottom - h * 0.05, cx - w * 0.28, yBottom);
    ctx.lineTo(cx + w * 0.28, yBottom);
    ctx.quadraticCurveTo(cx + w * 0.24, yBottom - h * 0.05, cx + w * 0.30, yBottom - h * 0.14);
    ctx.quadraticCurveTo(cx + w * 0.42, yBottom - h * 0.26, cx + w * 0.36, yBottom - h * 0.44);
    ctx.quadraticCurveTo(cx + w * 0.30, yBottom - h * 0.60, cx + w * 0.055, yBottom - h * 0.66);
    ctx.closePath();
  };
  const ponytail = () => {
    ctx.beginPath();
    ctx.moveTo(cx + headR * 0.5, headY - headR * 0.55);
    ctx.quadraticCurveTo(cx + w * 0.36, headY - headR * 0.1, cx + w * 0.31, headY + h * 0.17);
    ctx.quadraticCurveTo(cx + w * 0.27, headY + h * 0.25, cx + w * 0.17, headY + h * 0.21);
    ctx.quadraticCurveTo(cx + w * 0.21, headY + h * 0.06, cx + headR * 0.4, headY + headR * 0.35);
    ctx.closePath();
  };
  const paint = (fill) => {
    ctx.fillStyle = fill;
    ponytail(); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx - w * 0.055, headY + headR * 0.5, w * 0.11, h * 0.12);
    torso(); ctx.fill();
  };
  ctx.save(); ctx.translate(h * 0.010, 0); paint(rim); ctx.restore();
  paint(color);
}

/** Small birds: paired strokes. */
function birds(ctx, x, y, s, color, rand, n) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, s * 0.08);
  for (let i = 0; i < n; i++) {
    const bx = x + (rand() - 0.5) * s * 6, by = y + (rand() - 0.5) * s * 2;
    const r = s * (0.5 + rand() * 0.5);
    ctx.beginPath();
    ctx.moveTo(bx - r, by);
    ctx.quadraticCurveTo(bx - r * 0.4, by - r * 0.5, bx, by);
    ctx.quadraticCurveTo(bx + r * 0.4, by - r * 0.5, bx + r, by);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- the scenes

const INK = '#160726';

function muse(ctx, w, h) {
  const rand = rng(101);
  sky(ctx, w, h, [[0, '#12042e'], [0.35, '#4b1263'], [0.62, '#c22e6e'], [0.78, '#ff6a5e'], [1, '#ffb347']]);
  stars(ctx, w, h, rand, 70, h * 0.34);
  sun(ctx, w * 0.5, h * 0.60, w * 0.30, '#ffe45e', '#ff9a3d', '#ff3d81');
  clouds(ctx, w, h, rand, h * 0.30, 'rgba(255,140,170,0.30)', 4);
  palm(ctx, w * 0.06, h * 1.02, h * 0.46, 0.10, INK, rand);
  palm(ctx, w * 0.96, h * 1.03, h * 0.52, -0.08, INK, rand);
  figure(ctx, w * 0.5, h * 1.02, h * 0.62, '#12041f', 'rgba(255,90,150,0.65)');
}

function sunsetDrive(ctx, w, h) {
  const rand = rng(202);
  sky(ctx, w, h, [[0, '#1a0533'], [0.34, '#5c1560'], [0.55, '#d43a6e'], [0.68, '#ff7a4d'], [1, '#ffc46b']]);
  stars(ctx, w, h, rand, 46, h * 0.26);
  sun(ctx, w * 0.5, h * 0.52, w * 0.22, '#ffe45e', '#ff9a3d', '#ff3d81');
  skyline(ctx, w * 0.56, h * 0.565, w * 0.44, h * 0.075, '#2a0c40', rand);
  water(ctx, 0, h * 0.565, w, h * 0.10, '#7a2a68', '#3b1050', rand, w * 0.5, '#ffb347');
  // Causeway road in perspective.
  ctx.fillStyle = '#1c0b30';
  ctx.beginPath();
  ctx.moveTo(w * 0.30, h * 0.665); ctx.lineTo(w * 0.70, h * 0.665);
  ctx.lineTo(w * 1.12, h); ctx.lineTo(w * -0.12, h);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,140,0.8)';
  ctx.lineWidth = w * 0.012;
  ctx.setLineDash([h * 0.045, h * 0.035]);
  ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.68); ctx.lineTo(w * 0.5, h); ctx.stroke();
  ctx.setLineDash([]);
  // Guardrail posts.
  ctx.fillStyle = '#2a0c40';
  for (let i = 0; i < 5; i++) {
    const t = i / 4, yy = h * (0.68 + t * 0.30);
    const spread = w * (0.21 + t * 0.55);
    ctx.fillRect(w * 0.5 - spread, yy, w * 0.014, h * 0.05 * (0.5 + t));
    ctx.fillRect(w * 0.5 + spread, yy, w * 0.014, h * 0.05 * (0.5 + t));
  }
  palm(ctx, w * 0.10, h * 0.78, h * 0.40, 0.12, INK, rand);
  palm(ctx, w * 0.92, h * 0.80, h * 0.44, -0.10, INK, rand);
  car(ctx, w * 0.16, h * 0.74, w * 0.68, '#12041f', 'rgba(155,232,255,0.35)', 'rgba(255,61,214,0.55)');
}

function neonStreet(ctx, w, h) {
  const rand = rng(303);
  sky(ctx, w, h, [[0, '#04010f'], [0.5, '#1c0640'], [1, '#3d0f5c']]);
  stars(ctx, w, h, rand, 60, h * 0.3);
  // Moon.
  const mg = ctx.createRadialGradient(w * 0.78, h * 0.12, 0, w * 0.78, h * 0.12, w * 0.14);
  mg.addColorStop(0, 'rgba(190,240,255,0.9)'); mg.addColorStop(0.25, 'rgba(150,220,255,0.25)'); mg.addColorStop(1, 'rgba(150,220,255,0)');
  ctx.fillStyle = mg;
  ctx.beginPath(); ctx.arc(w * 0.78, h * 0.12, w * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#dff6ff';
  ctx.beginPath(); ctx.arc(w * 0.78, h * 0.12, w * 0.045, 0, Math.PI * 2); ctx.fill();
  // Deco facades left and right, converging on the street.
  const facade = (x0, x1, neon, flip) => {
    const fg = ctx.createLinearGradient(0, h * 0.22, 0, h * 0.9);
    fg.addColorStop(0, '#22094a'); fg.addColorStop(1, '#12042c');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(x0, h * 0.22); ctx.lineTo(x1, h * 0.34); ctx.lineTo(x1, h * 0.78); ctx.lineTo(x0, h * 0.9);
    ctx.closePath(); ctx.fill();
    // Neon tubes along the facade edges.
    ctx.strokeStyle = neon; ctx.lineWidth = w * 0.008;
    ctx.shadowColor = neon; ctx.shadowBlur = w * 0.03;
    for (let i = 0; i < 4; i++) {
      const t = 0.36 + i * 0.11;
      ctx.beginPath();
      ctx.moveTo(x0 + (x1 - x0) * 0.1, h * t);
      ctx.lineTo(x1 - (x1 - x0) * 0.1, h * (t + 0.012));
      ctx.stroke();
    }
    // Vertical neon edge on the street-facing side, plus a glowing sign block.
    ctx.beginPath();
    ctx.moveTo(x1, h * 0.34); ctx.lineTo(x1, h * 0.78);
    ctx.stroke();
    const sx = x0 + (x1 - x0) * (flip ? 0.25 : 0.45);
    ctx.fillStyle = neon;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(sx, h * 0.44, (x1 - x0) * 0.3, h * 0.05);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    // Lit windows.
    for (let i = 0; i < 26; i++) {
      const t = rand();
      const wx = x0 + (x1 - x0) * (0.15 + t * 0.7);
      const wy = h * (0.38 + rand() * 0.4);
      ctx.globalAlpha = 0.4 + rand() * 0.5;
      ctx.fillStyle = rand() < 0.5 ? '#ffd98a' : neon;
      ctx.fillRect(wx, wy, w * 0.016, h * 0.014);
    }
    ctx.globalAlpha = 1;
  };
  facade(0, w * 0.30, '#ff3df0', false);
  facade(w, w * 0.70, '#35e0ff', true);
  // Wet street with neon reflections.
  const g = ctx.createLinearGradient(0, h * 0.72, 0, h);
  g.addColorStop(0, '#1a0836'); g.addColorStop(1, '#0a0218');
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  const refl = (x, color) => {
    const rg = ctx.createLinearGradient(0, h * 0.74, 0, h);
    rg.addColorStop(0, color); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x - w * 0.03, h * 0.74, w * 0.06, h * 0.26);
    ctx.globalAlpha = 1;
  };
  refl(w * 0.14, '#ff3df0'); refl(w * 0.86, '#35e0ff'); refl(w * 0.5, '#ffb347');
  palm(ctx, w * 0.36, h * 0.80, h * 0.30, 0.06, '#08011a', rand);
  palm(ctx, w * 0.64, h * 0.81, h * 0.32, -0.05, '#08011a', rand);
  // A parked car silhouette mid-street.
  car(ctx, w * 0.30, h * 0.78, w * 0.40, '#08011a', 'rgba(53,224,255,0.3)', 'rgba(53,224,255,0.5)');
}

function heliBeach(ctx, w, h) {
  const rand = rng(404);
  sky(ctx, w, h, [[0, '#2a0a4a'], [0.35, '#8a1e63'], [0.6, '#ff5e62'], [0.75, '#ffb347'], [1, '#ffd98a']]);
  clouds(ctx, w, h, rand, h * 0.26, 'rgba(255,170,120,0.35)', 5);
  sun(ctx, w * 0.24, h * 0.60, w * 0.13, '#fff0a0', '#ffb347', '#ff5e62');
  skyline(ctx, 0, h * 0.62, w * 0.34, h * 0.10, '#3a1050', rand);
  water(ctx, 0, h * 0.62, w, h * 0.20, '#b0447a', '#4b1263', rand, w * 0.24, '#ffd98a');
  // Beach strip.
  ctx.fillStyle = '#2a0c40';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.86);
  ctx.quadraticCurveTo(w * 0.5, h * 0.80, w, h * 0.88);
  ctx.lineTo(w, h); ctx.lineTo(0, h);
  ctx.closePath(); ctx.fill();
  palm(ctx, w * 0.80, h * 0.95, h * 0.34, -0.10, INK, rand);
  palm(ctx, w * 0.93, h * 0.98, h * 0.40, -0.04, INK, rand);
  palm(ctx, w * 0.06, h * 0.97, h * 0.30, 0.10, INK, rand);
  heli(ctx, w * 0.46, h * 0.20, w * 0.24, '#1c0830');
  birds(ctx, w * 0.7, h * 0.3, w * 0.012, '#2a0c40', rand, 5);
}

function oceanBoat(ctx, w, h) {
  const rand = rng(505);
  sky(ctx, w, h, [[0, '#3d1060'], [0.3, '#b03a6e'], [0.42, '#ff8a4d'], [0.5, '#ffc46b'], [1, '#ffe0a0']]);
  clouds(ctx, w, h, rand, h * 0.2, 'rgba(255,190,140,0.4)', 5);
  sun(ctx, w * 0.72, h * 0.34, w * 0.10, '#fff0a0', '#ffc46b', '#ff8a4d');
  skyline(ctx, 0, h * 0.46, w * 0.5, h * 0.07, '#4b1263', rand);
  palm(ctx, w * 0.52, h * 0.47, h * 0.10, 0.08, '#4b1263', rand);
  palm(ctx, w * 0.58, h * 0.47, h * 0.12, -0.06, '#4b1263', rand);
  water(ctx, 0, h * 0.46, w, h * 0.54, '#2aa8c9', '#0a4a7a', rand, w * 0.72, '#ffd98a');
  boat(ctx, w * 0.46, h * 0.66, w * 0.20, '#f5f2ea', rand);
}

function skylineDusk(ctx, w, h) {
  const rand = rng(606);
  sky(ctx, w, h, [[0, '#0d0226'], [0.35, '#3d1060'], [0.6, '#a02a68'], [0.78, '#ff6a5e'], [1, '#ffb347']]);
  stars(ctx, w, h, rand, 80, h * 0.35);
  clouds(ctx, w, h, rand, h * 0.42, 'rgba(255,140,120,0.3)', 4);
  skyline(ctx, 0, h * 0.66, w, h * 0.24, '#1c0836', rand);
  water(ctx, 0, h * 0.66, w, h * 0.34, '#5c1a68', '#160430', rand, w * 0.5, '#ff9a3d');
  // Framing palm fronds from the top corners.
  palm(ctx, w * -0.02, h * 0.30, h * 0.34, 0.30, '#0d0220', rand);
  palm(ctx, w * 1.02, h * 0.28, h * 0.32, -0.30, '#0d0220', rand);
}

function palmSunset(ctx, w, h) {
  const rand = rng(707);
  sky(ctx, w, h, [[0, '#1a0533'], [0.3, '#6e1a6e'], [0.55, '#e84a6e'], [0.75, '#ff9a4d'], [1, '#ffd98a']]);
  stars(ctx, w, h, rand, 40, h * 0.22);
  sun(ctx, w * 0.5, h * 0.52, w * 0.34, '#ffe45e', '#ff9a3d', '#ff3d81');
  birds(ctx, w * 0.3, h * 0.24, w * 0.014, '#2a0c40', rand, 4);
  palm(ctx, w * 0.16, h * 1.04, h * 0.58, 0.10, INK, rand);
  palm(ctx, w * 0.52, h * 1.06, h * 0.44, -0.04, INK, rand);
  palm(ctx, w * 0.86, h * 1.05, h * 0.64, -0.12, INK, rand);
}

/** The built-in scenes, in the order the app offers them. */
export const SCENES = [
  { id: 'muse', name: 'The Muse', aspect: 'portrait', draw: muse },
  { id: 'sunset-drive', name: 'Sunset Drive', aspect: 'portrait', draw: sunsetDrive },
  { id: 'neon-street', name: 'Neon Street', aspect: 'portrait', draw: neonStreet },
  { id: 'heli-beach', name: 'Chopper Beach', aspect: 'landscape', draw: heliBeach },
  { id: 'ocean-boat', name: 'Cigarette Boat', aspect: 'landscape', draw: oceanBoat },
  { id: 'skyline-dusk', name: 'Skyline Dusk', aspect: 'landscape', draw: skylineDusk },
  { id: 'palm-sunset', name: 'Palm Sunset', aspect: 'portrait', draw: palmSunset },
];

/** Paint a scene onto a context at the given size. */
export function drawScene(ctx, id, w, h) {
  const scene = SCENES.find((s) => s.id === id);
  if (!scene) return;
  ctx.save();
  scene.draw(ctx, w, h);
  ctx.restore();
}

/** Render a scene to its own canvas (used for panel art and sample export). */
export function sceneCanvas(id, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  drawScene(c.getContext('2d'), id, w, h);
  return c;
}