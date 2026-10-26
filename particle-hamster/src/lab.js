// Texture lab: one full-window stage inside the approved wheel, one renderer, one rAF loop. The top
// picker swaps the character/technique in place (stage.setVariant); the old GPU buffers are disposed.
// Links: #lab-<variantId>  ·  ?variant=<id>&view=side&t=0.2&paused=1&run=0&auto=0 (captures)
import * as THREE from 'three';
import { HamsterStage } from './stage.js';
import { VIEWS } from './shading.js';
import { LAB_VARIANTS } from './labVariants.js';

const canvas = document.getElementById('stage');
const status = document.getElementById('status');
const info = document.getElementById('info');
const picker = document.getElementById('picker');
const params = new URLSearchParams(location.search);
const byId = Object.fromEntries(LAB_VARIANTS.map((v) => [v.id, v]));
const fromHash = () => byId[/^#lab-(\w+)$/.exec(location.hash)?.[1]];
let variant = fromHash() || byId[params.get('variant')] || LAB_VARIANTS[0];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 1);
const stage = new HamsterStage(renderer, { character: variant.character, variant, orb: true, wheel: true, reducedMotion, time: Number(params.get('t') || 0) });
if (params.has('view') && VIEWS[params.get('view')] !== undefined) {
  stage.orbit.yaw = stage.orbit.home.yaw = VIEWS[params.get('view')];
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === params.get('view'))));
}
if (params.get('paused') === '1') { stage.paused = true; stage.intro.v = 1; }
if (params.get('run') === '0') stage.setRunning(false);
if (params.get('auto') === '0' || params.get('paused') === '1') stage.setAutoOrbit(false);
const detachOrbit = stage.orbit.attach(canvas);

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  stage.resize(innerWidth, innerHeight, dpr);
}
addEventListener('resize', resize);
resize();

// ---- variant picker
const press = (sel, on) => document.querySelectorAll(sel).forEach((b) => b.setAttribute('aria-pressed', String(on(b))));
for (const v of LAB_VARIANTS) {
  const b = document.createElement('button');
  b.dataset.variant = v.id;
  b.textContent = v.label;
  picker.append(b);
}
function describe() {
  const n = stage.hamster?.particleCount ?? 0;
  const unit = variant.render === 'voxel' ? 'voxels' : variant.render === 'mesh' ? 'triangles' : 'dots';
  info.textContent = `${variant.label}${variant.note ? ` (${variant.note})` : ''} · ${n.toLocaleString('en')} ${unit}${stage.mode === 'ascii' ? ' · ASCII glyphs (EXPERIMENTAL)' : ''}`;
  canvas.dataset.particles = String(stage.particleCount);
  canvas.dataset.variant = variant.id;
}
function choose(v) {
  variant = v;
  press('[data-variant]', (x) => x.dataset.variant === v.id);
  info.textContent = `${v.label} · building…`;
  stage.setVariant(v.character, v).then(() => { if (variant === v) describe(); });
  if (location.hash !== `#lab-${v.id}`) history.replaceState(null, '', `#lab-${v.id}`);
}
picker.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) choose(byId[b.dataset.variant]); });
addEventListener('hashchange', () => { const v = fromHash(); if (v && v !== variant) choose(v); });
press('[data-variant]', (x) => x.dataset.variant === variant.id);

// ---- bottom controls
const runBtn = document.getElementById('run'), pauseBtn = document.getElementById('pause'), autoBtn = document.getElementById('auto');
const sync = () => {
  runBtn.setAttribute('aria-pressed', String(stage.running));
  pauseBtn.setAttribute('aria-pressed', String(stage.paused));
  pauseBtn.textContent = stage.paused ? 'Play' : 'Pause';
  autoBtn.setAttribute('aria-pressed', String(stage.orbit.auto));
};
const setMode = (m) => { stage.setMode(m); press('[data-mode]', (x) => x.dataset.mode === m); describe(); };
document.getElementById('ui').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.view) {
    stage.orbit.home.yaw = VIEWS[b.dataset.view];
    stage.orbit.reset();
    press('[data-view]', (x) => x === b);
  }
  if (b === runBtn) stage.setRunning(!stage.running);
  if (b === pauseBtn) stage.paused = !stage.paused; // freezes the run clock, wheel and blink; orbit still works
  if (b === autoBtn) stage.setAutoOrbit(!stage.orbit.auto);
  if (b.dataset.mode) setMode(b.dataset.mode);
  sync();
});
if (params.get('mode') === 'ascii') setMode('ascii');
sync();
addEventListener('keydown', (e) => {
  if (e.key === ' ') { e.preventDefault(); runBtn.click(); }
  if (e.key === 'p' || e.key === 'P') pauseBtn.click();
  if (e.key === 'a' || e.key === 'A') setMode(stage.mode === 'ascii' ? 'dots' : 'ascii');
  if (e.key === 'r' || e.key === 'R') stage.orbit.reset();
  if (e.key === 'ArrowLeft') stage.orbit.nudge(-1.2, 0);
  if (e.key === 'ArrowRight') stage.orbit.nudge(1.2, 0);
});

// ---- the one loop. The pose is a pure function of the run clock, so a clamped dt (max 50 ms) gives
// stable animation: a slow or dropped frame just advances the clock, it never accumulates error.
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

window.__stage = stage; // read-only QA hook
window.__lab = { choose: (id) => choose(byId[id]), variants: LAB_VARIANTS.map((v) => v.id) };
stage.ready.then(() => { status.remove(); describe(); });

addEventListener('pagehide', () => {
  stop();
  detachOrbit();
  stage.dispose();
  renderer.dispose();
});
