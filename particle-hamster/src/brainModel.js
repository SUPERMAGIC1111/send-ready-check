// The 3D Brain character (texture-lab prototype, original geometry). Pure JS, no Three.js, so it
// builds in the worker like the hamsters.
//   - one implicit surface (SDF): ~110 soft lobes smooth-unioned around a core, a longitudinal
//     fissure on top, two big glossy eyes, a smile and two brows
//   - buildBrain(): surface dots in the hamster pack format (D2) and voxel cells (D3)
//   - brainField(): a scalar grid for marching cubes (D1, smooth solid mesh)
// Axes as the hamsters: +X is the face, +Y up, +Z the brain's left. Size ~2.1 wide.
import { mulberry32, KIND, pack } from './hamsterModel.js';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const norm = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export const BRAIN_COLORS = {
  pink: [0.98, 0.5, 0.53],
  crease: [0.8, 0.32, 0.4],
  top: [1.0, 0.66, 0.66],
  sclera: [0.98, 0.98, 0.97],
  pupil: [0.02, 0.02, 0.025],
  line: [0.08, 0.03, 0.04],
};

// ---- lobes: Fibonacci points on an inner ellipsoid, each a soft sphere
const CORE = [0.74, 0.68, 0.9];
const LOBES = (() => {
  const rnd = mulberry32(42), out = [];
  const N = 112, g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - ((i + 0.5) / N) * 2, r = Math.sqrt(1 - y * y), th = g * i;
    const d = [Math.cos(th) * r, y, Math.sin(th) * r];
    // flatter underside, like a brain resting on its base
    const c = [d[0] * CORE[0], d[1] * CORE[1] * (d[1] < 0 ? 0.86 : 1), d[2] * CORE[2]];
    out.push({ c, r: 0.25 * (0.85 + 0.35 * rnd()) });
  }
  return out;
})();

// ---- face: eyes on the front, looking very slightly up
export const EYES = [1, -1].map((s) => {
  const c = [0.74, 0.06, 0.3 * s];
  const look = norm([1, 0.06, -0.04 * s]);
  return { c, r: 0.31, look, pupil: { c: [c[0] + look[0] * 0.17, c[1] + look[1] * 0.17, c[2] + look[2] * 0.17], r: 0.2 }, side: s };
});

// spatial grid of lobes, pre-merged per cell with all neighbours, so a query visits only the
// handful of lobes that can change the blend (lobe radius 0.3 + blend 0.09 < CELL)
const CELL = 0.42, OFF = 6, DIM = 13;
const GRID = new Array(DIM * DIM * DIM);
for (let gx = 0; gx < DIM; gx++) for (let gy = 0; gy < DIM; gy++) for (let gz = 0; gz < DIM; gz++) {
  const cx = (gx - OFF + 0.5) * CELL, cy = (gy - OFF + 0.5) * CELL, cz = (gz - OFF + 0.5) * CELL;
  GRID[gx + gy * DIM + gz * DIM * DIM] = LOBES.filter((L) => Math.abs(L.c[0] - cx) < CELL * 1.5 && Math.abs(L.c[1] - cy) < CELL * 1.5 && Math.abs(L.c[2] - cz) < CELL * 1.5);
}
const EMPTY = [];
function nearLobes(x, y, z) {
  const gx = Math.floor(x / CELL) + OFF, gy = Math.floor(y / CELL) + OFF, gz = Math.floor(z / CELL) + OFF;
  if (gx < 0 || gy < 0 || gz < 0 || gx >= DIM || gy >= DIM || gz >= DIM) return EMPTY;
  return GRID[gx + gy * DIM + gz * DIM * DIM];
}

function lobeField(x, y, z) {
  let d = Math.hypot(x / CORE[0], y / CORE[1], z / CORE[2]) - 1;
  d *= Math.min(CORE[0], CORE[1], CORE[2]);
  let nearest = 1e9;
  // lobes further than a cell away cannot change the blend (radius 0.3 + blend 0.09 < CELL)
  for (const L of nearLobes(x, y, z)) {
    const dl = Math.hypot(x - L.c[0], y - L.c[1], z - L.c[2]) - L.r;
    if (dl < nearest) nearest = dl;
    d = smin(d, dl, 0.09);
  }
  // longitudinal fissure on top and back (not across the face)
  const fis = 0.075 * Math.exp(-((z / 0.065) ** 2)) * smoothstep(-0.05, 0.45, y) * smoothstep(0.75, 0.2, x);
  return { d: d + fis, nearest };
}

/** distance to the brain body (no eyes) */
export const brainBodySdf = (x, y, z) => lobeField(x, y, z).d;

/** full SDF with eyes; .part = 'brain' | 'eye' */
export function brainSdf(x, y, z) {
  const b = lobeField(x, y, z).d;
  let e = 1e9;
  for (const E of EYES) e = Math.min(e, Math.hypot(x - E.c[0], y - E.c[1], z - E.c[2]) - E.r);
  return Math.min(b, e);
}

function gradient(f, x, y, z) {
  const h = 0.002;
  return norm([f(x + h, y, z) - f(x - h, y, z), f(x, y + h, z) - f(x, y - h, z), f(x, y, z + h) - f(x, y, z - h)]);
}

/** project a point onto the brain body along the gradient */
export function projectToBrain(p, iters = 8) {
  let q = p.slice();
  for (let i = 0; i < iters; i++) {
    const d = brainBodySdf(...q);
    const g = gradient(brainBodySdf, ...q);
    q = [q[0] - g[0] * d, q[1] - g[1] * d, q[2] - g[2] * d];
  }
  return q;
}

// ---- face lines (smile + brows) as 3D polylines on the surface, used by every render mode.
// Each point is found along a ray towards the face (-X) instead of along the gradient: the lumpy
// lobes would otherwise pull neighbouring points onto different bumps and kink the line.
function onFront(y, z) {
  let a = 0, b = 1.6;
  for (let it = 0; it < 22; it++) {
    const m = (a + b) / 2;
    if (brainBodySdf(m, y, z) < 0) a = m; else b = m;
  }
  return [a, y, z];
}
export function faceCurves() {
  const curve = (fn, n = 28) => Array.from({ length: n }, (_, i) => { const [y, z] = fn(-1 + (2 * i) / (n - 1)); return onFront(y, z); });
  const smile = curve((u) => [-0.4 + 0.09 * u * u, 0.19 * u]);
  const brows = EYES.map((E) => curve((u) => [E.c[1] + 0.42 + 0.05 * (1 - u * u) + 0.02 * u * E.side, E.c[2] + 0.15 * u], 16));
  return { smile, brows };
}

function distToPolyline(p, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const t = clamp(dot(ap, ab) / (dot(ab, ab) || 1), 0, 1);
    best = Math.min(best, Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t));
  }
  return best;
}

/** colour + kind of a surface point (shared by dots, voxels and mesh vertex colours) */
export function brainShade(p, n, curves) {
  const C = BRAIN_COLORS;
  for (const E of EYES) {
    const v = [p[0] - E.c[0], p[1] - E.c[1], p[2] - E.c[2]];
    if (Math.hypot(...v) < E.r + 0.006) {
      const dir = norm(v), cl = dot(dir, E.look);
      const hl = dot(dir, norm([E.look[0] - 0.15, E.look[1] + 0.5, E.look[2] + 0.18]));
      const hl2 = dot(dir, norm([E.look[0] + 0.25, E.look[1] - 0.25, E.look[2] - 0.15]));
      if (hl > 0.982 || hl2 > 0.996) return { col: [1, 1, 1], kind: KIND.EYE, glow: 1 };
      if (cl > 0.76) return { col: C.pupil, kind: KIND.EYE };
      return { col: C.sclera, kind: KIND.EYE };
    }
  }
  if (distToPolyline(p, curves.smile) < 0.026 || curves.brows.some((b) => distToPolyline(p, b) < 0.024)) return { col: C.line, kind: KIND.FEATURE };
  const { nearest } = lobeField(...p);
  const crease = smoothstep(-0.005, 0.045, nearest);
  let col = mix3(C.pink, C.crease, crease);
  col = mix3(col, C.top, smoothstep(0.3, 1, n[1]) * 0.35 * (1 - crease));
  return { col, kind: KIND.FUR };
}

/**
 * Surface dots of the brain in the hamster pack format (all on the body bone).
 * @param {{spacing?: number, candidates?: number, eyeCandidates?: number, seed?: number, dotScale?: number}} opts
 */
export const BRAIN_MODEL = { sdf: brainSdf, bodySdf: brainBodySdf, eyes: EYES, shade: brainShade, curves: faceCurves };

export function buildBrain({ spacing = 0.022, candidates = 170000, eyeCandidates = 14000, seed = 9, dotScale = 1.7, model = BRAIN_MODEL } = {}) {
  const { sdf: brainSdf, bodySdf: brainBodySdf, eyes: EYES, shade: brainShade } = model;
  const rnd = mulberry32(seed);
  const curves = model.curves();
  const pts = [], grid = new Set();
  const feat = spacing * 0.6;
  for (let i = 0; i < candidates; i++) {
    // a ray from the centre in a random direction; bisect for the outermost surface crossing
    const u = rnd() * 2 - 1, ph = rnd() * Math.PI * 2, rr = Math.sqrt(1 - u * u);
    const dir = [rr * Math.cos(ph), u, rr * Math.sin(ph)];
    let a = 0.2, b = 1.6;
    if (brainSdf(dir[0] * b, dir[1] * b, dir[2] * b) < 0) continue;
    for (let it = 0; it < 18; it++) {
      const m = (a + b) / 2;
      if (brainSdf(dir[0] * m, dir[1] * m, dir[2] * m) < 0) a = m; else b = m;
    }
    // jitter along the surface a little so dots do not line up on rays
    const p = [dir[0] * a, dir[1] * a, dir[2] * a];
    const n = gradient(brainSdf, ...p);
    const sh = brainShade(p, n, curves);
    const s = sh.kind === KIND.FUR ? spacing : feat;
    const key = `${s}|${Math.floor(p[0] / s)},${Math.floor(p[1] / s)},${Math.floor(p[2] / s)}`;
    if (grid.has(key)) continue;
    grid.add(key);
    pts.push({ p, n, col: sh.col, kind: sh.kind, glow: sh.glow || 0, boneA: 0, boneB: 0, w: 0, r: s });
  }
  // the eyes subtend a small solid angle from the centre: sample their spheres directly as well
  for (const E of EYES) {
    for (let i = 0; i < eyeCandidates; i++) {
      const u = rnd() * 2 - 1, ph = rnd() * Math.PI * 2, rr = Math.sqrt(1 - u * u);
      const n = [rr * Math.cos(ph), u, rr * Math.sin(ph)];
      const p = [E.c[0] + n[0] * E.r, E.c[1] + n[1] * E.r, E.c[2] + n[2] * E.r];
      if (brainBodySdf(...p) < 0.004) continue; // buried in the brain
      const sh = brainShade(p, n, curves);
      const key = `${feat}|${Math.floor(p[0] / feat)},${Math.floor(p[1] / feat)},${Math.floor(p[2] / feat)}`;
      if (grid.has(key)) continue;
      grid.add(key);
      pts.push({ p, n, col: sh.col, kind: sh.kind, glow: sh.glow || 0, boneA: 0, boneB: 0, w: 0, r: feat });
    }
  }
  const core = pack(pts, (q) => q.r * dotScale * (q.glow ? 1.3 : 1), () => 0, (q) => q.glow || 0, null, () => 1);
  const fur = pack([], () => 0, () => 0, () => 0, null, () => 1);
  return { id: 'brain', core, fur, counts: { core: pts.length, fur: 0 } };
}

/**
 * Scalar field for marching cubes over [-1,1]^3 scaled by `extent` (brain body only; the eyes
 * and face lines are separate meshes in the smooth render). field > isolation = inside.
 */
export function brainField(res = 72, extent = 1.32, isolation = 80) {
  const f = new Float32Array(res * res * res);
  const half = res / 2;
  for (let z = 0; z < res; z++)
    for (let y = 0; y < res; y++)
      for (let x = 0; x < res; x++) {
        const X = ((x - half) / half) * extent, Y = ((y - half) / half) * extent, Z = ((z - half) / half) * extent;
        f[x + y * res + z * res * res] = isolation - brainBodySdf(X, Y, Z) * 600;
      }
  return { field: f, res, extent, isolation };
}
