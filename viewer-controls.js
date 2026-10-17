'use strict';

// Reuse the saved viewer's render loop and geometry without modifying cloud data.
const embedded = new URLSearchParams(location.search).get('embed') === '1';
document.documentElement.classList.toggle('embedded', embedded);
const primaryMethods = ['pi3x', 'da3', 'pow3r', 'map', 'omega'];
const publicNames = {pi3x:'Pi3X',da3:'DA3',pow3r:'Pow3R (pairs)',map:'MapAnything',omega:'VGGT-Omega',omega_own:'VGGT-Omega · predicted cameras',map_rgb_only:'MapAnything · RGB only',pi3x_rgb_only:'Pi3X · RGB only',ggpt:'Pi3X + GGPT',ggpt_rgb_only:'Pi3X + GGPT · RGB only',ggpt_rgb_only_fast:'Pi3X + GGPT · fast / RGB only'};
const publicNotes = {omega:'RGB-only inference · depth reprojected with CO3D cameras',omega_own:'RGB-only inference · predicted cameras',map_rgb_only:'RGB-only inference · predicted cameras',pi3x_rgb_only:'RGB-only inference · predicted cameras',ggpt:'RGB + CO3D cameras · SfM-refined cameras',ggpt_rgb_only:'RGB-only inference · SfM-refined cameras',ggpt_rgb_only_fast:'RGB-only inference · RoMaV2-fast / SfM-refined cameras'};
let includeExtras = requested.get('extras') === '1';
for (const key of ['left', 'right']) {
  if (requested.has(key) && data.clouds.some(cloud => cloud.method === requested.get(key)) && !primaryMethods.includes(requested.get(key))) includeExtras = true;
}
function refreshPublicMenus() {
  for (const id of ['leftModel', 'rightModel']) {
    const select = $(id), current = select.value;
    select.replaceChildren();
    const order = [...primaryMethods, ...data.clouds.map(cloud => cloud.method).filter(key => !primaryMethods.includes(key))];
    for (const key of order) {
      if (!includeExtras && !primaryMethods.includes(key)) continue;
      const index = data.clouds.findIndex(cloud => cloud.method === key);
      if (index < 0) continue;
      const option = new Option(publicNames[key], String(index)); option.title = publicNotes[key] || 'RGB + CO3D cameras · CO3D cloud cameras'; select.add(option);
    }
    const valid = Array.from(select.options).some(option => option.value === current);
    select.value = valid ? current : String(data.clouds.findIndex(cloud => cloud.method === (id === 'leftModel' ? 'pi3x' : 'omega')));
  }
  refreshPublicContext();
}
function refreshPublicContext() {
  for (const id of ['leftModel', 'rightModel']) {
    const key = data.clouds[Number($(id).value)].method;
    $(id + '-context').textContent = publicNotes[key] || 'RGB + CO3D cameras · CO3D cloud cameras';
  }
}
function persistViewer() {
  const url = new URL(location.href);
  url.searchParams.set('left', data.clouds[Number($('leftModel').value)].method);
  url.searchParams.set('right', data.clouds[Number($('rightModel').value)].method);
  url.searchParams.set('region', $('region').value);
  url.searchParams.set('extras', includeExtras ? '1' : '0');
  history.replaceState(null, '', url);
}
refreshPublicMenus();
for (const id of ['leftModel', 'rightModel', 'region']) $(id).addEventListener('change', () => { refreshPublicContext(); persistViewer(); });
for (const id of ['left', 'right']) { $(id).setAttribute('aria-label', id + ' pointcloud, drag to rotate or scroll to zoom'); }
const back = document.createElement('a'); back.className = 'public-back'; back.textContent = '← Back to comparison';
back.href = '../../?scene=' + encodeURIComponent(data.scene); document.body.prepend(back);
const extraLabel = document.createElement('label'); extraLabel.className = 'viewer-extra';
const extraCheckbox = document.createElement('input'); extraCheckbox.type = 'checkbox'; extraCheckbox.checked = includeExtras;
extraLabel.append(extraCheckbox, document.createTextNode(' Include additional experiments'));
document.querySelector('body>details').append(extraLabel);
extraCheckbox.addEventListener('change', () => { includeExtras = extraCheckbox.checked; refreshPublicMenus(); persistViewer(); schedule(); });
window.addEventListener('message', event => {
  if (!embedded || event.source !== parent || event.origin !== location.origin || event.data?.type !== 'co3d-controls') return;
  const message = event.data;
  includeExtras = Boolean(message.extras); refreshPublicMenus();
  for (const [key, id] of [['left', 'leftModel'], ['right', 'rightModel']]) {
    const index = data.clouds.findIndex(cloud => cloud.method === message[key]);
    if (index >= 0 && (includeExtras || primaryMethods.includes(message[key]))) $(id).value = String(index);
  }
  $('region').value = message.region === 'all' ? 'all' : 'fg';
  refreshPublicContext(); persistViewer(); schedule();
});
function reportHeight(type = 'co3d-height') {
  if (embedded) parent.postMessage({type, height: Math.ceil(document.body.getBoundingClientRect().height)}, location.origin);
}
if (embedded) {
  new ResizeObserver(() => reportHeight()).observe(document.body);
  requestAnimationFrame(() => { reportHeight('co3d-ready'); schedule(); });
}
schedule();
