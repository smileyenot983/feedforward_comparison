'use strict';

const $ = id => document.getElementById(id);
const storageKey = 'co3d-public-comparison-v1';
let gallery, state, loadedScene, viewerReady = false;
const names = {
  pi3x: 'Pi3X [CO3D cameras]', da3: 'DA3 [CO3D cameras]', pow3r: 'Pow3R (pairs) [CO3D cameras]', map: 'MapAnything [CO3D cameras]',
  omega: 'VGGT-Omega [RGB only] (CO3D placement)',
  omega_own: 'VGGT-Omega [RGB only] (predicted placement)', map_rgb_only: 'MapAnything [RGB only]',
  pi3x_rgb_only: 'Pi3X [RGB only]', ggpt: 'Pi3X + GGPT [CO3D cameras]',
  ggpt_rgb_only: 'Pi3X + GGPT [RGB only]', ggpt_rgb_only_fast: 'Pi3X + GGPT (fast) [RGB only]',
  co3d_reference: 'Original CO3D'
};
const experimentNotes = {
  omega: 'Images only · shown with known cameras',
  omega_own: 'Images only · estimates its cameras',
  map_rgb_only: 'Images only · estimates its cameras',
  pi3x_rgb_only: 'Images only · estimates its cameras',
  ggpt: 'Images + known cameras · cameras refined',
  ggpt_rgb_only: 'Images only · cameras refined',
  ggpt_rgb_only_fast: 'Images only · fast matching, refined cameras'
};
function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function note(key) { return experimentNotes[key] || 'Images + known cameras'; }
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
    region: value('region') === 'all' ? 'all' : 'fg'
  };
}
function persist() {
  const params = new URLSearchParams({scene: state.scene, left: state.left, right: state.right, region: state.region});
  const url = new URL(location.href);
  url.search = params.toString();
  history.replaceState(null, '', url);
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
}
function fillMethodMenus() {
  const methods = [...gallery.primary, ...gallery.methods.map(item => item.key).filter(key => !gallery.primary.includes(key))];
  for (const side of ['left', 'right']) {
    const select = $(side + '-method'); select.replaceChildren();
    for (const key of methods) {
      const option = new Option(names[key], key); option.title = note(key); select.add(option);
    }
    select.value = state[side];
    $(side + '-context').textContent = note(state[side]);
  }
  $('region').value = state.region;
}
function viewerUrl(embed = false) {
  const url = new URL(`${state.scene}/viewer.html`, location.href);
  url.search = new URLSearchParams({left: state.left, right: state.right, region: state.region, ...(embed ? {embed: '1'} : {})}).toString();
  return url;
}
function syncViewer() {
  $('standalone').href = viewerUrl().href;
  if (loadedScene !== state.scene) {
    loadedScene = state.scene; viewerReady = false;
    $('viewer-loading').hidden = false;
    $('viewer').src = viewerUrl(true).href;
  } else if (viewerReady) {
    $('viewer').contentWindow.postMessage({type: 'co3d-controls', left: state.left, right: state.right, region: state.region}, location.origin);
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
  persist(); syncViewer();
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
function metricTable(rows, protocols) {
  const wrapper = node('div', undefined, 'metrics-scroll'), table = node('table');
  table.append(node('caption', 'Aggregate saved scores · scene-balanced medians'));
  const head = node('thead'), tr = node('tr');
  for (const title of ['Method', 'Model input', 'Cameras used', 'Object disagreement ↓', 'Background disagreement ↓', 'Object depth error ↓', 'Runtime (s)', 'GPU memory (GiB)', 'Scenes object / background']) {
    const th = node('th', title); th.scope = 'col'; tr.append(th);
  }
  head.append(tr); table.append(head);
  let body, previousProtocol;
  const format = (value, percent = false) => typeof value === 'number' && Number.isFinite(value) ? (value * (percent ? 100 : 1)).toFixed(2) + (percent ? '%' : '') : '—';
  for (const row of rows) {
    if (row.protocol !== previousProtocol) {
      body = node('tbody'); body.dataset.protocol = row.protocol;
      const group = node('tr', undefined, 'metric-protocol'), heading = node('th');
      heading.scope = 'rowgroup'; heading.colSpan = 9;
      heading.append(node('span', protocols[row.protocol].title), node('span', protocols[row.protocol].note, 'protocol-note'));
      group.append(heading); body.append(group); table.append(body);
      previousProtocol = row.protocol;
    }
    const tr = node('tr'); tr.dataset.method = row.method;
    const input = row.camera_conditioning === true ? 'Images + cameras' : row.camera_conditioning === false ? 'Images only' : 'Reference data';
    const cameras = row.camera_source === 'CO3D' ? 'Provided (CO3D)' : row.camera_source === 'predicted' ? 'Predicted' : /refined/i.test(row.camera_source) ? 'Refined' : row.camera_source;
    const cells = [names[row.method], input, cameras,
      format(row.regions.foreground?.discrepancy, true), format(row.regions.background?.discrepancy, true),
      format(row.reference_discrepancy, true), format(row.inference_seconds), format(row.peak_allocated_gib),
      `${row.scored_scenes.foreground} / ${row.scored_scenes.background}`];
    cells.forEach(value => tr.append(node('td', value))); body.append(tr);
  }
  wrapper.append(table); return wrapper;
}
function buildMetrics() {
  const commonOrder = [...gallery.primary, 'omega_own'];
  const protocols = {
    common: {title: 'Shared scoring pixels', note: 'Common 512 grid and intersection of the five primary model masks. Camera inputs differ. The two VGGT-Omega rows reuse one prediction.'},
    map_rgb_only: {title: names.map_rgb_only, note: 'Native grid and its own retained mask.'},
    pi3x_rgb_only: {title: names.pi3x_rgb_only, note: 'Native grid; retained intersection with conditioned MapAnything / DA3 masks.'},
    ggpt_native: {title: names.ggpt, note: 'Native XYZ rasterization and a three-variant common raster mask.'},
    ggpt_rgb_only_native: {title: names.ggpt_rgb_only, note: 'Native XYZ rasterization and its own three-variant common raster mask.'},
    ggpt_rgb_only_fast_native: {title: names.ggpt_rgb_only_fast, note: 'Images only, with RoMaV2-fast; native XYZ rasterization and its own three-variant raster mask.'},
    co3d_reference: {title: 'Original CO3D reference', note: 'Sparse original depths with their own validity mask. Object scores cover 20 scenes; background scores cover 18. These pixels differ from the dense predictions.'}
  };
  const rows = [...commonOrder.map(key => gallery.aggregate.find(row => row.method === key)), ...gallery.aggregate.filter(row => row.protocol !== 'common')];
  $('primary-metrics').append(metricTable(rows, protocols));
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
