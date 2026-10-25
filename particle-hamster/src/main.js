// Preview page: one renderer, one rAF loop, drag-to-rotate with inertia, settles back to
// the hero side pose. Query params for repeatable captures: ?view=front&t=0.2&paused=1&run=0
import * as THREE from 'three';
import { animate } from 'motion';
import { ParticleHamster } from './ParticleHamster.js';
import { CAMERA, VIEWS } from './shading.js';

const canvas = document.getElementById('stage');
const status = document.getElementById('status');
const params = new URLSearchParams(location.search);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 50);
const pivot = new THREE.Group(); // rotation.x = pitch, rotation.y = yaw (Euler XYZ = Rx * Ry)
pivot.position.y = CAMERA.lookY;
scene.add(pivot);

let hamster = null;
let running = !reducedMotion && params.get('run') !== '0';
let paused = params.get('paused') === '1';
let clockT = Number(params.get('t') || 0);
const view = { yaw: VIEWS[params.get('view')] ?? VIEWS.side, pitch: CAMERA.pitch, vel: 0, pinned: params.has('view') };
const runBlend = { v: running ? 1 : 0 };
const intro = { v: reducedMotion || paused ? 1 : 0 };
let lastInput = -Infinity;

function resize() {
  const w = innerWidth, h = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // keep ~3.3 world units of hamster in frame on narrow screens too
  const fit = 1.75 / (Math.tan((CAMERA.fov * Math.PI) / 360) * camera.aspect);
  camera.position.set(0, 0, Math.max(CAMERA.distance, fit));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  hamster?.setPointScale(h * dpr, CAMERA.fov, dpr);
}
addEventListener('resize', resize);
resize();

// ---- drag / touch rotation with inertia
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, t: performance.now() };
  view.vel = 0;
  view.pinned = false;
  view.target = undefined;
  setPressed(null);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const now = performance.now();
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  const k = 4.2 / Math.max(320, Math.min(innerWidth, innerHeight));
  view.yaw += dx * k;
  view.pitch = THREE.MathUtils.clamp(view.pitch + dy * k * 0.7, -0.55, 0.8);
  view.vel = THREE.MathUtils.lerp(view.vel, (dx * k) / Math.max(1, now - drag.t) * 1000, 0.5);
  drag = { x: e.clientX, y: e.clientY, t: now };
  lastInput = now;
});
const endDrag = () => { drag = null; lastInput = performance.now(); };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// ---- view chips + run toggle
const chips = [...document.querySelectorAll('#ui [data-view]')];
const runBtn = document.getElementById('run');
function setPressed(name) {
  for (const c of chips) c.setAttribute('aria-pressed', String(c.dataset.view === name));
}
function goTo(name) {
  view.pinned = name !== 'side';
  view.target = VIEWS[name];
  view.vel = 0;
  lastInput = -Infinity;
  setPressed(name);
}
chips.forEach((c) => c.addEventListener('click', () => goTo(c.dataset.view)));
function setRunning(on) {
  running = on;
  runBtn.setAttribute('aria-pressed', String(on));
  animate(runBlend, { v: on ? 1 : 0 }, { duration: reducedMotion ? 0 : 0.6, ease: 'easeInOut' });
}
runBtn.addEventListener('click', () => setRunning(!running));
runBtn.setAttribute('aria-pressed', String(running));
addEventListener('keydown', (e) => {
  const i = '123456'.indexOf(e.key);
  if (i >= 0) goTo(chips[i].dataset.view);
  if (e.key === ' ') { e.preventDefault(); setRunning(!running); }
});
if (params.has('view')) setPressed(params.get('view'));

// ---- loop
let raf = 0, prev = 0;
const nearest = (target, from) => target + Math.round((from - target) / (Math.PI * 2)) * Math.PI * 2;
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, prev ? (now - prev) / 1000 : 0);
  prev = now;
  if (!paused) clockT += dt;

  if (!drag) {
    view.yaw += view.vel * dt;
    view.vel *= Math.exp(-dt * 3.5);
    const idle = now - lastInput > 2200 && Math.abs(view.vel) < 0.15;
    const target = view.target ?? (view.pinned ? null : VIEWS.side);
    if (target != null && (idle || view.target != null)) {
      const tgt = nearest(target, view.yaw);
      const ease = 1 - Math.exp(-dt * (view.target != null ? 5 : 1.8));
      view.yaw += (tgt - view.yaw) * ease;
      view.pitch += (CAMERA.pitch - view.pitch) * ease;
      if (Math.abs(tgt - view.yaw) < 1e-3) { view.yaw = tgt; view.target = view.pinned ? view.target : undefined; }
    }
  }
  pivot.rotation.set(view.pitch, view.yaw, 0);
  hamster?.update(clockT, { run: runBlend.v, assemble: intro.v });
  renderer.render(scene, camera);
}
function start() { if (!raf) { prev = 0; raf = requestAnimationFrame(frame); } }
function stop() { cancelAnimationFrame(raf); raf = 0; }
document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

// ---- build particles off the main thread (falls back to the main thread if workers are blocked)
function onLayers(layers) {
  if (hamster) return;
  hamster = new ParticleHamster(layers);
  pivot.add(hamster);
  resize();
  status.remove();
  canvas.dataset.particles = String(hamster.particleCount);
  if (intro.v < 1) animate(intro, { v: 1 }, { duration: 1.6, ease: [0.22, 1, 0.36, 1] });
}
async function buildOnMainThread() {
  const { buildHamster } = await import('./hamsterModel.js');
  onLayers(buildHamster());
}
try {
  const worker = new Worker(new URL('./buildWorker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => { worker.terminate(); onLayers(e.data); };
  worker.onerror = (e) => { e.preventDefault?.(); worker.terminate(); buildOnMainThread(); };
  worker.postMessage({});
} catch {
  buildOnMainThread();
}
if (!document.hidden) start();

addEventListener('pagehide', () => {
  stop();
  hamster?.dispose();
  renderer.dispose();
});
