// main.js — the Vice Cover editor: state, the photo/scene library, panel
// crop controls (drag to move, wheel or slider to zoom), caption and look
// controls, live preview and PNG export in the three common post sizes.

import { SCENES, sceneCanvas } from './scenes.js';
import { LAYOUTS, panelShapes, panelBounds, hitPanel } from './layouts.js';
import { GRADES } from './grades.js';
import { CAPTION_STYLES } from './lettering.js';
import { renderCover } from './render.js';

const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  landscape: { w: 1920, h: 1080, label: '1920 × 1080' },
};

const SAMPLE_FILES = [
  ['muse', 'samples/muse.jpg', 'The Muse'],
  ['sunset-drive', 'samples/sunset-drive.jpg', 'Sunset Drive'],
  ['neon-street', 'samples/neon-street.jpg', 'Neon Street'],
  ['heli-beach', 'samples/heli-beach.jpg', 'Chopper Beach'],
  ['ocean-boat', 'samples/ocean-boat.jpg', 'Cigarette Boat'],
  ['skyline-dusk', 'samples/skyline-dusk.jpg', 'Skyline Dusk'],
];

const state = {
  size: 'portrait',
  layout: 'grid',
  grade: 'sunset',
  border: 'white',
  caption: { title: 'VICE CITY', subtitle: 'SUNSET STRIP', style: 'sunset', badge: true, palms: true },
  panels: Array.from({ length: 6 }, () => ({ src: null, zoom: 1, ox: 0, oy: 0 })),
  selected: 0,
};

/** id -> { name, kind, canvas?|img?, thumb } for every photo and scene. */
const images = new Map();
let photoSeq = 0;

const $ = (sel) => document.querySelector(sel);
const preview = $('#preview');
const stage = $('#stage');
const pctx = preview.getContext('2d');
let previewScale = 1;

function resolveImage(id) {
  const entry = images.get(id);
  return entry ? entry.canvas ?? entry.img ?? null : null;
}

function coverSize() {
  return SIZES[state.size];
}

// ---------------------------------------------------------------- library

function thumbOf(source, w, h) {
  const max = 200;
  const scale = Math.min(max / w, max / h);
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

function registerImage(id, name, kind, source, w, h) {
  images.set(id, { name, kind, canvas: source instanceof HTMLCanvasElement ? source : null, img: source instanceof HTMLImageElement ? source : null, thumb: thumbOf(source, w, h) });
}

function loadSamples() {
  return Promise.all(SAMPLE_FILES.map(([id, path, name]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { registerImage(id, `${name} · sample`, 'photo', img, img.width, img.height); resolve(); };
    img.onerror = () => resolve();
    img.src = path;
  })));
}

function registerScenes() {
  for (const scene of SCENES) {
    const w = scene.aspect === 'portrait' ? 1080 : 1600;
    const h = scene.aspect === 'portrait' ? 1350 : 900;
    const c = sceneCanvas(scene.id, w, h);
    registerImage(`scene:${scene.id}`, `${scene.name} · scene`, 'scene', c, w, h);
  }
}

function addPhotoFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const id = `photo:${++photoSeq}`;
      registerImage(id, file.name, 'photo', img, img.width, img.height);
      URL.revokeObjectURL(url);
      const panel = state.panels[state.selected];
      if (panel) { panel.src = id; panel.zoom = 1; panel.ox = 0; panel.oy = 0; }
      buildThumbs();
      syncPanelControls();
      render();
      toast(`Added ${file.name} to panel ${state.selected + 1}`);
    };
    img.src = url;
  }
}

// ---------------------------------------------------------------- sidebar UI

function buildThumbs() {
  const strip = $('#thumbs');
  strip.innerHTML = '';
  for (const [id, entry] of images) {
    const btn = document.createElement('button');
    btn.className = 'thumb';
    btn.title = `${entry.name} — click to fill panel ${state.selected + 1}`;
    const img = document.createElement('img');
    img.src = entry.thumb;
    img.alt = entry.name;
    const tag = document.createElement('span');
    tag.className = 'thumb-tag';
    tag.textContent = entry.kind === 'scene' ? 'scene' : 'photo';
    btn.append(img, tag);
    btn.addEventListener('click', () => {
      const panel = state.panels[state.selected];
      panel.src = id; panel.zoom = 1; panel.ox = 0; panel.oy = 0;
      syncPanelControls();
      render();
    });
    strip.appendChild(btn);
  }
}

function buildLayoutButtons() {
  const wrap = $('#layouts');
  wrap.innerHTML = '';
  for (const layout of LAYOUTS) {
    const btn = document.createElement('button');
    btn.className = 'layout-btn' + (state.layout === layout.id ? ' active' : '');
    btn.innerHTML = `${layoutIcon(layout.id)}<span>${layout.name}</span>`;
    btn.addEventListener('click', () => {
      state.layout = layout.id;
      state.selected = Math.min(state.selected, layout.panels - 1);
      buildLayoutButtons();
      buildPanelChips();
      syncPanelControls();
      render();
    });
    wrap.appendChild(btn);
  }
}

function layoutIcon(id) {
  const rects = {
    grid: '<rect x="1" y="1" width="10" height="6"/><rect x="13" y="1" width="10" height="6"/><rect x="1" y="9" width="10" height="6"/><rect x="13" y="9" width="10" height="6"/><rect x="1" y="17" width="10" height="6"/><rect x="13" y="17" width="10" height="6"/>',
    hero: '<rect x="1" y="1" width="22" height="13"/><rect x="1" y="16" width="6.5" height="7"/><rect x="9.25" y="16" width="6.5" height="7"/><rect x="17.5" y="16" width="6.5" height="7"/>',
    mosaic: '<rect x="1" y="1" width="12" height="22"/><rect x="15" y="1" width="8" height="10"/><rect x="15" y="13" width="8" height="10"/>',
    duo: '<polygon points="1,1 15,1 9,23 1,23"/><polygon points="17,1 23,1 23,23 11,23"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${rects[id]}</svg>`;
}

function buildGrades() {
  const wrap = $('#grades');
  wrap.innerHTML = '';
  for (const grade of GRADES) {
    const btn = document.createElement('button');
    btn.className = 'grade-btn' + (state.grade === grade.id ? ' active' : '');
    btn.innerHTML = `<i style="background:${grade.swatch}"></i><span>${grade.name}</span>`;
    btn.addEventListener('click', () => {
      state.grade = grade.id;
      buildGrades();
      render();
    });
    wrap.appendChild(btn);
  }
}

function buildPanelChips() {
  const wrap = $('#panel-chips');
  wrap.innerHTML = '';
  const count = LAYOUTS.find((l) => l.id === state.layout).panels;
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.className = 'chip' + (state.selected === i ? ' active' : '');
    btn.textContent = i + 1;
    btn.addEventListener('click', () => selectPanel(i));
    wrap.appendChild(btn);
  }
}

function selectPanel(i) {
  state.selected = i;
  buildPanelChips();
  syncPanelControls();
  render();
}

function syncPanelControls() {
  const panel = state.panels[state.selected];
  const entry = panel?.src ? images.get(panel.src) : null;
  $('#panel-name').textContent = `Panel ${state.selected + 1} · ${entry ? entry.name : 'empty'}`;
  $('#zoom').value = panel ? panel.zoom : 1;
}

function buildStyleOptions() {
  const sel = $('#caption-style');
  sel.innerHTML = '';
  for (const style of CAPTION_STYLES) {
    const opt = document.createElement('option');
    opt.value = style.id;
    opt.textContent = style.name;
    sel.appendChild(opt);
  }
  sel.value = state.caption.style;
}

// ---------------------------------------------------------------- preview

function render() {
  const { w, h } = coverSize();
  const rect = stage.getBoundingClientRect();
  const pad = 28;
  const scale = Math.min((rect.width - pad) / w, (rect.height - pad) / h);
  previewScale = scale;
  const dpr = window.devicePixelRatio || 1;
  preview.style.width = `${w * scale}px`;
  preview.style.height = `${h * scale}px`;
  preview.width = Math.round(w * scale * dpr);
  preview.height = Math.round(h * scale * dpr);
  pctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  renderCover(pctx, w, h, state, resolveImage, { selected: state.selected });
}

function toCover(e) {
  const rect = preview.getBoundingClientRect();
  return { x: (e.clientX - rect.left) / previewScale, y: (e.clientY - rect.top) / previewScale };
}

let drag = null;

preview.addEventListener('pointerdown', (e) => {
  const { w, h } = coverSize();
  const p = toCover(e);
  const idx = hitPanel(panelShapes(state.layout, w, h), p.x, p.y);
  if (idx < 0) return;
  if (idx !== state.selected) selectPanel(idx);
  const panel = state.panels[idx];
  drag = { idx, x: e.clientX, y: e.clientY, ox: panel.ox, oy: panel.oy };
  preview.setPointerCapture(e.pointerId);
});

preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { w, h } = coverSize();
  const panel = state.panels[drag.idx];
  const img = resolveImage(panel.src);
  if (!img) return;
  const bounds = panelBounds(panelShapes(state.layout, w, h)[drag.idx]);
  const scale = Math.max(bounds.w / img.width, bounds.h / img.height) * panel.zoom;
  const maxOX = Math.max(0, (img.width * scale - bounds.w) / 2);
  const maxOY = Math.max(0, (img.height * scale - bounds.h) / 2);
  if (maxOX > 0) panel.ox = clamp(drag.ox + (e.clientX - drag.x) / previewScale / maxOX, -1, 1);
  if (maxOY > 0) panel.oy = clamp(drag.oy + (e.clientY - drag.y) / previewScale / maxOY, -1, 1);
  render();
});

const endDrag = () => { drag = null; };
preview.addEventListener('pointerup', endDrag);
preview.addEventListener('pointercancel', endDrag);

preview.addEventListener('wheel', (e) => {
  const { w, h } = coverSize();
  const p = toCover(e);
  const idx = hitPanel(panelShapes(state.layout, w, h), p.x, p.y);
  if (idx < 0) return;
  e.preventDefault();
  if (idx !== state.selected) selectPanel(idx);
  const panel = state.panels[idx];
  panel.zoom = clamp(panel.zoom * Math.exp(-e.deltaY * 0.0012), 1, 3);
  syncPanelControls();
  render();
}, { passive: false });

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// ---------------------------------------------------------------- export

async function exportPNG() {
  const { w, h } = coverSize();
  const btn = $('#export');
  btn.disabled = true;
  btn.textContent = 'Exporting…';
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    renderCover(c.getContext('2d'), w, h, state, resolveImage);
    const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast(`Exported vice-cover-${w}x${h}.png`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Export PNG';
  }
}

let toastTimer = 0;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------------------------------------------------------------- wiring

function wire() {
  $('#add-photos').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', (e) => {
    addPhotoFiles([...e.target.files]);
    e.target.value = '';
  });

  $('#zoom').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value);
    render();
  });
  $('#reset-panel').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    panel.zoom = 1; panel.ox = 0; panel.oy = 0;
    syncPanelControls();
    render();
  });
  $('#fill-all').addEventListener('click', () => {
    const src = state.panels[state.selected].src;
    if (!src) return;
    const count = LAYOUTS.find((l) => l.id === state.layout).panels;
    for (let i = 0; i < count; i++) state.panels[i] = { src, zoom: 1, ox: 0, oy: 0 };
    render();
    toast('Filled every panel with this image');
  });
  $('#shuffle').addEventListener('click', () => {
    const ids = [...images.keys()];
    const count = LAYOUTS.find((l) => l.id === state.layout).panels;
    for (let i = 0; i < count; i++) {
      state.panels[i] = { src: ids[Math.floor(Math.random() * ids.length)], zoom: 1, ox: 0, oy: 0 };
    }
    syncPanelControls();
    render();
  });

  $('#caption-title').addEventListener('input', (e) => { state.caption.title = e.target.value; render(); });
  $('#caption-subtitle').addEventListener('input', (e) => { state.caption.subtitle = e.target.value; render(); });
  $('#caption-style').addEventListener('change', (e) => { state.caption.style = e.target.value; render(); });
  $('#toggle-badge').addEventListener('change', (e) => { state.caption.badge = e.target.checked; render(); });
  $('#toggle-palms').addEventListener('change', (e) => { state.caption.palms = e.target.checked; render(); });

  for (const btn of document.querySelectorAll('#sizes button')) {
    btn.addEventListener('click', () => {
      state.size = btn.dataset.size;
      for (const b of document.querySelectorAll('#sizes button')) b.classList.toggle('active', b === btn);
      render();
    });
  }
  for (const btn of document.querySelectorAll('#borders button')) {
    btn.addEventListener('click', () => {
      state.border = btn.dataset.border;
      for (const b of document.querySelectorAll('#borders button')) b.classList.toggle('active', b === btn);
      render();
    });
  }
  $('#export').addEventListener('click', exportPNG);

  new ResizeObserver(render).observe(stage);
}

async function boot() {
  await Promise.all([
    document.fonts.load('400 100px Anton'),
    document.fonts.load('400 100px Bungee'),
  ]).catch(() => {});
  registerScenes();
  await loadSamples();
  // Default cover: the six sample photos on the poster grid, framed so the
  // subject of each scene sits inside the panel's crop.
  const FRAMING = {
    'muse': { oy: -0.6 },
    'sunset-drive': { oy: -1 },
    'neon-street': { oy: -0.7 },
    'heli-beach': { ox: -0.6 },
    'ocean-boat': { oy: -0.2 },
    'skyline-dusk': {},
  };
  SAMPLE_FILES.forEach(([id], i) => {
    state.panels[i] = { src: id, zoom: 1, ox: 0, oy: 0, ...FRAMING[id] };
  });
  buildThumbs();
  buildLayoutButtons();
  buildGrades();
  buildPanelChips();
  buildStyleOptions();
  syncPanelControls();
  wire();
  render();
  document.fonts.ready.then(render);
}

boot();

// A small console API, handy for scripting the editor (and for testing).
window.viceCover = {
  state,
  images,
  render,
  renderCover,
  exportPNG,
  sceneCanvas,
  selectPanel,
  coverSize,
  SIZES,
};