// Single full-window viewer for one experience. One renderer, one rAF loop.
// Query params: ?character=orange|purple|golden  &orb=1  &view=side|front|three-quarter|back|profile
//               &t=0.2&paused=1 (repeatable captures)  &run=0  &mode=ascii  &auto=0
import * as THREE from 'three';
import { HamsterStage } from './stage.js';
import { CHARACTERS } from './characters.js';
import { VIEWS } from './shading.js';

const canvas = document.getElementById('stage');
const status = document.getElementById('status');
const params = new URLSearchParams(location.search);
// #wheel-orangeV3 style links (hosts that drop the query string still pass a plain #anchor)
{
  const m = /^#(wheel|orb|solo)-(\w+)$/.exec(location.hash);
  if (m) { params.set('character', m[2]); if (m[1] !== 'solo') params.set(m[1], '1'); }
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const character = CHARACTERS[params.get('character')] ? params.get('character') : 'orange';

// opaque canvas: dot fragments write alpha < 1, which an alpha canvas would composite washed-out
const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 1);
const stage = new HamsterStage(renderer, { character, orb: params.get('orb') === '1' || params.get('wheel') === '1', wheel: params.get('wheel') === '1', reducedMotion, time: Number(params.get('t') || 0) });
if (params.has('view')) {
  stage.orbit.yaw = stage.orbit.home.yaw = VIEWS[params.get('view')] ?? VIEWS.side;
}
if (params.get('paused') === '1') { stage.paused = true; stage.intro.v = 1; }
// ?zoom=2.5&focusX=1.0&focusY=0.25: close-up capture of a region (QA)
if (params.has('zoom')) {
  const z = Number(params.get('zoom')), fx = Number(params.get('focusX') || 0), fy = Number(params.get('focusY') || 0);
  stage.ready.then(() => { stage.zoom = { z, fx, fy }; stage._applySize(); });
}
if (params.get('run') === '0') stage.setRunning(false);
if (params.get('auto') === '0' || params.get('paused') === '1') stage.setAutoOrbit(false);
stage.orbit.attach(canvas);

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
  stage.resize(innerWidth, innerHeight, dpr);
}
addEventListener('resize', resize);
resize();

// ---- minimal controls
const ui = document.getElementById('ui');
const press = (sel, on) => document.querySelectorAll(sel).forEach((b) => b.setAttribute('aria-pressed', String(on(b))));
ui.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.view) {
    stage.orbit.home.yaw = VIEWS[b.dataset.view];
    stage.orbit.reset();
    press('[data-view]', (x) => x === b);
  }
  if (b.id === 'run') { stage.setRunning(!stage.running); b.setAttribute('aria-pressed', String(stage.running)); }
  if (b.id === 'auto') { stage.setAutoOrbit(!stage.orbit.auto); b.setAttribute('aria-pressed', String(stage.orbit.auto)); }
  if (b.dataset.mode) { stage.setMode(b.dataset.mode); press('[data-mode]', (x) => x.dataset.mode === stage.mode); }
});
document.getElementById('run').setAttribute('aria-pressed', String(stage.running));
document.getElementById('auto').setAttribute('aria-pressed', String(stage.orbit.auto));
if (params.get('mode') === 'ascii') { stage.setMode('ascii'); press('[data-mode]', (x) => x.dataset.mode === 'ascii'); }
addEventListener('keydown', (e) => {
  if (e.key === ' ') { e.preventDefault(); document.getElementById('run').click(); }
  if (e.key === 'a' || e.key === 'A') stage.setMode(stage.mode === 'ascii' ? 'dots' : 'ascii');
  if (e.key === 'r' || e.key === 'R') stage.orbit.reset();
  if (e.key === 'ArrowLeft') stage.orbit.nudge(-1.2, 0);
  if (e.key === 'ArrowRight') stage.orbit.nudge(1.2, 0);
  if (e.key === 'ArrowUp') stage.orbit.nudge(0, -0.8);
  if (e.key === 'ArrowDown') stage.orbit.nudge(0, 0.8);
});

// ---- loop (paused while the tab is hidden)
let raf = 0, prev = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, prev ? (now - prev) / 1000 : 0);
  prev = now;
  stage.update(dt);
  stage.render();
}
const start = () => { if (!raf) { prev = 0; raf = requestAnimationFrame(frame); } };
const stop = () => { cancelAnimationFrame(raf); raf = 0; };
document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
if (!document.hidden) start();

window.__stage = stage; // read-only QA hook (tools/browser-test.cjs)
stage.ready.then(() => {
  status.remove();
  canvas.dataset.particles = String(stage.particleCount);
});

addEventListener('pagehide', () => {
  stop();
  stage.dispose();
  renderer.dispose();
});
