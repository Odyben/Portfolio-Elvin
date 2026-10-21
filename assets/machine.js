import { initMachineScene } from './machine-scene.js';

async function startWorkshop() {
const root = document.getElementById('machineRoot');
const error = root.querySelector('#error');
const loading = root.querySelector('#loading');
const fallback = () => {
  loading.classList.add('done');
  error.hidden = false;
  error.style.display = 'block';
  root.classList.add('unavailable');
};

// The text and navigation render immediately; the workshop loads independently.
try {
  await document.fonts.ready;
  const dispose = initMachineScene(root, getComputedStyle(root).fontFamily, {
    embedded: true,
    onReady: () => root.classList.add('ready'),
  });
  if (!window.__machine) fallback();
  root.querySelector('#error').hidden = false;
  addEventListener('pagehide', event => { if (!event.persisted) dispose(); }, { once: true });
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  preference.addEventListener('change', event => {
    if (event.matches) window.__machine?.pause();
  });
} catch (error) {
  console.warn('The 3D workshop could not load.', error);
  fallback();
}
}

startWorkshop();
