// Deterministic film grain: one seeded noise tile per export size, cached, and
// composited over the finished poster with 'overlay' at a low alpha.

import { seededRandom } from './scenes.js';

const tileCache = new Map();

export function grainTile(w, h) {
  const key = `${w}x${h}`;
  const cached = tileCache.get(key);
  if (cached) return cached;
  // half-resolution noise, upscaled smoothly: reads as film grain and keeps
  // exported PNGs small
  const gw = Math.ceil(w / 2);
  const gh = Math.ceil(h / 2);
  const noise = document.createElement('canvas');
  noise.width = gw;
  noise.height = gh;
  const nctx = noise.getContext('2d');
  const image = nctx.createImageData(gw, gh);
  const data = image.data;
  const rand = seededRandom(0x5eed6a17);
  for (let i = 0; i < data.length; i += 4) {
    // values centered on 128: neutral under 'overlay', the spread is the grain
    const v = 96 + Math.floor(rand() * 64);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  nctx.putImageData(image, 0, 0);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(noise, 0, 0, w, h);
  tileCache.set(key, canvas);
  return canvas;
}