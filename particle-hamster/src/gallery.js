// Six-demo comparison gallery. One WebGL renderer and one rAF loop draw every demo into its
// card's rectangle (scissored sub-viewports), so six live 3D scenes cost one context.
// Deep links: gallery.html#01 .. #06 open one demo full-window.
// Capture params: ?t=1.2&paused=1&auto=0 (repeatable stills).
import * as THREE from 'three';
import { HamsterStage } from './stage.js';
import { CHARACTERS } from './characters.js';

const params = new URLSearchParams(location.search);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('gl');
// opaque canvas: dot fragments write alpha < 1, which an alpha canvas would composite washed-out
const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'high-performance' });
const PAGE_BG = 0x050505; // matches --bg; the canvas paints the page background between cards
renderer.autoClear = true;

const demos = [...document.querySelectorAll('.demo')].map((el) => {
  const character = el.dataset.character;
  const orb = el.dataset.orb === '1';
  const stage = new HamsterStage(renderer, { character, orb, reducedMotion, time: Number(params.get('t') || 0) + Number(el.dataset.id) * 0.37 });
  if (params.get('paused') === '1') { stage.paused = true; stage.intro.v = 1; }
  if (params.get('auto') === '0' || params.get('paused') === '1') stage.setAutoOrbit(false);
  el.innerHTML = `
    <div class="loading">assembling dots…</div>
    <div class="ctl" role="toolbar" aria-label="Controls for ${el.dataset.id}">
      <button data-act="run" aria-pressed="${stage.running}" title="Run / pause (Space)">${stage.running ? 'Running' : 'Paused'}</button>
      <button data-act="auto" aria-pressed="${stage.orbit.auto}" title="Slow automatic orbit when idle">Orbit</button>
      <button data-act="ascii" aria-pressed="false" title="ASCII render mode, experimental (A)">ASCII β</button>
      <button data-act="reset" title="Back to the side view (R)">Reset</button>
      <button data-act="expand" class="expand" title="Open full window (Enter)">Expand</button>
      <button data-act="close" class="close" title="Back to all six (Esc)">Close</button>
    </div>
    <div class="label"><span class="num">${el.dataset.id}</span><span class="name">${CHARACTERS[character].name}</span><span class="kind">${orb ? 'sphere' : 'standalone'}</span></div>`;
  stage.ready.then(() => el.querySelector('.loading')?.remove());
  stage.orbit.attach(el);
  return { el, stage, id: el.dataset.id };
});

// ---- controls
let focused = null;
function setFocus(demo) {
  for (const d of demos) d.el.classList.toggle('focused', d === demo);
  document.body.classList.toggle('has-focus', !!demo);
  focused = demo;
  if (typeof resize === 'function') resize();
  const hash = demo ? `#${demo.id}` : ' ';
  if (location.hash !== hash) history.replaceState(null, '', demo ? hash : location.pathname + location.search);
  demo?.el.focus({ preventScroll: true });
}
function act(demo, what) {
  const { stage, el } = demo;
  const btn = (a) => el.querySelector(`[data-act="${a}"]`);
  if (what === 'run') { stage.setRunning(!stage.running); btn('run').setAttribute('aria-pressed', String(stage.running)); btn('run').textContent = stage.running ? 'Running' : 'Paused'; }
  if (what === 'auto') { stage.setAutoOrbit(!stage.orbit.auto); btn('auto').setAttribute('aria-pressed', String(stage.orbit.auto)); }
  if (what === 'ascii') { stage.setMode(stage.mode === 'ascii' ? 'dots' : 'ascii'); btn('ascii').setAttribute('aria-pressed', String(stage.mode === 'ascii')); }
  if (what === 'reset') stage.orbit.reset();
  if (what === 'expand') setFocus(demo);
  if (what === 'close') setFocus(null);
}
for (const demo of demos) {
  const { el } = demo;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (b) { e.stopPropagation(); act(demo, b.dataset.act); }
  });
  // stop the orbit from grabbing pointer events that start on a button
  el.querySelector('.ctl').addEventListener('pointerdown', (e) => e.stopPropagation());
  // a tap (no drag) opens the demo; a drag turns it
  let tap = null;
  el.addEventListener('pointerdown', (e) => { tap = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  el.addEventListener('pointerup', (e) => {
    if (tap && !focused && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 6 && performance.now() - tap.t < 350) setFocus(demo);
    tap = null;
  });
  el.addEventListener('dblclick', () => setFocus(focused === demo ? null : demo));
  el.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'Enter' && !focused) setFocus(demo);
    else if (k === 'Escape') setFocus(null);
    else if (k === ' ') { e.preventDefault(); act(demo, 'run'); }
    else if (k === 'a' || k === 'A') act(demo, 'ascii');
    else if (k === 'r' || k === 'R') act(demo, 'reset');
    else if (k === 'ArrowLeft') demo.stage.orbit.nudge(-1.2, 0);
    else if (k === 'ArrowRight') demo.stage.orbit.nudge(1.2, 0);
    else if (k === 'ArrowUp') { e.preventDefault(); demo.stage.orbit.nudge(0, -0.8); }
    else if (k === 'ArrowDown') { e.preventDefault(); demo.stage.orbit.nudge(0, 0.8); }
    else return;
  });
}
addEventListener('keydown', (e) => { if (e.key === 'Escape' && focused) setFocus(null); });
const fromHash = () => setFocus(demos.find((d) => `#${d.id}` === location.hash) || null);
addEventListener('hashchange', fromHash);
fromHash();

// ---- one loop, six scissored viewports
// six live scenes at once: cap the pixel ratio a little lower than a single expanded demo
// (the dense V3 coats are fill-rate heavy on laptop GPUs)
function resize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, focused ? 2 : 1.5));
  renderer.setSize(innerWidth, innerHeight, false);
}
addEventListener('resize', resize);
resize();

let raf = 0, prev = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, prev ? (now - prev) / 1000 : 0);
  prev = now;
  const dpr = renderer.getPixelRatio();
  const H = innerHeight;
  // page background between cards, black inside each card's viewport
  renderer.setScissorTest(false);
  renderer.setClearColor(PAGE_BG, 1);
  renderer.clear();
  renderer.setScissorTest(true);
  renderer.setClearColor(0x000000, 1);
  for (const { el, stage } of demos) {
    if (focused && focused.el !== el) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H || r.width < 2 || r.height < 2) continue; // off-screen: skip
    const rect = { x: r.left, y: H - r.bottom, w: r.width, h: r.height };
    renderer.setViewport(rect.x, rect.y, rect.w, rect.h);
    renderer.setScissor(rect.x, rect.y, rect.w, rect.h);
    stage.resize(rect.w, rect.h, dpr);
    stage.update(dt);
    stage.render(rect);
  }
}
const start = () => { if (!raf) { prev = 0; raf = requestAnimationFrame(frame); } };
const stop = () => { cancelAnimationFrame(raf); raf = 0; };
document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
if (!document.hidden) start();

window.__gallery = demos; // read-only QA hook (tools/browser-test.cjs)

Promise.all(demos.map((d) => d.stage.ready)).then(() => {
  document.body.dataset.ready = '1';
  document.body.dataset.particles = String(demos.reduce((n, d) => n + d.stage.particleCount, 0));
});

addEventListener('pagehide', () => {
  stop();
  for (const d of demos) d.stage.dispose();
  renderer.dispose();
});
