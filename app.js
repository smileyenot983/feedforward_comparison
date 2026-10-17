'use strict';

const $ = id => document.getElementById(id);
const storageKey = 'co3d-public-comparison-v1';
let gallery, state, loadedScene, viewerReady = false;
const names = {
  pi3x: 'Pi3X', da3: 'DA3', pow3r: 'Pow3R (pairs)', map: 'MapAnything', omega: 'VGGT-Omega',
  omega_own: 'VGGT-Omega · predicted cameras', map_rgb_only: 'MapAnything · RGB only',
  pi3x_rgb_only: 'Pi3X · RGB only', ggpt: 'Pi3X + GGPT',
  ggpt_rgb_only: 'Pi3X + GGPT · RGB only', ggpt_rgb_only_fast: 'Pi3X + GGPT · fast / RGB only',
  co3d_reference: 'Original CO3D'
};
const experimentNotes = {
  omega: 'RGB-only inference · depth reprojected with CO3D cameras',
  omega_own: 'RGB-only inference · predicted cameras',
  map_rgb_only: 'RGB-only inference · predicted cameras',
  pi3x_rgb_only: 'RGB-only inference · predicted cameras',
  ggpt: 'RGB + CO3D cameras · SfM-refined cameras',
  ggpt_rgb_only: 'RGB-only inference · SfM-refined cameras',
  ggpt_rgb_only_fast: 'RGB-only inference · RoMaV2-fast / SfM-refined cameras'
};
function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function note(key) { return experimentNotes[key] || 'RGB + CO3D cameras · CO3D cloud cameras'; }
function readSaved() {
  try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { return {}; }
}
function readState(saved = {}) {
  const params = new URLSearchParams(location.search);
  const value = key => params.get(key) ?? saved[key];
  const scenes = gallery.scenes.map(item => item.scene), methods = gallery.methods.map(item => item.key);
  const left = methods.includes(value('left')) ? value('left') : 'pi3x';
  const right = methods.includes(value('right')) ? value('right') : 'omega';
  return {
    scene: scenes.includes(value('scene')) ? value('scene') : scenes[0], left, right,
    region: value('region') === 'all' ? 'all' : 'fg',
    view: ['front', 'rotated', 'source'].includes(value('view')) ? value('view') : 'front',
    extras: String(value('extras')) === '1' || !gallery.primary.includes(left) || !gallery.primary.includes(right)
  };
}
function persist() {
  const params = new URLSearchParams({scene: state.scene, left: state.left, right: state.right, region: state.region, view: state.view});
  if (state.extras) params.set('extras', '1');
  const url = new URL(location.href);
  url.search = params.toString();
  history.replaceState(null, '', url);
  try { localStorage.setItem(storageKey, JSON.stringify({...state, extras: state.extras ? '1' : '0'})); } catch {}
}
function fillMethodMenus() {
  const methods = [...gallery.primary, ...gallery.methods.map(item => item.key).filter(key => !gallery.primary.includes(key))];
  for (const side of ['left', 'right']) {
    const select = $(side + '-method'); select.replaceChildren();
    for (const key of methods) {
      if (!state.extras && !gallery.primary.includes(key)) continue;
      const option = new Option(names[key], key); option.title = note(key); select.add(option);
    }
    select.value = state[side];
    $(side + '-context').textContent = note(state[side]);
  }
  $('region').value = state.region;
  $('include-extras').checked = state.extras;
}
function viewerUrl(embed = false) {
  const url = new URL(`${state.scene}/viewer.html`, location.href);
  url.search = new URLSearchParams({left: state.left, right: state.right, region: state.region, extras: state.extras ? '1' : '0', ...(embed ? {embed: '1'} : {})}).toString();
  return url;
}
function syncViewer() {
  $('standalone').href = viewerUrl().href;
  if (loadedScene !== state.scene) {
    loadedScene = state.scene; viewerReady = false;
    $('viewer-loading').hidden = false;
    $('viewer').src = viewerUrl(true).href;
  } else if (viewerReady) {
    $('viewer').contentWindow.postMessage({type: 'co3d-controls', left: state.left, right: state.right, region: state.region, extras: state.extras}, location.origin);
  }
}
function renderPreviews() {
  const descriptions = {front: 'RGB-colored pointclouds from the first-camera side.', rotated: 'The same clouds from another angle, with shared framing.', source: 'Each color identifies an input view. Separated layers can reveal misalignment.'};
  $('preview-description').textContent = descriptions[state.view];
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
  $('previews').replaceChildren();
  for (const side of ['left', 'right']) {
    const key = state[side], figure = node('figure');
    figure.append(node('figcaption', names[key]));
    const link = node('a'), image = document.createElement('img');
    image.src = `${state.scene}/previews/${key}_${state.region}_${state.view}.png`;
    image.alt = `${state.scene}: ${names[key]}, ${state.region === 'fg' ? 'foreground' : 'whole scene'}, ${state.view} preview`;
    image.width = image.height = 640; image.loading = 'lazy'; image.decoding = 'async';
    link.href = image.src; link.append(image); figure.append(link); $('previews').append(figure);
  }
}
function render() {
  fillMethodMenus();
  const index = gallery.scenes.findIndex(item => item.scene === state.scene);
  $('scene').value = state.scene;
  $('scene-position').textContent = `${index + 1} / ${gallery.scenes.length}`;
  $('sequence').textContent = state.scene.split('/')[1];
  $('previous').disabled = index === 0; $('next').disabled = index === gallery.scenes.length - 1;
  document.querySelectorAll('.thumbnail').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scene === state.scene)));
  persist(); syncViewer(); renderPreviews();
}
function buildScenes() {
  for (const scene of gallery.scenes) {
    const category = scene.scene.split('/')[0];
    $('scene').add(new Option(category[0].toUpperCase() + category.slice(1), scene.scene));
    const button = node('button', undefined, 'thumbnail');
    button.dataset.scene = scene.scene; button.title = scene.scene; button.setAttribute('aria-label', 'Explore ' + scene.scene);
    const image = document.createElement('img');
    image.src = `${scene.scene}/previews/pi3x_fg_front.png`; image.alt = ''; image.width = image.height = 640; image.loading = 'lazy'; image.decoding = 'async';
    button.append(image, node('span', category));
    button.addEventListener('click', () => { state.scene = scene.scene; render(); $('explore').scrollIntoView({block: 'start'}); });
    $('thumbnails').append(button);
  }
}
function metricTable(rows) {
  const wrapper = node('div', undefined, 'metrics-scroll'), table = node('table');
  table.append(node('caption', 'Aggregate saved scores · scene-balanced medians'));
  const head = node('thead'), tr = node('tr');
  for (const title of ['Method', 'Inference input', 'Cloud cameras', 'FG disagreement ↓', 'BG disagreement ↓', 'CO3D FG depth error ↓', 'Runtime (s)', 'GPU (GiB)', 'Scored scenes FG / BG']) {
    const th = node('th', title); th.scope = 'col'; tr.append(th);
  }
  head.append(tr); table.append(head);
  const body = node('tbody');
  const format = (value, percent = false) => typeof value === 'number' && Number.isFinite(value) ? (value * (percent ? 100 : 1)).toFixed(2) + (percent ? '%' : '') : '—';
  for (const row of rows) {
    const tr = node('tr'); tr.dataset.method = row.method;
    const input = row.camera_conditioning === true ? 'RGB + CO3D cameras' : row.camera_conditioning === false ? 'RGB only' : 'CO3D reference';
    const cells = [names[row.method], input, row.camera_source,
      format(row.regions.foreground?.discrepancy, true), format(row.regions.background?.discrepancy, true),
      format(row.reference_discrepancy, true), format(row.inference_seconds), format(row.peak_allocated_gib),
      `${row.scored_scenes.foreground} / ${row.scored_scenes.background}`];
    cells.forEach(value => tr.append(node('td', value))); body.append(tr);
  }
  table.append(body); wrapper.append(table); return wrapper;
}
function buildMetrics() {
  const commonOrder = [...gallery.primary, 'omega_own'];
  $('primary-metrics').append(metricTable(commonOrder.map(key => gallery.aggregate.find(row => row.method === key))));
  const notes = {
    map_rgb_only: 'Native grid and its own retained mask.',
    pi3x_rgb_only: 'Native grid; retained intersection with conditioned MapAnything / DA3 masks.',
    ggpt_native: 'Camera-conditioned GGPT; native XYZ rasterization and a three-variant common raster mask.',
    ggpt_rgb_only_native: 'RGB-only GGPT; native XYZ rasterization and its own three-variant common raster mask.',
    ggpt_rgb_only_fast_native: 'RGB-only GGPT with RoMaV2-fast; native XYZ rasterization and its own three-variant raster mask.',
    co3d_reference: 'Sparse original CO3D depths on their native validity mask. FG scores cover 20 scenes; BG scores cover 18. These pixels differ from the dense predictions.'
  };
  const groups = new Map();
  for (const row of gallery.aggregate.filter(row => row.protocol !== 'common')) {
    if (!groups.has(row.protocol)) groups.set(row.protocol, []);
    groups.get(row.protocol).push(row);
  }
  for (const [protocol, rows] of groups) {
    $('extra-metrics').append(node('h3', names[rows[0].method]), node('p', notes[protocol], 'protocol-note'), metricTable(rows));
  }
}
async function start() {
  const response = await fetch('gallery.json');
  if (!response.ok) throw Error('The scene manifest could not be loaded.');
  gallery = await response.json(); state = readState(readSaved());
  buildScenes(); buildMetrics();
  $('scene').addEventListener('change', event => { state.scene = event.target.value; render(); });
  for (const [id, step] of [['previous', -1], ['next', 1]]) {
    $(id).addEventListener('click', () => {
      const index = gallery.scenes.findIndex(item => item.scene === state.scene);
      state.scene = gallery.scenes[index + step].scene; render();
    });
  }
  for (const side of ['left', 'right']) $(side + '-method').addEventListener('change', event => { state[side] = event.target.value; render(); });
  $('region').addEventListener('change', event => { state.region = event.target.value; render(); });
  $('include-extras').addEventListener('change', event => {
    state.extras = event.target.checked;
    if (!state.extras) {
      if (!gallery.primary.includes(state.left)) state.left = 'pi3x';
      if (!gallery.primary.includes(state.right)) state.right = 'omega';
    }
    render();
  });
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { state.view = button.dataset.view; persist(); renderPreviews(); }));
  $('copy-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); $('copy-status').textContent = 'Link copied'; }
    catch { $('copy-status').textContent = 'Copy the URL from your browser’s address bar.'; }
  });
  window.addEventListener('popstate', () => { state = readState(); render(); });
  render();
}
window.addEventListener('message', event => {
  if (event.source !== $('viewer').contentWindow || event.origin !== location.origin) return;
  const message = event.data;
  if (!message || !['co3d-ready', 'co3d-height'].includes(message.type)) return;
  if (Number.isFinite(message.height) && message.height >= 250 && message.height <= 2500) $('viewer').style.height = Math.ceil(message.height) + 'px';
  if (message.type === 'co3d-ready') {
    viewerReady = true; $('viewer-loading').hidden = true;
    if (state) syncViewer();
  }
});
start().catch(error => { $('error').hidden = false; $('error').textContent = error.message + ' Serve this folder over HTTP or GitHub Pages.'; $('viewer-loading').hidden = true; });
