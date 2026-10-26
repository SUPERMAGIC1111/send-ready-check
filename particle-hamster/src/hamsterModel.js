// Pure-JS hamster model: implicit (SDF) anatomy driven by a character config (see
// characters.js), dot sampling, fur, a 14-bone rig and the run cycle. No Three.js dependency, so
// the same dot data can be baked in Node (tools/bake.mjs), rendered headlessly, or built in a
// worker in the browser.
//
// Axes: +X forward (runs to the right), +Y up, +Z = near side in the default side view.

import { CHARACTERS } from './characters.js';

// ---------------------------------------------------------------- math helpers
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cheap 3D value noise for fur/colour variation
function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (i, j, k) => hash3(xi + i, yi + j, zi + k);
  return mix(
    mix(mix(c(0, 0, 0), c(1, 0, 0), u), mix(c(0, 1, 0), c(1, 1, 0), u), v),
    mix(mix(c(0, 0, 1), c(1, 0, 1), u), mix(c(0, 1, 1), c(1, 1, 1), u), v),
    w
  );
}

// ---------------------------------------------------------------- rig
export const BONES = ['body', 'head', 'earN', 'earF', 'armN', 'armF', 'legN', 'legF', 'tail', 'cheekN', 'cheekF', 'crown', 'eyeN', 'eyeF'];
const B = Object.fromEntries(BONES.map((n, i) => [n, i]));
const PARENT = BONES.map((n) => B[{ head: 'body', earN: 'head', earF: 'head', cheekN: 'head', cheekF: 'head', crown: 'head', eyeN: 'head', eyeF: 'head' }[n] ?? 'body']);

// material kinds -> fur behaviour and shading
export const KIND = { FUR: 0, WHITE_FUR: 1, SKIN: 2, EYE: 3, FEATURE: 4, MOUTH: 5 };

// ---------------------------------------------------------------- anatomy (SDF primitives)
// 'e' = oriented ellipsoid, 'c' = tapered capsule. k = smooth-union radius with the rest.
function ell(name, bone, c, r, k, basis) {
  const [u, v, w] = basis || [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  return { name, bone: B[bone], type: 'e', c, r, k, u, v, w };
}
function cap(name, bone, a, b, r1, r2, k) {
  return { name, bone: B[bone], type: 'c', a, b, r1, r2, k };
}
const mirror = (v, s) => [v[0], v[1], v[2] * s];
function earBasis(side, facing) {
  const w = norm([facing[0], facing[1], facing[2] * side]);
  const u = norm(cross([0, 1, 0], w));
  return [u, cross(w, u), w];
}
const deg = Math.PI / 180;

/** Build the implicit anatomy for one character config. */
function makeAnatomy(cfg) {
  const A = cfg.anatomy;
  const HC = A.head.c;
  const eyes = [1, -1].map((s) => {
    const az = A.eye.azim * deg, el = A.eye.elev * deg;
    const dir = norm([Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az) * s]);
    return { c: add(HC, dir, A.eye.dist), gaze: dir, look: norm(mirror(A.eye.look, s)), side: s, r: A.eye.r };
  });
  const prims = [
    ell('body', 'body', A.body.c, A.body.r, 0),
    ell('belly', 'body', A.belly.c, A.belly.r, 0.22),
    ell('head', 'head', HC, A.head.r, A.head.k),
    ell('muzzle', 'head', A.muzzle.c, A.muzzle.r, 0.1),
    ell('nose', 'head', A.nose.c, A.nose.r, 0.02),
    ell('tail', 'tail', A.tail.c, A.tail.r, 0.06),
  ];
  for (const s of [1, -1]) {
    const N = s > 0 ? 'N' : 'F';
    prims.push(
      ell('cheek' + N, 'cheek' + N, mirror(A.cheek.c, s), A.cheek.r, A.cheek.k),
      ell('eye' + N, 'eye' + N, eyes[s > 0 ? 0 : 1].c, [A.eye.r, A.eye.r, A.eye.r], 0.02),
      ell('ear' + N, 'ear' + N, mirror(A.ear.c, s), A.ear.r, 0.05, earBasis(s, A.ear.facing)),
      cap('arm' + N, 'arm' + N, mirror(A.arm.a, s), mirror(A.arm.b, s), A.arm.r1, A.arm.r2, 0.1),
      ell('paw' + N, 'arm' + N, mirror(A.paw.c, s), A.paw.r, 0.035),
      cap('leg' + N, 'leg' + N, mirror(A.leg.a, s), mirror(A.leg.b, s), A.leg.r1, A.leg.r2, 0.1),
      ell('foot' + N, 'leg' + N, mirror(A.foot.c, s), A.foot.r, 0.04),
      ell('tooth' + N, 'head', mirror(A.tooth.c, s), A.tooth.r, 0.004)
    );
  }
  const mouth = ell('mouth', 'head', A.mouth.c, A.mouth.r, 0);
  const pivots = BONES.map(() => [0, 0, 0]);
  pivots[B.body] = [A.body.c[0], A.body.c[1] - A.body.r[1] * 0.9, 0]; // squash from the ground
  pivots[B.head] = [HC[0] - 0.2, HC[1] - 0.3, 0];
  pivots[B.tail] = add(A.tail.c, [0.1, 0, 0]);
  pivots[B.crown] = add(HC, [0, A.head.r[1] * 0.85, 0]);
  for (const s of [1, -1]) {
    const N = s > 0 ? 'N' : 'F';
    pivots[B['ear' + N]] = add(mirror(A.ear.c, s), [0, -A.ear.r[1] * 0.8, -0.05 * s]);
    pivots[B['arm' + N]] = mirror(A.arm.a, s);
    pivots[B['leg' + N]] = mirror(A.leg.a, s);
    pivots[B['cheek' + N]] = mirror(A.cheek.c, s);
    pivots[B['eye' + N]] = eyes[s > 0 ? 0 : 1].c;
  }
  // bounding box of the anatomy (rest pose) with a margin
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const p of prims) {
    const pts = p.type === 'e' ? [[p.c, Math.max(...p.r)]] : [[p.a, p.r1], [p.b, p.r2]];
    for (const [c, r] of pts) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], c[k] - r); hi[k] = Math.max(hi[k], c[k] + r); }
  }
  return { HC, eyes, prims, mouth, pivots, bbox: { min: lo.map((v) => v - 0.05), max: hi.map((v) => v + 0.05) } };
}

function primDist(pr, x, y, z) {
  if (pr.type === 'e') {
    const dx = x - pr.c[0], dy = y - pr.c[1], dz = z - pr.c[2];
    const lx = dx * pr.u[0] + dy * pr.u[1] + dz * pr.u[2];
    const ly = dx * pr.v[0] + dy * pr.v[1] + dz * pr.v[2];
    const lz = dx * pr.w[0] + dy * pr.w[1] + dz * pr.w[2];
    const ax = lx / pr.r[0], ay = ly / pr.r[1], az = lz / pr.r[2];
    const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
    const bx = ax / pr.r[0], by = ay / pr.r[1], bz = az / pr.r[2];
    const k1 = Math.sqrt(bx * bx + by * by + bz * bz) || 1e-6;
    return (k0 * (k0 - 1)) / k1;
  }
  const { a, b } = pr;
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const pax = x - a[0], pay = y - a[1], paz = z - a[2];
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - mix(pr.r1, pr.r2, h);
}

/** Field evaluator for one anatomy. sdf() leaves per-primitive distances in .d */
function makeField(anat) {
  const { prims, mouth } = anat;
  const d = new Float64Array(prims.length);
  const isTooth = prims.map((p) => p.name.startsWith('tooth'));
  const state = { d, carve: 1e9, union: 1e9 };
  state.sdf = (x, y, z) => {
    let u = 1e9, teeth = 1e9;
    for (let i = 0; i < prims.length; i++) {
      const di = primDist(prims[i], x, y, z);
      d[i] = di;
      if (isTooth[i]) teeth = Math.min(teeth, di);
      else u = i === 0 ? di : smin(u, di, prims[i].k);
    }
    state.union = u;
    state.carve = primDist(mouth, x, y, z);
    // carve the open mouth, then hang the two little teeth from its upper lip
    return Math.min(Math.max(u, -state.carve), teeth);
  };
  state.gradient = (x, y, z) => {
    const e = 0.002, f = state.sdf;
    return norm([f(x + e, y, z) - f(x - e, y, z), f(x, y + e, z) - f(x, y - e, z), f(x, y, z + e) - f(x, y, z - e)]);
  };
  state.label = () => {
    let best = 0;
    for (let i = 1; i < prims.length; i++) if (d[i] < d[best]) best = i;
    return best;
  };
  return state;
}

// ---------------------------------------------------------------- colour regions
function makeShader(cfg, anat) {
  const C = cfg.palette, R = cfg.regions;
  const { HC, eyes, mouth } = anat;
  const P = Object.fromEntries(anat.prims.map((p, i) => [p.name, p]));
  return (name, p, n, rnd) => {
    const [x, y, z] = p;
    const jitter = (noise3(x * 9, y * 9, z * 9) - 0.5) * 0.12;
    const furTone = () => {
      const t = noise3(x * 4 + 3, y * 4, z * 4), u = noise3(x * 11, y * 11 + 5, z * 11);
      const [a, b, c, d] = C.fur;
      let col = t < 0.35 ? mix3(a, b, t / 0.35) : t < 0.7 ? mix3(b, c, (t - 0.35) / 0.35) : mix3(c, d, (t - 0.7) / 0.3);
      col = mix3(col, C.furAccent, smoothstep(0.6, 0.95, u) * 0.5);
      // sunlit top, slightly deeper toward the rump
      col = mix3(col, C.furHi, smoothstep(0.5, 1, n[1]) * 0.35);
      col = mix3(col, C.fur[0], smoothstep(0.3, 0.9, -n[0]) * 0.2);
      return col;
    };
    const creamTone = () => mix3(C.ivory, C.cream, noise3(x * 5, y * 5, z * 5 + 7));
    const orange = (fur = 1) => ({ col: furTone(), kind: KIND.FUR, fur });
    const cream = (fur = 1) => ({ col: creamTone(), kind: KIND.WHITE_FUR, fur });
    // soft boundary: dots in the transition band mix both colours, so patches never have a hard edge
    const blend = (w, fur = 1) => {
      if (w <= 0.001) return orange(fur);
      if (w >= 0.999) return cream(fur);
      return { col: mix3(furTone(), creamTone(), w), kind: w > 0.5 ? KIND.WHITE_FUR : KIND.FUR, fur };
    };

    if (name === 'mouth') {
      // inside of the open smile: pink tongue in the lower part, warm rose above (never black)
      if (y < mouth.c[1] - mouth.r[1] * 0.15) return { col: C.tongue, kind: KIND.MOUTH, fur: 0 };
      return { col: C.mouthIn, kind: KIND.MOUTH, fur: 0 };
    }
    if (name.startsWith('eye')) {
      const eye = eyes[name === 'eyeN' ? 0 : 1];
      const dir = norm([x - eye.c[0], y - eye.c[1], z - eye.c[2]]);
      const cl = dot(dir, eye.look);
      // glossy bead eye: dark iris filling the visible cap, warmer toward the bottom, big catch-light
      const h1 = dot(dir, norm([eye.look[0] - 0.2, eye.look[1] + 0.55, eye.look[2] + 0.05 * eye.side]));
      const h2 = dot(dir, norm([eye.look[0] + 0.25, eye.look[1] - 0.35, eye.look[2] - 0.1 * eye.side]));
      if (h1 > cfg.eye.catch1 || h2 > cfg.eye.catch2) return { col: [1, 1, 1], kind: KIND.EYE, fur: 0, glow: 1 };
      if (cl > 0.86) return { col: C.pupil, kind: KIND.EYE, fur: 0 };
      if (cl > cfg.eye.irisCos) return { col: mix3(C.iris, C.irisLight, smoothstep(0.1, -0.6, dot(dir, [0, 1, 0])) * 0.9), kind: KIND.EYE, fur: 0 };
      return { col: C.sclera, kind: KIND.EYE, fur: 0 };
    }
    if (name === 'nose') return { col: mix3(C.pink, C.pinkDeep, smoothstep(0.3, -0.6, n[1]) * 0.6), kind: KIND.SKIN, fur: 0 };
    if (name.startsWith('tooth')) return { col: C.tooth, kind: KIND.FEATURE, fur: 0 };
    if (name.startsWith('paw') || name.startsWith('foot')) {
      const toe = noise3(x * 28, y * 28, z * 28) > 0.64;
      return { col: toe ? C.pinkDeep : mix3(C.pink, [1, 0.78, 0.78], rnd() * 0.4), kind: KIND.SKIN, fur: 0 };
    }
    if (name.startsWith('ear')) {
      const pr = P[name];
      const dx = x - pr.c[0], dy = y - pr.c[1], dz = z - pr.c[2];
      const lu = (dx * pr.u[0] + dy * pr.u[1] + dz * pr.u[2]) / pr.r[0];
      const lv = (dx * pr.v[0] + dy * pr.v[1] + dz * pr.v[2]) / pr.r[1];
      const lw = dx * pr.w[0] + dy * pr.w[1] + dz * pr.w[2];
      if (lw > 0 && Math.hypot(lu, lv + 0.06) < 0.72) return { col: mix3(C.pink, C.earInner, smoothstep(0.7, 0.1, Math.hypot(lu, lv))), kind: KIND.SKIN, fur: 0 };
      return orange(0.3);
    }
    // soft dark rim around each eye (like the references' lash line) so the bead reads
    for (const e of eyes) {
      const de = dist(p, e.c);
      if (de < e.r + cfg.eye.rim && dot(n, e.gaze) > -0.3) return { col: C.eyeRim, kind: KIND.FEATURE, fur: 0 };
    }
    if (name === 'muzzle') return cream(0.25);
    if (name.startsWith('cheek')) {
      // cream on the lower front of the cheek, sloping down and back into the chest (like the references)
      const w = smoothstep(R.cheekCream - 0.25, R.cheekCream + 0.12, n[0] * 0.75 - n[1] * 0.65 + 0.15 + jitter);
      const c = blend(w, R.cheekFur);
      // a soft rosy blush on the front of each puffy cheek
      const pr = P[name];
      const bc = [pr.c[0] + pr.r[0] * 0.7, pr.c[1] + pr.r[1] * 0.15, pr.c[2] * 1.05];
      const blush = smoothstep(0.24, 0.06, dist(p, bc)) * (R.blush || 0) * w;
      return { ...c, col: mix3(c.col, C.blush || C.pink, blush) };
    }
    if (name === 'head') {
      const blaze = Math.abs(z) < R.blaze[0] + R.blaze[1] * smoothstep(HC[1] + 0.15, HC[1] - 0.25, y) + jitter * 0.4 && n[0] > 0.3 && y < HC[1] + R.blaze[2];
      if (blaze || (y < HC[1] - R.chin + jitter && x > HC[0])) return cream(0.6);
      return orange(n[1] > 0.6 ? 1.1 : 1.0);
    }
    if (name === 'body' || name === 'belly') {
      const [b0, b1, b2, zMax] = R.belly;
      const line = b0 + b1 * (x - b2) + jitter - y; // > 0 below the belly line
      const w = Math.max(
        smoothstep(-0.45, -0.75, n[1]),
        smoothstep(-0.06, 0.1, line) * smoothstep(zMax + 0.12, zMax - 0.08, Math.abs(z) - jitter) * smoothstep(-0.5, -0.25, x)
      );
      const rump = smoothstep(-0.4, -0.85, x);
      return blend(w, w > 0.5 ? 1.1 : 1.0 + 0.25 * rump);
    }
    if (name.startsWith('arm')) return orange(0.55);
    if (name.startsWith('leg')) return orange(0.6);
    if (name === 'tail') return orange(0.9);
    return orange();
  };
}

// ---------------------------------------------------------------- dot sampling
/**
 * Build the dot cloud for a character in the rest pose.
 * The anatomy surface is densely sampled, then thinned with one random dot per grid cell
 * (stratified, organic but even), finer on facial features so eyes, nose and smile read.
 * Fur is a soft fuzzy shell of loose dots plus a few curved crown locks.
 * @param {object|string} character config from characters.js, or its id
 * @returns {{core: Layer, fur: Layer, depth?: Layer, counts: object, id: string}}
 */
export function buildHamster(character = 'orange', { depthCloud = false, seed = 7 } = {}) {
  const cfg = typeof character === 'string' ? CHARACTERS[character] : character;
  const anat = makeAnatomy(cfg);
  const F = makeField(anat);
  const shade = makeShader(cfg, anat);
  const rnd = mulberry32(seed);
  const D = cfg.dots;

  // near-surface cells to sample from
  const { min, max } = anat.bbox;
  const res = [0, 1, 2].map((k) => Math.ceil((max[k] - min[k]) / 0.04));
  const size = [0, 1, 2].map((k) => (max[k] - min[k]) / res[k]);
  const cells = [];
  const diag = Math.hypot(...size);
  for (let i = 0; i < res[0]; i++)
    for (let j = 0; j < res[1]; j++)
      for (let k = 0; k < res[2]; k++) {
        const x = min[0] + (i + 0.5) * size[0], y = min[1] + (j + 0.5) * size[1], z = min[2] + (k + 0.5) * size[2];
        if (Math.abs(F.sdf(x, y, z)) < diag * 0.75) cells.push(x - size[0] / 2, y - size[1] / 2, z - size[2] / 2);
      }
  const nCells = cells.length / 3;

  const eyeRimR = Math.max(...anat.eyes.map((e) => e.r)) + cfg.eye.rim + 0.06;
  const isFace = (p, boneB) => boneB === B.head || boneB === B.cheekN || boneB === B.cheekF || boneB === B.eyeN || boneB === B.eyeF
    ? p[0] > anat.HC[0] + 0.1 && p[1] > anat.HC[1] - 0.55 : false;
  const spacingOf = (pt) => {
    if (pt.kind === KIND.EYE || pt.kind === KIND.FEATURE || pt.kind === KIND.MOUTH || pt.name === 'nose') return D.feature;
    if (pt.kind === KIND.SKIN) return D.skin;
    if (isFace(pt.p, pt.boneB) || anat.eyes.some((e) => dist(pt.p, e.c) < eyeRimR)) return D.face;
    if (pt.kind === KIND.WHITE_FUR) return D.cream;
    return D.body;
  };

  // grids per spacing class: keep the first (random) candidate that lands in each cell
  const grids = new Map();
  const core = [];
  const candidates = Math.round(D.candidates);
  let tries = 0;
  while (tries++ < candidates) {
    const c = Math.floor(rnd() * nCells) * 3;
    let x = cells[c] + rnd() * size[0], y = cells[c + 1] + rnd() * size[1], z = cells[c + 2] + rnd() * size[2];
    let d = F.sdf(x, y, z);
    if (Math.abs(d) > 0.02) continue;
    const g = F.gradient(x, y, z);
    x -= g[0] * d; y -= g[1] * d; z -= g[2] * d; // one Newton step onto the surface
    d = F.sdf(x, y, z);
    if (Math.abs(d) > 0.004) continue;
    let label = F.label();
    let name = anat.prims[label].name;
    if (!name.startsWith('tooth') && -F.carve > F.union - 0.004) { label = 2; name = 'mouth'; } // 2 = head
    const n = g;
    const pr = anat.prims[label];
    // skin weight between the primitive's bone and its parent
    let boneA = 0, boneB = 0, w = 0;
    if (pr.bone !== B.body) {
      boneB = pr.bone;
      boneA = PARENT[boneB];
      let dSelf = 1e9, dPar = 1e9;
      for (let i = 0; i < anat.prims.length; i++) {
        if (anat.prims[i].bone === boneB) dSelf = Math.min(dSelf, F.d[i]);
        else if (anat.prims[i].bone === boneA) dPar = Math.min(dPar, F.d[i]);
      }
      const band = boneB === B.head ? 0.22 : boneB === B.eyeN || boneB === B.eyeF ? 0.01 : boneB === B.cheekN || boneB === B.cheekF ? 0.14 : 0.09;
      w = name === 'mouth' ? 1 : smoothstep(-band * 0.5, band, dPar - dSelf);
    }
    const reg = shade(name, [x, y, z], n, rnd);
    const pt = { p: [x, y, z], n, col: reg.col, kind: reg.kind, fur: reg.fur, glow: reg.glow || 0, boneA, boneB, w, name };
    const s = (pt.r = spacingOf(pt));
    let grid = grids.get(s);
    if (!grid) grids.set(s, (grid = new Set()));
    const key = `${Math.floor(x / s)},${Math.floor(y / s)},${Math.floor(z / s)}`;
    if (grid.has(key)) continue;
    grid.add(key);
    core.push(pt);
  }

  // ---- fur: a soft fuzzy shell of loose dots (no straight quills) + curved crown locks
  const fur = [];
  const furry = core.filter((pt) => pt.fur > 0);
  const nearFeature = (p) => {
    let m = 1;
    for (const e of anat.eyes) m = Math.min(m, smoothstep(e.r + 0.03, e.r + 0.18, dist(p, e.c)));
    m = Math.min(m, smoothstep(0.12, 0.3, dist(p, anat.mouth.c)), smoothstep(0.06, 0.2, dist(p, anat.prims[4].c)));
    return m;
  };
  const combDir = (pt) => {
    const { p, n } = pt;
    const f = 3.5;
    const comb = [noise3(p[0] * f, p[1] * f, p[2] * f) - 0.5, noise3(p[0] * f + 11, p[1] * f, p[2] * f) - 0.5, noise3(p[0] * f, p[1] * f + 23, p[2] * f) - 0.5];
    const flow = pt.name.startsWith('cheek') ? [-0.6, -0.5, 0] : pt.kind === KIND.WHITE_FUR ? [-0.3, -1, 0] : [-1, -0.25, 0];
    return norm([0, 1, 2].map((k) => n[k] + flow[k] * cfg.fur.lay + comb[k] * 0.9 + (rnd() - 0.5) * 0.4));
  };
  const furTip = (pt) => (pt.kind === KIND.FUR ? mix3(pt.col, cfg.palette.furTip, 0.35 + rnd() * 0.35) : mix3(pt.col, cfg.palette.ivory, 0.3));
  for (let s = 0; s < cfg.fur.fluff && furry.length; s++) {
    const root = furry[Math.floor(rnd() * furry.length)];
    const len = cfg.fur.len * root.fur * nearFeature(root.p) * (0.45 + rnd() * 0.75);
    if (len < 0.02) continue;
    const dir = combDir(root);
    const u = Math.pow(rnd(), 0.8);
    fur.push({
      p: [0, 1, 2].map((k) => root.p[k] + dir[k] * len * u - (k === 1 ? 0.3 * len * u * u : 0)),
      n: root.n, col: mix3(root.col, furTip(root), u), kind: root.kind,
      boneA: root.boneA, boneB: root.boneB, w: root.w,
      t: u, fleck: rnd() < 0.03 ? 1 : 0, seed: rnd(), size: D.fluffSize * (1 - 0.35 * u), alpha: 0.95 - 0.45 * u,
    });
  }
  // crown locks: soft curved bundles of dots on top of the head, swaying with the crown bone
  const CR = cfg.fur.crown;
  const top = add(anat.HC, [CR.offset[0], anat.prims[2].r[1] * 0.92 + CR.offset[1], 0]);
  for (let l = 0; l < CR.locks; l++) {
    const a = (l / CR.locks - 0.5) * CR.fan + (rnd() - 0.5) * 0.25;
    const base = add(top, [Math.sin(a * 0.6) * 0.12 + (rnd() - 0.5) * 0.1, -Math.abs(a) * 0.05, Math.sin(a) * 0.16]);
    const lean = norm([CR.lean[0] + (rnd() - 0.5) * CR.mess, 1, Math.sin(a) * 0.8 + (rnd() - 0.5) * CR.mess]);
    const len = CR.len * (0.7 + rnd() * 0.5);
    const tipCol = mix3(cfg.palette.furHi, cfg.palette.furTip, rnd());
    for (let k = 0; k < CR.dots; k++) {
      const t = Math.pow(k / (CR.dots - 1), 0.9);
      const curl = CR.curl * t * t;
      const spread = CR.spread * (1 - t * 0.85);
      const p = [
        base[0] + lean[0] * len * t + curl + (rnd() - 0.5) * spread,
        base[1] + lean[1] * len * t - Math.abs(curl) * 0.4 + (rnd() - 0.5) * spread,
        base[2] + lean[2] * len * t + (rnd() - 0.5) * spread,
      ];
      fur.push({
        p, n: norm([lean[0], 1, lean[2]]), col: mix3(cfg.palette.fur[2], tipCol, t), kind: KIND.FUR,
        boneA: B.head, boneB: B.crown, w: smoothstep(0, 0.6, t),
        t, fleck: 0, seed: rnd(), size: D.fluffSize * (1.1 - 0.5 * t), alpha: 0.95 - 0.35 * t,
      });
    }
  }

  for (const pt of core) if (!pt.glow && pt.kind <= KIND.WHITE_FUR && rnd() < 0.025) pt.sparkle = 1;
  // cream dots a touch larger: less black between bright dots, so pale fur reads soft, not grainy
  const sizeOf = (pt) => (pt.glow ? 1.25 : pt.sparkle ? 1.35 : pt.kind === KIND.WHITE_FUR ? 1.08 : 1) * pt.r * D.dotScale;
  const out = {
    id: cfg.id,
    core: pack(core, sizeOf, () => 0, (pt) => pt.glow || pt.sparkle || 0, null, () => 1),
    fur: pack(fur, (pt) => pt.size, (pt) => pt.t, (pt) => pt.fleck, (pt) => pt.seed, (pt) => pt.alpha),
    counts: { core: core.length, fur: fur.length },
  };
  if (depthCloud) out.depth = pack(core, () => D.body * 1.2, () => 0, () => 0, null, () => 1);
  return out;
}

function pack(list, sizeOf, tOf, flagOf, seedOf, alphaOf) {
  const n = list.length;
  const L = {
    count: n,
    position: new Float32Array(n * 3),
    normal: new Float32Array(n * 3),
    color: new Float32Array(n * 3),
    size: new Float32Array(n),
    boneA: new Float32Array(n),
    boneB: new Float32Array(n),
    weight: new Float32Array(n),
    kind: new Float32Array(n),
    strandT: new Float32Array(n),
    flag: new Float32Array(n),
    seed: new Float32Array(n),
    alpha: new Float32Array(n),
  };
  const r = mulberry32(99);
  list.forEach((pt, i) => {
    L.position.set(pt.p, i * 3);
    L.normal.set(pt.n, i * 3);
    L.color.set(pt.col.map((c) => clamp(c, 0, 1)), i * 3);
    L.size[i] = sizeOf(pt) * (0.8 + r() * 0.4);
    L.boneA[i] = pt.boneA;
    L.boneB[i] = pt.boneB;
    L.weight[i] = pt.w;
    L.kind[i] = pt.kind;
    L.strandT[i] = tOf(pt);
    L.flag[i] = flagOf(pt);
    L.seed[i] = seedOf ? seedOf(pt) : r();
    L.alpha[i] = alphaOf(pt);
  });
  return L;
}

// ---------------------------------------------------------------- pose / run cycle
// column-major 4x4 helpers (same layout as WebGL / THREE.Matrix4.elements)
const I4 = () => new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
function mul(a, b) {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
function T(x, y, z) {
  const m = I4();
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}
function S(x, y, z) {
  const m = I4();
  m[0] = x; m[5] = y; m[10] = z;
  return m;
}
function R(ax, ay, az) {
  // R = Rz * Ry * Rx
  const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
  const m = I4();
  m[0] = cz * cy; m[1] = sz * cy; m[2] = -sy;
  m[4] = cz * sy * sx - sz * cx; m[5] = sz * sy * sx + cz * cx; m[6] = cy * sx;
  m[8] = cz * sy * cx + sz * sx; m[9] = sz * sy * cx - cz * sx; m[10] = cy * cx;
  return m;
}
// rotate (and optionally scale) about a pivot, then offset
const about = (pv, rot, extra = [0, 0, 0], scale) =>
  mul(T(pv[0] + extra[0], pv[1] + extra[1], pv[2] + extra[2]), mul(scale ? mul(rot, S(...scale)) : rot, T(-pv[0], -pv[1], -pv[2])));

const _anatCache = new Map();
const anatomyOf = (cfg) => {
  if (!_anatCache.has(cfg.id)) _anatCache.set(cfg.id, makeAnatomy(cfg));
  return _anatCache.get(cfg.id);
};

/** stride length (seconds) of a character's run */
export const runPeriod = (character = 'orange') => (typeof character === 'string' ? CHARACTERS[character] : character).run.period;
export const RUN_PERIOD = runPeriod('orange');

// smooth periodic "event" envelope: 0 most of the time, a short bump every `every` seconds
const bump = (t, every, dur, offset = 0) => {
  const x = (((t + offset) % every) + every) % every;
  return x < dur ? Math.sin((x / dur) * Math.PI) : 0;
};

/**
 * Skinning matrices for every bone at time t (seconds).
 * run: 0 = standing/idle, 1 = full run (blendable). The cycle loops exactly every run.period.
 * @returns {Float32Array} BONES.length * 16
 */
export function poseMatrices(t, run = 1, out = new Float32Array(BONES.length * 16), character = 'orange') {
  const cfg = typeof character === 'string' ? CHARACTERS[character] : character;
  const M = cfg.run, PV = anatomyOf(cfg).pivots;
  const ph = (t / M.period) * Math.PI * 2;
  const breathe = Math.sin(t * 2.2) * 0.012 * (1 - run);
  const bounce = 0.5 - 0.5 * Math.cos(2 * ph - 0.6);
  // squash on landing, stretch at the top (volume roughly preserved)
  const sq = run * M.squash * Math.cos(2 * ph - 0.6);
  const rot = [];
  rot[B.body] = about(PV[B.body], R(0, 0, run * M.pitch * Math.sin(ph + 0.5)), [0, run * M.bounce * bounce + breathe, 0], [1 + sq * 0.5, 1 - sq, 1 + sq * 0.5]);
  // head: follow-through lag, plus a personality tilt (roll) and a slow curious turn
  const tilt = M.tilt * Math.sin(t * M.tiltSpeed) + M.tilt * 0.6 * bump(t, M.tiltEvery, 1.6, 0.5);
  rot[B.head] = about(PV[B.head], R(tilt, M.turn * Math.sin(t * 0.7), -run * M.headLag * Math.sin(ph - 0.2) + 0.02 * (1 - run) * Math.sin(t * 0.9)), [0, -run * 0.025 * bounce, 0]);
  const earLag = Math.sin(2 * ph - 1.8);
  const perk = M.earPerk * bump(t, M.expressionEvery, 1.2, 0.3);
  rot[B.earN] = about(PV[B.earN], R(run * 0.1 * earLag, 0, run * (M.earFlop + 0.12 * earLag) - perk));
  rot[B.earF] = about(PV[B.earF], R(-run * 0.1 * earLag, 0, run * (M.earFlop + 0.12 * earLag) - perk));
  for (const [bone, off] of [[B.legN, 0], [B.legF, Math.PI * 0.62]]) {
    const a = Math.sin(ph + off);
    const ang = run * (M.legAmp * a - 0.15);
    // a rigid leg swinging about the hip would arc the foot into the belly; drop the bone by the
    // arc height (a cheap knee) and lift only during the forward recovery swing
    const lift = Math.max(0, Math.cos(ph + off));
    const drop = 0.6 * (1 - Math.cos(ang));
    rot[bone] = about(PV[bone], R(0, 0, ang), [run * 0.04 * a, run * 0.08 * lift - drop, 0]);
  }
  for (const [bone, off] of [[B.armN, Math.PI], [B.armF, Math.PI * 1.62]]) {
    const a = Math.sin(ph + off);
    rot[bone] = about(PV[bone], R(0, 0, run * M.armAmp * a + 0.05), [run * 0.04 * Math.cos(ph + off), 0, 0]);
  }
  rot[B.tail] = about(PV[B.tail], R(0, run * 0.4 * Math.sin(2 * ph), run * 0.3 * Math.sin(ph + 1.2)));
  // cheeks jiggle a beat after each landing
  const jig = 1 + run * M.cheekJiggle * Math.sin(2 * ph - 1.6);
  rot[B.cheekN] = about(PV[B.cheekN], I4(), [0, 0, 0], [jig, 2 - jig, jig]);
  rot[B.cheekF] = about(PV[B.cheekF], I4(), [0, 0, 0], [jig, 2 - jig, jig]);
  rot[B.crown] = about(PV[B.crown], R(M.crownSway * Math.sin(ph * 2 - 2.2), 0, -run * M.crownSway * (0.6 + 0.6 * Math.sin(2 * ph - 2.4))));
  // eyes: blinks, curious glances, and the character's expression (happy squint / surprise)
  const blink = bump(t, M.blinkEvery, 0.16, 0.9);
  const expr = bump(t, M.expressionEvery, 1.2, 0.3);
  let eyeScale = 1 - 0.88 * blink;
  if (M.expression === 'squint') eyeScale *= 1 - 0.5 * expr;
  const eyeGrow = M.expression === 'surprise' ? 1 + 0.2 * expr : 1;
  const glance = M.glance * Math.sin(t * 0.8) + M.glance * bump(t, 3.7, 0.9) * 0.8;
  for (const bone of [B.eyeN, B.eyeF]) rot[bone] = about(PV[bone], R(0, glance, M.glance * 0.4 * Math.sin(t * 0.6)), [0, 0, 0], [eyeGrow, eyeScale * eyeGrow, eyeGrow]);

  const world = [];
  for (let i = 0; i < BONES.length; i++) {
    world[i] = i === 0 ? rot[0] : mul(world[PARENT[i]], rot[i]);
    out.set(world[i], i * 16);
  }
  return out;
}
