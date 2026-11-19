// Seven original procedural Vice City scenes, painted on canvas with a seeded
// generator so every load produces the same pixels. They serve as the studio's
// sample photos; nothing here is borrowed from any game's artwork.

/** xorshift32: small, fast, fully deterministic for a given seed. */
export function seededRandom(seed) {
  let s = seed >>> 0 || 0x9e3779b9;
  return function next() {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function seedOf(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Vertical gradient sky from a list of [position, color] stops. */
function paintSky(ctx, w, h, stops, bottom = h) {
  const g = ctx.createLinearGradient(0, 0, 0, bottom);
  for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, bottom);
}

/** The striped retro sun: a warm disc with horizontal slits near its base. */
function paintSun(ctx, x, y, r, top, bottom) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 6; i++) {
    const sy = y + r * (0.12 + i * 0.15);
    ctx.fillRect(x - r, sy, r * 2, r * (0.02 + i * 0.016));
  }
  ctx.restore();
}

/** A palm silhouette: curved trunk plus a fan of drooping fronds. */
export function paintPalm(ctx, x, y, height, lean, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const topX = x + height * lean;
  const topY = y - height;
  ctx.lineCap = 'round';
  ctx.lineWidth = height * 0.05;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + height * lean * 0.3, y - height * 0.55, topX, topY);
  ctx.stroke();
  const fronds = 8;
  for (let i = 0; i < fronds; i++) {
    const t = i / (fronds - 1);
    const ang = ((-170 + 160 * t) * Math.PI) / 180;
    const len = height * (0.44 + 0.12 * Math.sin(t * Math.PI));
    const ex = topX + Math.cos(ang) * len;
    const ey = topY + Math.sin(ang) * len * 0.6 + len * 0.34;
    const cx = topX + Math.cos(ang) * len * 0.45;
    const cy = topY + Math.sin(ang) * len * 0.75 - len * 0.12;
    ctx.lineWidth = height * 0.04;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
    // leaflets hanging along the frond
    ctx.lineWidth = height * 0.02;
    for (let k = 1; k <= 7; k++) {
      const u = k / 8;
      const px = (1 - u) * (1 - u) * topX + 2 * (1 - u) * u * cx + u * u * ex;
      const py = (1 - u) * (1 - u) * topY + 2 * (1 - u) * u * cy + u * u * ey;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(ang) * len * 0.05, py + len * 0.11);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function paintStars(ctx, rand, w, h, count) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.globalAlpha = 0.25 + rand() * 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, rand() < 0.85 ? 2 : 3, 2);
  }
  ctx.restore();
}

function paintWater(ctx, rand, x, y, w, h, base, glint) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, base[0]);
  g.addColorStop(1, base[1]);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  for (let i = 0; i < 90; i++) {
    const gy = y + rand() * h;
    const gx = x + rand() * w;
    const gw = 8 + rand() * 60;
    ctx.globalAlpha = 0.06 + rand() * 0.2;
    ctx.fillStyle = glint;
    ctx.fillRect(gx, gy, gw, 2 + rand() * 2);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the scenes

function sunsetDrive(ctx, w, h, rand) {
  const horizon = h * 0.5;
  paintSky(ctx, w, h, [[0, '#241454'], [0.45, '#b0438f'], [0.75, '#ff7e6b'], [1, '#ffd36e']], horizon);
  paintStars(ctx, rand, w, horizon * 0.5, 40);
  paintSun(ctx, w * 0.5, horizon, w * 0.24, '#ffe95e', '#ff4f9a');
  ctx.fillStyle = '#1c0f38';
  ctx.fillRect(0, horizon, w, h - horizon);
  // road toward the vanishing point
  ctx.fillStyle = '#2a1850';
  ctx.beginPath();
  ctx.moveTo(w * 0.5 - w * 0.035, horizon);
  ctx.lineTo(w * 0.5 + w * 0.035, horizon);
  ctx.lineTo(w * 0.94, h);
  ctx.lineTo(w * 0.06, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd75e';
  for (let i = 0; i < 9; i++) {
    const t0 = i / 9, t1 = (i + 0.45) / 9;
    const y0 = horizon + (h - horizon) * t0 * t0;
    const y1 = horizon + (h - horizon) * t1 * t1;
    const ww = 3 + 16 * t1;
    ctx.fillRect(w * 0.5 - ww / 2, y0, ww, Math.max(3, y1 - y0));
  }
  paintPalm(ctx, w * 0.1, horizon + h * 0.06, h * 0.3, 0.12, '#120826');
  paintPalm(ctx, w * 0.9, horizon + h * 0.08, h * 0.34, -0.1, '#120826');
  paintPalm(ctx, w * 0.2, horizon + h * 0.02, h * 0.18, 0.08, '#1a0d33');
  paintPalm(ctx, w * 0.82, horizon + h * 0.03, h * 0.2, -0.06, '#1a0d33');
}

function skylineDusk(ctx, w, h, rand) {
  const waterY = h * 0.74;
  paintSky(ctx, w, h, [[0, '#1b1250'], [0.5, '#7a3d9e'], [0.8, '#ff7b7b'], [1, '#ffc46e']], waterY);
  paintSun(ctx, w * 0.68, waterY * 0.92, w * 0.09, '#fff0a8', '#ff8f5e');
  let x = -10;
  while (x < w) {
    const bw = w * (0.05 + rand() * 0.08);
    const bh = h * (0.16 + rand() * 0.34);
    const by = waterY - bh;
    ctx.fillStyle = rand() < 0.5 ? '#221244' : '#2c1854';
    ctx.fillRect(x, by, bw, bh);
    // lit windows
    const cols = Math.max(2, Math.floor(bw / 16));
    const rows = Math.max(3, Math.floor(bh / 22));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rand() < 0.42) {
          ctx.fillStyle = rand() < 0.7 ? 'rgba(255,214,120,0.9)' : 'rgba(120,235,255,0.85)';
          ctx.fillRect(x + 5 + c * (bw - 10) / cols, by + 8 + r * (bh - 14) / rows, 4, 6);
        }
      }
    }
    x += bw + w * 0.008;
  }
  paintWater(ctx, rand, 0, waterY, w, h - waterY, ['#3a1c66', '#120a2e'], '#ffb37e');
}

function oceanBoat(ctx, w, h, rand) {
  const horizon = h * 0.52;
  paintSky(ctx, w, h, [[0, '#3c1a6e'], [0.55, '#e0568c'], [1, '#ffcf7d']], horizon);
  paintSun(ctx, w * 0.36, horizon * 0.98, w * 0.11, '#fff3b0', '#ff9a5e');
  paintWater(ctx, rand, 0, horizon, w, h - horizon, ['#c65a8f', '#2a1458'], '#ffe1a8');
  // sun glint column
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const gy = horizon + rand() * (h - horizon);
    const spread = 20 + (gy - horizon) * 0.35;
    ctx.globalAlpha = 0.25 + rand() * 0.4;
    ctx.fillStyle = '#ffe9b8';
    ctx.fillRect(w * 0.36 - spread / 2 + rand() * spread, gy, 10 + rand() * 30, 3);
  }
  ctx.restore();
  // boat silhouette
  const bx = w * 0.66, by = horizon + (h - horizon) * 0.3;
  ctx.fillStyle = '#1c0d38';
  ctx.beginPath();
  ctx.moveTo(bx - w * 0.11, by);
  ctx.lineTo(bx + w * 0.11, by);
  ctx.lineTo(bx + w * 0.07, by + h * 0.045);
  ctx.lineTo(bx - w * 0.08, by + h * 0.045);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(bx - w * 0.02, by - h * 0.05, w * 0.055, h * 0.05);
  ctx.fillRect(bx + w * 0.005, by - h * 0.11, w * 0.006, h * 0.06);
  // distant clouds
  ctx.save();
  ctx.fillStyle = 'rgba(255,190,150,0.35)';
  for (let i = 0; i < 5; i++) {
    const cx = rand() * w, cy = rand() * horizon * 0.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * (0.06 + rand() * 0.08), h * 0.012, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function neonStreet(ctx, w, h, rand) {
  paintSky(ctx, w, h, [[0, '#050514'], [0.6, '#141034'], [1, '#241645']]);
  paintStars(ctx, rand, w, h * 0.3, 50);
  const streetY = h * 0.62;
  // buildings on both sides, lit windows so they read against the night sky
  for (const side of [0, 1]) {
    let y = h * 0.08;
    while (y < streetY) {
      const bw = w * (0.16 + rand() * 0.14);
      const bh = h * (0.08 + rand() * 0.12);
      const bx = side === 0 ? 0 : w - bw;
      ctx.fillStyle = side === 0 ? '#181243' : '#1e164c';
      ctx.fillRect(bx, y, bw, bh);
      ctx.fillStyle = 'rgba(255,214,120,0.75)';
      const cols = Math.max(2, Math.floor(bw / 26));
      const rows = Math.max(2, Math.floor(bh / 30));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rand() < 0.3) {
            ctx.fillRect(bx + 8 + c * (bw - 16) / cols, y + 8 + r * (bh - 16) / rows, 5, 7);
          }
        }
      }
      y += bh + h * 0.015;
    }
  }
  // neon signs
  const signs = [
    { x: w * 0.06, y: h * 0.18, sw: w * 0.2, sh: h * 0.05, c: '#ff3fd8' },
    { x: w * 0.72, y: h * 0.14, sw: w * 0.22, sh: h * 0.06, c: '#23d9ff' },
    { x: w * 0.1, y: h * 0.38, sw: w * 0.16, sh: h * 0.04, c: '#ffb02e' },
    { x: w * 0.7, y: h * 0.42, sw: w * 0.2, sh: h * 0.05, c: '#7b5bff' },
  ];
  for (const s of signs) {
    ctx.save();
    ctx.shadowColor = s.c;
    ctx.shadowBlur = 30;
    ctx.strokeStyle = s.c;
    ctx.lineWidth = 5;
    ctx.strokeRect(s.x, s.y, s.sw, s.sh);
    ctx.fillStyle = s.c;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(s.x + s.sw * 0.12, s.y + s.sh * (0.25 + i * 0.25), s.sw * (0.4 + rand() * 0.35), 3);
    }
    ctx.restore();
  }
  // wet street with reflections
  ctx.fillStyle = '#0a0718';
  ctx.fillRect(0, streetY, w, h - streetY);
  for (const s of signs) {
    const g = ctx.createLinearGradient(0, streetY, 0, h);
    g.addColorStop(0, s.c + '77');
    g.addColorStop(1, s.c + '00');
    ctx.fillStyle = g;
    ctx.fillRect(s.x + s.sw * 0.1, streetY, s.sw * 0.8, h - streetY);
  }
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 24; i++) {
    ctx.fillRect(rand() * w, streetY + rand() * (h - streetY), 30 + rand() * 80, 2);
  }
  ctx.restore();
}

function heliBeach(ctx, w, h, rand) {
  const seaY = h * 0.55, sandY = h * 0.78;
  paintSky(ctx, w, h, [[0, '#2a1660'], [0.55, '#d94f96'], [1, '#ffc46e']], seaY);
  paintSun(ctx, w * 0.76, seaY * 0.9, w * 0.08, '#fff0a8', '#ff7e5e');
  paintWater(ctx, rand, 0, seaY, w, sandY - seaY, ['#b04f92', '#4a2270'], '#ffd9a0');
  const g = ctx.createLinearGradient(0, sandY, 0, h);
  g.addColorStop(0, '#e8a86e');
  g.addColorStop(1, '#b06a4e');
  ctx.fillStyle = g;
  ctx.fillRect(0, sandY, w, h - sandY);
  // helicopter silhouette
  const hx = w * 0.34, hy = h * 0.24;
  ctx.save();
  ctx.fillStyle = '#180b30';
  ctx.strokeStyle = '#180b30';
  ctx.beginPath();
  ctx.ellipse(hx, hy, w * 0.06, h * 0.032, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = h * 0.014;
  ctx.beginPath();
  ctx.moveTo(hx + w * 0.05, hy - h * 0.005);
  ctx.lineTo(hx + w * 0.13, hy - h * 0.02);
  ctx.stroke();
  ctx.fillRect(hx + w * 0.12, hy - h * 0.045, w * 0.008, h * 0.035);
  ctx.lineWidth = h * 0.008;
  ctx.beginPath();
  ctx.moveTo(hx - w * 0.09, hy - h * 0.045);
  ctx.lineTo(hx + w * 0.09, hy - h * 0.045);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx, hy - h * 0.032);
  ctx.lineTo(hx, hy - h * 0.045);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx - w * 0.04, hy + h * 0.045);
  ctx.lineTo(hx + w * 0.04, hy + h * 0.045);
  ctx.stroke();
  ctx.restore();
  paintPalm(ctx, w * 0.06, h * 0.98, h * 0.42, 0.16, '#200e3c');
  paintPalm(ctx, w * 0.97, h * 0.99, h * 0.36, -0.14, '#200e3c');
}

function palmCourt(ctx, w, h, rand) {
  const horizon = h * 0.44;
  paintSky(ctx, w, h, [[0, '#31165e'], [0.55, '#e0518f'], [1, '#ffcf6e']], horizon);
  paintSun(ctx, w * 0.5, horizon * 0.96, w * 0.2, '#ffe95e', '#ff5f8f');
  const g = ctx.createLinearGradient(0, horizon, 0, h);
  g.addColorStop(0, '#d97a5e');
  g.addColorStop(1, '#8a3a5e');
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon, w, h - horizon);
  // court lines in perspective
  ctx.strokeStyle = 'rgba(255,244,230,0.85)';
  ctx.lineWidth = 4;
  ctx.strokeRect(w * 0.14, horizon + (h - horizon) * 0.18, w * 0.72, (h - horizon) * 0.7);
  ctx.beginPath();
  ctx.moveTo(w * 0.14, horizon + (h - horizon) * 0.53);
  ctx.lineTo(w * 0.86, horizon + (h - horizon) * 0.53);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(w * 0.5, horizon + (h - horizon) * 0.53, w * 0.12, (h - horizon) * 0.09, 0, 0, Math.PI * 2);
  ctx.stroke();
  // hoop silhouette
  ctx.fillStyle = '#200e3c';
  ctx.fillRect(w * 0.485, horizon - h * 0.16, w * 0.03, h * 0.18);
  ctx.fillRect(w * 0.42, horizon - h * 0.18, w * 0.16, h * 0.05);
  ctx.strokeStyle = '#200e3c';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, horizon - h * 0.115, w * 0.045, h * 0.012, 0, 0, Math.PI * 2);
  ctx.stroke();
  paintPalm(ctx, w * 0.04, horizon + h * 0.05, h * 0.3, 0.1, '#1c0c36');
  paintPalm(ctx, w * 0.96, horizon + h * 0.04, h * 0.32, -0.12, '#1c0c36');
  paintStars(ctx, rand, w, horizon * 0.35, 26);
}

function midnightPort(ctx, w, h, rand) {
  const waterY = h * 0.7;
  paintSky(ctx, w, h, [[0, '#04041a'], [0.7, '#0e1440'], [1, '#1c2a5e']], waterY);
  paintStars(ctx, rand, w, waterY * 0.6, 70);
  ctx.save();
  ctx.fillStyle = '#e8ecff';
  ctx.shadowColor = '#bcd0ff';
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.16, w * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // container stacks
  const colors = ['#8a3a5e', '#3a6a8a', '#7a5a3a', '#4a3a7a'];
  let x = w * 0.02;
  while (x < w * 0.55) {
    const cw = w * 0.07;
    const stack = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < stack; i++) {
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      ctx.fillRect(x, waterY - (i + 1) * h * 0.045, cw, h * 0.042);
    }
    x += cw + w * 0.006;
  }
  // cranes
  ctx.strokeStyle = '#0a0a22';
  ctx.fillStyle = '#0a0a22';
  ctx.lineWidth = w * 0.008;
  for (const cx of [w * 0.62, w * 0.78]) {
    ctx.beginPath();
    ctx.moveTo(cx, waterY);
    ctx.lineTo(cx, h * 0.2);
    ctx.lineTo(cx + w * 0.14, h * 0.26);
    ctx.moveTo(cx, h * 0.28);
    ctx.lineTo(cx - w * 0.05, waterY);
    ctx.stroke();
    ctx.fillRect(cx - w * 0.012, h * 0.18, w * 0.024, h * 0.05);
  }
  // ship hull
  ctx.fillStyle = '#0c0c26';
  ctx.beginPath();
  ctx.moveTo(w * 0.56, waterY - h * 0.03);
  ctx.lineTo(w * 0.98, waterY - h * 0.03);
  ctx.lineTo(w * 0.94, waterY + h * 0.02);
  ctx.lineTo(w * 0.6, waterY + h * 0.02);
  ctx.closePath();
  ctx.fill();
  paintWater(ctx, rand, 0, waterY, w, h - waterY, ['#101a44', '#050514'], '#8fd0ff');
}

export const SCENES = [
  { id: 'sunset-drive', name: 'Sunset Drive', w: 960, h: 1280, paint: sunsetDrive },
  { id: 'skyline-dusk', name: 'Skyline Dusk', w: 1280, h: 960, paint: skylineDusk },
  { id: 'ocean-boat', name: 'Ocean Boat', w: 1280, h: 960, paint: oceanBoat },
  { id: 'neon-street', name: 'Neon Street', w: 960, h: 1280, paint: neonStreet },
  { id: 'heli-beach', name: 'Heli Beach', w: 1280, h: 960, paint: heliBeach },
  { id: 'palm-court', name: 'Palm Court', w: 960, h: 1280, paint: palmCourt },
  { id: 'midnight-port', name: 'Midnight Port', w: 1280, h: 960, paint: midnightPort },
];

/** Paint one scene to a fresh canvas at its native size. */
export function paintScene(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = scene.w;
  canvas.height = scene.h;
  const ctx = canvas.getContext('2d');
  scene.paint(ctx, scene.w, scene.h, seededRandom(seedOf(scene.id)));
  return canvas;
}