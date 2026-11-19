// Studio controller: holds the editing state, wires the controls, drives the
// live preview and the pointer crop/zoom, and hands exports to cover.js.

import { SCENES, paintScene } from './scenes.js';
import { SIZES, panelShapes, panelCount, shapeContains } from './layouts.js';
import { GRADES, GRADE_IDS } from './grades.js';
import { composeCover, exportCover, clampCrop } from './cover.js';

const photos = [];

const state = {
  layout: 'grid',
  grade: 'sunset',
  caption: 'VICE CITY',
  captionStyle: 'sunset',
  badge: true,
  palms: true,
  grain: true,
  size: 'portrait',
  panels: [],
};

let selected = 0;
let drag = null;
let renderQueued = 0;

const $ = (id) => document.getElementById(id);
const preview = $('preview');

// ---------------------------------------------------------------- photos

function makePhoto(canvas, name) {
  const thumb = document.createElement('canvas');
  thumb.width = 96;
  thumb.height = 128;
  const tctx = thumb.getContext('2d');
  const s = Math.max(thumb.width / canvas.width, thumb.height / canvas.height);
  tctx.drawImage(canvas, (thumb.width - canvas.width * s) / 2, (thumb.height - canvas.height * s) / 2, canvas.width * s, canvas.height * s);
  return { name, canvas, w: canvas.width, h: canvas.height, thumb: thumb.toDataURL('image/jpeg', 0.82) };
}

function rebuildChips() {
  const wrap = $('photoChips');
  wrap.textContent = '';
  photos.forEach((photo, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.name;
    const label = document.createElement('span');
    label.className = 'chipname';
    label.textContent = photo.name;
    chip.append(img, label);
    chip.addEventListener('click', () => {
      state.panels[selected].src = i;
      scheduleRender();
    });
    wrap.appendChild(chip);
  });
}

async function addFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  let added = 0;
  for (const file of files) {
    try {
      const bitmap = await createImageBitmap(file);
      const cap = 2400;
      const s = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * s));
      canvas.height = Math.max(1, Math.round(bitmap.height * s));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      photos.push(makePhoto(canvas, file.name.replace(/\.[^.]+$/, '')));
      added++;
    } catch {
      toast(`Could not read ${file.name}`);
    }
  }
  if (added) {
    state.panels[selected].src = photos.length - 1;
    rebuildChips();
    scheduleRender();
    toast(`Added ${added} photo${added > 1 ? 's' : ''} — yours stay on this machine`);
  }
}

// ---------------------------------------------------------------- rendering

function currentSize() {
  return SIZES[state.size];
}

function render() {
  const { w, h } = currentSize();
  const poster = composeCover(state, photos, w, h);
  preview.width = w;
  preview.height = h;
  const ctx = preview.getContext('2d');
  ctx.drawImage(poster, 0, 0);
  // selection outline: preview only, never part of an export
  const shapes = panelShapes(state.layout, w, h);
  const shape = shapes[selected];
  if (shape) {
    ctx.save();
    ctx.beginPath();
    if (shape.poly) {
      ctx.moveTo(shape.poly[0][0], shape.poly[0][1]);
      for (let i = 1; i < shape.poly.length; i++) ctx.lineTo(shape.poly[i][0], shape.poly[i][1]);
      ctx.closePath();
    } else {
      ctx.rect(shape.x, shape.y, shape.w, shape.h);
    }
    ctx.strokeStyle = '#ffd75e';
    ctx.lineWidth = Math.max(3, w * 0.003);
    ctx.setLineDash([w * 0.012, w * 0.008]);
    ctx.stroke();
    ctx.restore();
  }
  $('panelInfo').textContent = `Panel ${selected + 1} of ${shapes.length} · ${state.panels[selected].zoom.toFixed(2)}× zoom`;
  [...$('photoChips').children].forEach((chip, i) => {
    chip.classList.toggle('active', i === state.panels[selected].src);
  });
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = requestAnimationFrame(() => {
    renderQueued = 0;
    render();
  });
}

// ---------------------------------------------------------------- pointer crop

function canvasPoint(e) {
  const rect = preview.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * preview.width) / rect.width,
    y: ((e.clientY - rect.top) * preview.height) / rect.height,
    scale: preview.width / rect.width,
  };
}

function panelAt(x, y) {
  const { w, h } = currentSize();
  const shapes = panelShapes(state.layout, w, h);
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (shapeContains(shapes[i], x, y)) return i;
  }
  return -1;
}

function bindPointer() {
  preview.addEventListener('pointerdown', (e) => {
    const p = canvasPoint(e);
    const hit = panelAt(p.x, p.y);
    if (hit < 0) return;
    selected = hit;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, scale: p.scale };
    preview.setPointerCapture(e.pointerId);
    preview.classList.add('dragging');
    scheduleRender();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const panel = state.panels[selected];
    const { w, h } = currentSize();
    const shape = panelShapes(state.layout, w, h)[selected];
    const photo = photos[panel.src];
    if (!photo) return;
    panel.dx += (e.clientX - drag.x) * drag.scale;
    panel.dy += (e.clientY - drag.y) * drag.scale;
    drag.x = e.clientX;
    drag.y = e.clientY;
    clampCrop(panel, photo, shape);
    scheduleRender();
  });
  const endDrag = (e) => {
    if (drag && e.pointerId === drag.id) {
      drag = null;
      preview.classList.remove('dragging');
    }
  };
  preview.addEventListener('pointerup', endDrag);
  preview.addEventListener('pointercancel', endDrag);
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = canvasPoint(e);
    const hit = panelAt(p.x, p.y);
    if (hit >= 0) selected = hit;
    const panel = state.panels[selected];
    const { w, h } = currentSize();
    const shape = panelShapes(state.layout, w, h)[selected];
    const photo = photos[panel.src];
    if (!photo) return;
    panel.zoom = Math.min(4, Math.max(1, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
    clampCrop(panel, photo, shape);
    scheduleRender();
  }, { passive: false });
}

// ---------------------------------------------------------------- controls

function syncPanels() {
  const n = panelCount(state.layout);
  while (state.panels.length < n) {
    state.panels.push({ src: state.panels.length % photos.length, zoom: 1, dx: 0, dy: 0 });
  }
  state.panels.length = n;
  selected = Math.min(selected, n - 1);
}

function markSeg(segId, attr, value) {
  [...$(segId).children].forEach((btn) => {
    btn.classList.toggle('active', btn.dataset[attr] === value);
  });
}

function buildGradeList() {
  const wrap = $('gradeList');
  for (const id of GRADE_IDS) {
    const grade = GRADES[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade';
    btn.dataset.grade = id;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = `linear-gradient(90deg, ${grade.swatch.join(', ')})`;
    const label = document.createElement('span');
    label.textContent = grade.label;
    btn.append(swatch, label);
    btn.addEventListener('click', () => {
      state.grade = id;
      syncGrades();
      scheduleRender();
    });
    wrap.appendChild(btn);
  }
}

function syncGrades() {
  [...$('gradeList').children].forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.grade === state.grade);
  });
}

function bindControls() {
  $('addPhotos').addEventListener('click', () => $('photoFile').click());
  $('photoFile').addEventListener('change', (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  });
  $('fillAll').addEventListener('click', () => {
    const src = state.panels[selected].src;
    for (const panel of state.panels) panel.src = src;
    scheduleRender();
    toast('One photo in every panel');
  });
  $('resetCrop').addEventListener('click', () => {
    const panel = state.panels[selected];
    panel.zoom = 1;
    panel.dx = 0;
    panel.dy = 0;
    scheduleRender();
  });

  $('layoutSeg').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-layout]');
    if (!btn) return;
    state.layout = btn.dataset.layout;
    syncPanels();
    markSeg('layoutSeg', 'layout', state.layout);
    scheduleRender();
  });

  $('styleSeg').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-style]');
    if (!btn) return;
    state.captionStyle = btn.dataset.style;
    markSeg('styleSeg', 'style', state.captionStyle);
    scheduleRender();
  });

  $('sizeSeg').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-size]');
    if (!btn) return;
    state.size = btn.dataset.size;
    markSeg('sizeSeg', 'size', state.size);
    $('sizeHint').textContent = `${currentSize().label} px · PNG download`;
    scheduleRender();
  });

  $('captionText').addEventListener('input', (e) => {
    state.caption = e.target.value;
    scheduleRender();
  });
  $('badgeToggle').addEventListener('change', (e) => { state.badge = e.target.checked; scheduleRender(); });
  $('palmsToggle').addEventListener('change', (e) => { state.palms = e.target.checked; scheduleRender(); });
  $('grainToggle').addEventListener('change', (e) => { state.grain = e.target.checked; scheduleRender(); });

  $('exportBtn').addEventListener('click', async () => {
    const btn = $('exportBtn');
    btn.disabled = true;
    try {
      const size = currentSize();
      await exportCover(state, photos, size);
      toast(`Saved vice-cover-${size.w}x${size.h}.png`);
    } catch (err) {
      toast(`Export failed: ${err.message}`);
    }
    btn.disabled = false;
  });
}

let toastTimer = 0;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------------------------------------------------------------- startup

async function init() {
  for (const scene of SCENES) {
    photos.push(makePhoto(paintScene(scene), scene.name));
  }
  syncPanels();
  buildGradeList();
  rebuildChips();
  bindControls();
  bindPointer();
  markSeg('layoutSeg', 'layout', state.layout);
  markSeg('styleSeg', 'style', state.captionStyle);
  markSeg('sizeSeg', 'size', state.size);
  syncGrades();
  $('sizeHint').textContent = `${currentSize().label} px · PNG download`;
  try {
    await Promise.all([document.fonts.load('32px Anton'), document.fonts.load('32px Bungee')]);
    await document.fonts.ready;
  } catch {
    // fall back to system fonts rather than blocking the studio
  }
  render();
  // readiness hook used by the maker's screenshot scripts
  window.__vice = { state, photos, render: scheduleRender };
  window.__viceReady = true;
}

init();