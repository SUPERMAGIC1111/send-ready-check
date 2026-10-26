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
export const BONES = ['body', 'head', 'earN', 'earF', 'armN', 'armF', 'legN', 'legF', 'tail', 'cheekN', 'cheekF', 'crown', 'eyeN', 'eyeF', 'browN', 'browF'];
const B = Object.fromEntries(BONES.map((n, i) => [n, i]));
const PARENT = BONES.map((n) => B[{ head: 'body', earN: 'head', earF: 'head', cheekN: 'head', cheekF: 'head', crown: 'head', eyeN: 'head', eyeF: 'head', browN: 'head', browF: 'head' }[n] ?? 'body']);

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
// eyeball; eye.flat < 1 squashes it along the gaze so the eye sits into the head as a flatter disc
function eyePrim(N, e, A) {
  const f = A.flat || 1;
  if (f === 1) return ell('eye' + N, 'eye' + N, e.c, [A.r, A.r, A.r], 0.02);
  const v = norm(cross(e.gaze, [0, 0, 1]));
  return ell('eye' + N, 'eye' + N, e.c, [A.r * f, A.r, A.r], 0.02, [e.gaze, v, cross(e.gaze, v)]);
}

/** Build the implicit anatomy for one character config. */
function makeAnatomy(cfg) {
  const A = cfg.anatomy;
  const HC = A.head.c;
  const eyes = [1, -1].map((s) => {
    const az = A.eye.azim * deg, el = A.eye.elev * deg;
    const dir = norm([Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az) * s]);
    return { c: add(HC, dir, A.eye.dist), gaze: dir, look: norm(mirror(A.eye.look, s)), side: s, r: A.eye.r, flat: A.eye.flat || 1 };
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
      eyePrim(N, eyes[s > 0 ? 0 : 1], A.eye),
      ell('ear' + N, 'ear' + N, mirror(A.ear.c, s), A.ear.r, 0.05, earBasis(s, A.ear.facing)),
      cap('arm' + N, 'arm' + N, mirror(A.arm.a, s), mirror(A.arm.b, s), A.arm.r1, A.arm.r2, 0.1),
      ell('paw' + N, 'arm' + N, mirror(A.paw.c, s), A.paw.r, 0.035),
      cap('leg' + N, 'leg' + N, mirror(A.leg.a, s), mirror(A.leg.b, s), A.leg.r1, A.leg.r2, 0.1),
      ell('foot' + N, 'leg' + N, mirror(A.foot.c, s), A.foot.r, 0.04),
      ell('tooth' + N, 'head', mirror(A.tooth.c, s), A.tooth.r, 0.004)
    );
  }
  // flat eyes (V3) sit exactly on the head: find the surface along each gaze (eyes and teeth
  // excluded) and set the eyeball so its front just protrudes from it
  if (A.eye.flat) {
    const others = prims.filter((p) => !p.name.startsWith('eye') && !p.name.startsWith('tooth'));
    for (const e of eyes) {
      const field = (t) => {
        const q = add(HC, e.gaze, t);
        let u = 1e9;
        others.forEach((p, j) => { const d = primDist(p, q[0], q[1], q[2]); u = j === 0 ? d : smin(u, d, p.k); });
        return u;
      };
      let lo = 0, hi = 3;
      for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2; if (field(m) < 0) lo = m; else hi = m; }
      e.c = add(HC, e.gaze, lo - A.eye.r * A.eye.flat + (A.eye.protrude ?? 0.045));
      const N = e.side > 0 ? 'N' : 'F';
      prims[prims.findIndex((p) => p.name === 'eye' + N)] = eyePrim(N, e, A.eye);
    }
  }
  const mouth = { ...ell('mouth', 'head', A.mouth.c, A.mouth.r, 0), bend: A.mouth.bend || 0, top: A.mouth.top || 1 };
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
    pivots[B['brow' + N]] = add(eyes[s > 0 ? 0 : 1].c, [0, A.eye.r * 1.4, 0]);
  }
  // bounding box of the anatomy (rest pose) with a margin
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const p of prims) {
    const pts = p.type === 'e' ? [[p.c, Math.max(...p.r)]] : [[p.a, p.r1], [p.b, p.r2]];
    for (const [c, r] of pts) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], c[k] - r); hi[k] = Math.max(hi[k], c[k] + r); }
  }
  // limb tips (rest pose): paw fingertips and the soles of the feet, for contact with the orb
  const tips = [1, -1].flatMap((s) => {
    const N = s > 0 ? 'N' : 'F';
    const armDir = norm([A.paw.c[0] - A.arm.a[0], A.paw.c[1] - A.arm.a[1], 0]);
    return [
      // quad gait: the front paw is a foot, so its tip is the sole
      { name: 'paw' + N, bone: B['arm' + N], p: cfg.run.quad ? add(mirror(A.paw.c, s), [A.paw.r[0] * 0.3, -A.paw.r[1], 0]) : add(mirror(A.paw.c, s), armDir, A.paw.r[0] * 0.9) },
      { name: 'foot' + N, bone: B['leg' + N], p: add(mirror(A.foot.c, s), [A.foot.r[0] * 0.3, -A.foot.r[1], 0]) },
    ];
  });
  return { HC, eyes, prims, mouth, pivots, tips, bbox: { min: lo.map((v) => v - 0.05), max: hi.map((v) => v + 0.05) } };
}

// open happy mouth: a sideways "D" (flatter upper lip, round lower edge) bent into a smile, with
// the corners curving up (y shifted by bend * z^2)
function mouthDist(m, x, y, z) {
  let dy = y - m.bend * z * z - m.c[1];
  if (dy > 0) dy /= m.top;
  return primDist(m, x, m.c[1] + dy, z) * (dy > 0 ? m.top : 1);
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
    state.carve = mouthDist(mouth, x, y, z);
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
      // inside of the open smile: a round pink tongue low in the mouth, deep warm rose behind it
      // (never a black hole)
      const yb = y - mouth.bend * z * z;
      const tongue = Math.pow((yb - (mouth.c[1] - mouth.r[1] * 0.75)) / (mouth.r[1] * 0.62), 2) + Math.pow(z / (mouth.r[2] * 0.6), 2);
      if (tongue < 1) return { col: mix3(C.tongue, C.pinkDeep, smoothstep(0.2, 1, tongue) * 0.4), kind: KIND.MOUTH, fur: 0 };
      return { col: C.mouthIn, kind: KIND.MOUTH, fur: 0 };
    }
    if (name.startsWith('eye')) {
      const eye = eyes[name === 'eyeN' ? 0 : 1];
      let v0 = [x - eye.c[0], y - eye.c[1], z - eye.c[2]];
      if (eye.flat !== 1) v0 = add(v0, eye.gaze, dot(v0, eye.gaze) * (1 / eye.flat - 1));
      const dir = norm(v0);
      const cl = dot(dir, eye.look);
      // glossy bead eye: dark iris filling the visible cap, warmer toward the bottom, big catch-light
      const h1 = dot(dir, norm([eye.look[0] - 0.2, eye.look[1] + 0.55, eye.look[2] + 0.05 * eye.side]));
      const h2 = dot(dir, norm([eye.look[0] + 0.25, eye.look[1] - 0.35, eye.look[2] - 0.1 * eye.side]));
      if (h1 > cfg.eye.catch1 || h2 > cfg.eye.catch2) return { col: [1, 1, 1], kind: KIND.EYE, fur: 0, glow: 1 };
      if (cfg.eye.style === 'pixar') {
        // big white sclera, iris with a dark outer ring and a warm glow at the bottom, round pupil
        if (cl > cfg.eye.pupilCos) return { col: C.pupil, kind: KIND.EYE, fur: 0 };
        if (cl > cfg.eye.irisCos) {
          const ring = smoothstep(cfg.eye.irisCos + 0.025, cfg.eye.irisCos, cl);
          const low = smoothstep(0.2, -0.6, dot(dir, [0, 1, 0]) - eye.look[1]);
          return { col: mix3(mix3(C.iris, C.irisLight, low), C.irisRing, ring * 0.8), kind: KIND.EYE, fur: 0 };
        }
        return { col: mix3(C.sclera, C.scleraShade, smoothstep(0.3, -0.5, cl)), kind: KIND.EYE, fur: 0 };
      }
      if (cl > 0.9) return { col: C.pupil, kind: KIND.EYE, fur: 0 };
      // warm iris that glows lighter toward the bottom (the references' Pixar-style eyes)
      if (cl > cfg.eye.irisCos) return { col: mix3(C.iris, C.irisLight, smoothstep(0.25, -0.7, dot(dir, [0, 1, 0]))), kind: KIND.EYE, fur: 0 };
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
      const upper = cfg.eye.style !== 'pixar' || p[1] - e.c[1] > -e.r * 0.15;
      if (upper && de < e.r + cfg.eye.rim && dot(n, e.gaze) > -0.3) return { col: C.eyeRim, kind: KIND.FEATURE, fur: 0 };
    }
    if (name === 'muzzle') return cream(0.25);
    if (name.startsWith('cheek')) {
      // cream on the lower front of the cheek, sloping down and back into the chest (like the references)
      // cheekSide (V3): side-facing cheek fur stays orange, only the front of the cheek is cream
      const w = smoothstep(R.cheekCream - 0.25, R.cheekCream + 0.12, n[0] * 0.75 - n[1] * 0.65 + 0.15 + jitter - (R.cheekSide || 0) * Math.abs(n[2]));
      const c = blend(w, R.cheekFur);
      // a soft rosy blush on the front of each puffy cheek
      const pr = P[name];
      const bc = [pr.c[0] + pr.r[0] * 0.7, pr.c[1] + pr.r[1] * 0.15, pr.c[2] * 1.05];
      const blush = smoothstep(0.24, 0.06, dist(p, bc)) * (R.blush || 0) * w;
      return { ...c, col: mix3(c.col, C.blush || C.pink, blush) };
    }
    if (name === 'head') {
      const blaze = Math.abs(z) < R.blaze[0] + R.blaze[1] * smoothstep(HC[1] + 0.15, HC[1] - 0.25, y) + jitter * 0.4 && n[0] > 0.3 && y < HC[1] + R.blaze[2];
      if (blaze || (y < HC[1] - R.chin + jitter && x > HC[0] && Math.abs(z) < (R.chinZ ?? 9) + jitter)) return cream(R.chinFur ?? 0.6);
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
      return blend(w, w > 0.5 ? R.bellyFur ?? 1.1 : 1.0 + 0.25 * rump);
    }
    if (name.startsWith('arm')) return orange(0.55);
    if (name.startsWith('leg')) return orange(0.6);
    if (name === 'tail') return orange(cfg.fur.tail ?? 0.9);
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
export function buildHamster(character = 'orange', { depthCloud = false, seed = 7, override = null } = {}) {
  const base = typeof character === 'string' ? CHARACTERS[character] : character;
  // override (texture lab): deep-merged over the config, e.g. no fur haze or a different dot spacing
  const cfg = override ? deepMerge(JSON.parse(JSON.stringify(base)), override) : base;
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

  // cells around the eyes, mouth and nose get extra candidates (D.featureCandidates), so the
  // finely spaced facial features are fully covered instead of showing gaps
  const featureCells = [];
  if (D.featureCandidates) {
    const spots = [...anat.eyes.map((e) => [e.c, e.r + 0.06]), [anat.mouth.c, Math.max(...anat.mouth.r) + 0.08], [anat.prims[4].c, Math.max(...anat.prims[4].r) + 0.06]];
    for (let c = 0; c < cells.length; c += 3) {
      const q = [cells[c] + size[0] / 2, cells[c + 1] + size[1] / 2, cells[c + 2] + size[2] / 2];
      if (spots.some(([cc, r]) => dist(q, cc) < r + 0.04)) featureCells.push(c);
    }
  }
  // grids per spacing class: keep the first (random) candidate that lands in each cell
  const grids = new Map();
  const core = [];
  const candidates = Math.round(D.candidates);
  const extra = featureCells.length ? Math.round(D.featureCandidates) : 0;
  let tries = 0;
  while (tries++ < candidates + extra) {
    const c = tries > candidates ? featureCells[Math.floor(rnd() * featureCells.length)] : Math.floor(rnd() * nCells) * 3;
    let x = cells[c] + rnd() * size[0], y = cells[c + 1] + rnd() * size[1], z = cells[c + 2] + rnd() * size[2];
    let d = F.sdf(x, y, z);
    if (Math.abs(d) > 0.02) continue;
    const g = F.gradient(x, y, z);
    x -= g[0] * d; y -= g[1] * d; z -= g[2] * d; // one Newton step onto the surface
    d = F.sdf(x, y, z);
    if (Math.abs(d) > 0.004) continue;
    const carve = F.carve;
    let label = F.label();
    let name = anat.prims[label].name;
    if (!name.startsWith('tooth') && -F.carve > F.union - 0.004) { label = 2; name = 'mouth'; } // 2 = head
    // lip line (V3): a thin dark rim just outside the opening, so the open smile reads from any angle
    const lip = cfg.lip && name !== 'mouth' && !name.startsWith('tooth') && name !== 'nose' && carve >= 0 && carve < cfg.lip.width;
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
    const reg = lip ? { col: cfg.palette.lip, kind: KIND.FEATURE, fur: 0 } : shade(name, [x, y, z], n, rnd);
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
    const mr = Math.max(...anat.mouth.r);
    m = Math.min(m, smoothstep(Math.max(0.12, mr * 0.9), Math.max(0.3, mr * 1.9), dist(p, anat.mouth.c)), smoothstep(0.06, 0.2, dist(p, anat.prims[4].c)));
    return m;
  };
  const combDir = (pt) => {
    const { p, n } = pt;
    const f = 3.5;
    const comb = [noise3(p[0] * f, p[1] * f, p[2] * f) - 0.5, noise3(p[0] * f + 11, p[1] * f, p[2] * f) - 0.5, noise3(p[0] * f, p[1] * f + 23, p[2] * f) - 0.5];
    // flows (V4 can override): cheek fluff sweeps back, pale fur hangs, body fur lies back
    const FL = cfg.fur.flows || {};
    const flow = pt.name.startsWith('cheek') ? FL.cheek || [-0.6, -0.5, 0] : pt.kind === KIND.WHITE_FUR ? FL.white || [-0.3, -1, 0] : FL.body || [-1, -0.25, 0];
    const cj = cfg.fur.comb ?? [0.9, 0.4]; // [coherent lean, random jitter]: low jitter = locks, not haze
    return norm([0, 1, 2].map((k) => n[k] + flow[k] * cfg.fur.lay + comb[k] * cj[0] + (rnd() - 0.5) * cj[1]));
  };
  const furTip = (pt) => (pt.kind === KIND.FUR ? mix3(pt.col, cfg.palette.furTip, 0.35 + rnd() * 0.35) : mix3(pt.col, cfg.palette.ivory, 0.3));
  for (let s = 0; s < cfg.fur.fluff && furry.length; s++) {
    const root = furry[Math.floor(rnd() * furry.length)];
    const len = cfg.fur.len * root.fur * nearFeature(root.p) * (0.45 + rnd() * 0.75);
    if (len < 0.02) continue;
    const dir = combDir(root);
    const nd = cfg.fur.strandDots || 1;
    if (nd > 1) {
      // hair strands (V3): a few dots along a soft, drooping, slightly curling lock, so the coat
      // reads as long fluffy hair rather than a fuzzy halo
      const seedS = rnd(), tip = furTip(root);
      const curl = (rnd() - 0.5) * 0.5;
      for (let k = 1; k <= nd; k++) {
        const u = (k - rnd() * 0.5) / nd;
        fur.push({
          p: [0, 1, 2].map((q) => root.p[q] + dir[q] * len * u - (q === 1 ? cfg.fur.droop * len * u * u : 0) + (q === 2 ? curl * len * u * u : 0)),
          n: root.n, col: mix3(root.col, tip, u), kind: root.kind,
          boneA: root.boneA, boneB: root.boneB, w: root.w,
          t: u, fleck: k === nd && rnd() < 0.03 ? 1 : 0, seed: seedS, size: D.fluffSize * (1.1 - 0.4 * u), alpha: root.kind === KIND.WHITE_FUR && cfg.fur.opaqueCream ? 1 : 1 - 0.3 * u,
        });
      }
      continue;
    }
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
    const lean = norm([CR.lean[0] + (rnd() - 0.5) * CR.mess, 1, Math.sin(a) * 0.8 + (CR.asym || 0) + (rnd() - 0.5) * CR.mess]);
    const len = CR.len * (0.7 + rnd() * 0.5);
    const tipCol = CR.tone ? mix3(cfg.palette.fur[3], cfg.palette.furHi, rnd() * 0.6) : mix3(cfg.palette.furHi, cfg.palette.furTip, rnd());
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
        p, n: norm([lean[0], 1, lean[2]]), col: mix3(CR.tone ? cfg.palette.fur[1] : cfg.palette.fur[2], tipCol, t), kind: KIND.FUR,
        boneA: B.head, boneB: B.crown, w: smoothstep(0, 0.6, t),
        t, fleck: 0, seed: rnd(), size: D.fluffSize * (CR.size || 1.35) * (1 - (CR.taper ?? 0.45) * t), alpha: 1 - 0.3 * t,
      });
    }
  }

  // brows (V3): arcs of overlapping dark dots just above the head surface, on their own bones so
  // they can lift with expressions; opaque, so they read as a solid dark stroke over the fur
  if (cfg.brows) {
    const BR = cfg.brows;
    for (const eye of anat.eyes) {
      const side = norm(cross([0, 1, 0], eye.gaze));
      const upv = cross(eye.gaze, side);
      const bone = eye.side > 0 ? B.browN : B.browF;
      const steps = Math.round(BR.len / 0.012);
      for (let k = 0; k <= steps; k++) {
        const u = -1 + (2 * k) / steps; // u < 0 toward the face centre when side points outward
        const inner = u > 0 ? 1 : 0; // +u runs toward the nose for both eyes
        const lift = BR.height + BR.arch * (1 - u * u) + BR.tilt * (inner ? 1 : -1) * Math.abs(u);
        for (const row of [-1, 0, 1]) {
          const thick = BR.thick * (1 - 0.55 * Math.abs(u)) * row;
          let q = add(add(add(eye.c, upv, (lift + thick) * eye.r), side, u * BR.len * 0.5 * eye.side), eye.gaze, eye.r * 0.2);
          for (let it = 0; it < 4; it++) {
            const d0 = F.sdf(...q);
            const g0 = F.gradient(...q);
            q = add(q, g0, -d0);
          }
          const n0 = F.gradient(...q);
          core.push({
            p: add(q, n0, 0.018), n: n0, col: mix3(cfg.palette.brow, cfg.palette.browHi, (row + 1) * 0.15),
            kind: KIND.FEATURE, fur: 0, glow: 0, boneA: B.head, boneB: bone, w: 1, name: 'brow', r: BR.dot,
          });
        }
      }
    }
  }
  // whiskers (V3): fine strands of tiny pale dots fanning out of the muzzle sides
  if (cfg.whiskers) {
    const WK = cfg.whiskers;
    const mz = anat.prims[3];
    for (const s of [1, -1]) {
      for (let w = 0; w < WK.count; w++) {
        const fan = (w / (WK.count - 1) - 0.5) * WK.fan;
        const root = [mz.c[0] - mz.r[0] * 0.15, mz.c[1] + fan * 0.12, s * mz.r[2] * 0.95];
        const dir = norm([0.35 - Math.abs(fan) * 0.3, fan * 0.6 + 0.05, s * 1]);
        const len = WK.len * (0.85 + 0.3 * rnd());
        for (let k = 1; k <= WK.dots; k++) {
          const t = k / WK.dots;
          fur.push({
            p: [root[0] + dir[0] * len * t - 0.25 * len * t * t, root[1] + dir[1] * len * t - WK.droop * len * t * t, root[2] + dir[2] * len * t],
            n: [0, 0, s], col: cfg.palette.whisker, kind: KIND.WHITE_FUR,
            boneA: B.head, boneB: B.head, w: 1, t, fleck: 0, seed: rnd(), size: WK.size * (1 - 0.4 * t), alpha: WK.alpha * (1 - 0.5 * t),
          });
        }
      }
    }
  }

  for (const pt of core) if (!pt.glow && pt.kind <= KIND.WHITE_FUR && rnd() < 0.025) pt.sparkle = 1;
  // cream dots a touch larger: less black between bright dots, so pale fur reads soft, not grainy
  // eyeFill (V3): eye dots overlap so the sclera and iris read as solid, glossy surfaces
  const sizeOf = (pt) => (pt.name === 'brow' ? pt.r / D.dotScale : (pt.glow ? 1.25 : pt.sparkle ? 1.35 : pt.kind === KIND.EYE ? D.eyeFill || 1 : pt.kind === KIND.WHITE_FUR ? D.creamFill || 1.08 : 1) * pt.r) * D.dotScale;
  const out = {
    id: cfg.id,
    core: pack(core, sizeOf, () => 0, (pt) => pt.glow || pt.sparkle || 0, null, () => 1),
    fur: pack(fur, (pt) => pt.size, (pt) => pt.t, (pt) => pt.fleck, (pt) => pt.seed, (pt) => pt.alpha),
    counts: { core: core.length, fur: fur.length },
  };
  if (depthCloud) out.depth = pack(core, () => D.body * 1.2, () => 0, () => 0, null, () => 1);
  return out;
}

function deepMerge(a, b) {
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object') deepMerge(a[k], v);
    else a[k] = v;
  }
  return a;
}

export function pack(list, sizeOf, tOf, flagOf, seedOf, alphaOf) {
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

// scale by k along unit axis d (cartoon limb stretch)
function stretch(d, k) {
  const m = I4();
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) m[c * 4 + r] = (r === c ? 1 : 0) + (k - 1) * d[r] * d[c];
  return m;
}
const smooth01 = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

/**
 * V3 gait: a bouncy little gallop. Hind legs alternate with a long push-back (the foot extends
 * behind the body) and a folded, lifted recovery; arms pump forward with a cartoon stretch.
 * contact = true (inside the orb): the arms reach up-forward and press the inner shell in turn.
 */
/**
 * Scurry gait (texture lab, Voxel V3): four short limbs in diagonal pairs. Each limb tip follows
 * an explicit path relative to the body: during the stance it slides straight back along the
 * floor (that is what drives the wheel), during the swing it lifts in a small arc and returns
 * forward, so the front paws reach forward to touch down and the hind paws push back. The limb
 * leans with its tip (a small rotation about the hip or shoulder) and is then translated so the
 * tip lands exactly on the path; the body's bob and surge are subtracted, so a planted paw never
 * leaves the floor or sinks into it.
 *   SC: { step, lift, duty, surge, phases: { footN, footF, pawN, pawF }, reach?: { paw, foot } }
 *   (phases in cycles; reach shifts the whole path forward/back, so the limb leans that way)
 */
function scurryLimbs(cyc, run, SC, A, rot, bodyX, bodyY) {
  for (const tip of A.tips) {
    const pv = A.pivots[tip.bone], p0 = tip.p;
    let u = (cyc + (SC.phases[tip.name] || 0)) % 1;
    if (u < 0) u += 1;
    let x, y;
    if (u < SC.duty) {
      x = SC.step * (0.5 - u / SC.duty);
      y = 0;
    } else {
      const s = (u - SC.duty) / (1 - SC.duty);
      x = SC.step * (smooth01(s) - 0.5);
      y = SC.lift * Math.sin(Math.PI * s);
    }
    x = (x + (SC.reach?.[tip.name.slice(0, -1)] || 0)) * run; y *= run;
    const L = Math.hypot(p0[0] - pv[0], p0[1] - pv[1]);
    const th = Math.atan2(x, L);
    const c = Math.cos(th), sn = Math.sin(th), dx = p0[0] - pv[0], dy = p0[1] - pv[1];
    const q = [pv[0] + c * dx - sn * dy, pv[1] + sn * dx + c * dy];
    rot[tip.bone] = about(pv, R(0, 0, th), [p0[0] + x - bodyX - q[0], p0[1] + y - bodyY - q[1], 0]);
  }
}

function poseV3(t, run, out, cfg, contact) {
  const M = cfg.run, A = anatomyOf(cfg), PV = A.pivots, an = cfg.anatomy;
  const TAU = Math.PI * 2;
  const ph = (t / M.period) * TAU;
  const breathe = Math.sin(t * 2.2) * 0.012 * (1 - run);
  const bounce = 0.5 - 0.5 * Math.cos(2 * ph - 0.6);
  const sq = run * M.squash * Math.cos(2 * ph - 0.6);
  const rot = [];
  rot[B.body] = about(PV[B.body], R(0, 0, run * (M.lean + M.pitch * Math.sin(2 * ph + 0.4))), [0, run * M.bounce * bounce + breathe, 0], [1 + sq * 0.5, 1 - sq, 1 + sq * 0.5]);
  // scurry (texture lab): the body only bobs and surges a little, no lean or squash
  const SC = M.scurry;
  const bodyX = SC ? run * SC.surge * Math.sin(2 * ph + 0.9) : 0, bodyY = SC ? run * M.bounce * bounce + breathe : 0;
  if (SC) rot[B.body] = about(PV[B.body], I4(), [bodyX, bodyY, 0]);
  // head: follow-through a beat behind the body, personality tilt/turn
  const expr = bump(t, M.expressionEvery, 1.2, 0.3);
  const tilt = M.tilt * Math.sin(t * M.tiltSpeed) + M.tilt * 0.6 * bump(t, M.tiltEvery, 1.6, 0.5);
  rot[B.head] = about(PV[B.head], R(tilt, M.turn * Math.sin(t * 0.7), -run * M.headLag * Math.sin(2 * ph - 0.5) + 0.02 * (1 - run) * Math.sin(t * 0.9)), [0, -run * 0.03 * bounce, 0]);
  // ears bounce a beat later still
  const earLag = Math.sin(2 * ph - 2.0);
  const perk = M.earPerk * expr;
  rot[B.earN] = about(PV[B.earN], R(run * 0.14 * earLag, 0, run * (M.earFlop + M.earBounce * earLag) - perk));
  rot[B.earF] = about(PV[B.earF], R(-run * 0.14 * earLag, 0, run * (M.earFlop + M.earBounce * earLag) - perk));
  if (SC) scurryLimbs(ph / TAU, run, SC, A, rot, bodyX, bodyY);
  // hind legs: alternate (half a stride apart)
  const legLen = Math.hypot(an.leg.b[0] - an.leg.a[0], an.leg.b[1] - an.leg.a[1]) + an.foot.r[1];
  const legAxis = norm([an.leg.b[0] - an.leg.a[0], an.leg.b[1] - an.leg.a[1], 0]);
  if (!SC) for (const [bone, off] of [[B.legN, 0], [B.legF, Math.PI]]) {
    const sn = Math.sin(ph + off), cs = Math.cos(ph + off);
    const ang = run * (M.legBase + M.legAmp * sn); // + swings the foot forward, - pushes it back
    const rec = Math.max(0, cs); // forward recovery swing: fold and lift
    // fold on the forward recovery, cartoon-stretch on the push back (the foot kicks out behind)
    const fold = 1 - run * M.legFold * rec + run * (M.legStretch || 0) * Math.max(0, -sn);
    // keep the sole near the ground line: rigid-arc compensation minus the stretch's extra reach
    const th0L = M.quad ? Math.atan2(legAxis[0], -legAxis[1]) : 0; // quad: true rest angle (V3/V4 keep 0)
    const drop = legLen * (Math.cos(th0L) - Math.cos(th0L + ang)) - legLen * Math.max(0, fold - 1) * Math.cos(ang);
    rot[bone] = about(PV[bone], mul(R(0, 0, ang), stretch(legAxis, fold)), [run * 0.03 * sn, run * M.legLift * rec - drop, 0]);
  }
  // arms: opposite to the same-side leg
  const armAxis = norm([an.paw.c[0] - an.arm.a[0], an.paw.c[1] - an.arm.a[1], 0]);
  const G = contact && M.contact ? M.contact : M;
  if (SC) {
    // scurry: all four limbs were posed by scurryLimbs()
  } else if (M.quad) {
    // quad gait (texture lab): the front legs run on the ground like the hind legs, diagonal pairs
    // (near front with far hind), with the swing scaled so the paws move at the same ground speed
    // as the feet: no sliding between front and back
    const armLen = Math.hypot(an.paw.c[0] - an.arm.a[0], an.paw.c[1] - an.arm.a[1]) + an.paw.r[1];
    const amp = (M.legAmp * legLen) / armLen;
    for (const [bone, off] of [[B.armN, Math.PI + M.quad], [B.armF, M.quad]]) {
      const sn = Math.sin(ph + off), cs = Math.cos(ph + off);
      const ang = run * (M.legBase * 0.5 + amp * sn);
      const rec = Math.max(0, cs);
      const fold = 1 - run * M.legFold * rec;
      // keep the sole on the ground line: the arm leans forward at rest (th0), so compensate the
      // arc of the real angle, not of a vertical limb
      const th0 = Math.atan2(armAxis[0], -armAxis[1]);
      const drop = armLen * (Math.cos(th0) - Math.cos(th0 + ang));
      rot[bone] = about(PV[bone], mul(R(0, 0, ang), stretch(armAxis, fold)), [run * 0.02 * sn, run * M.legLift * rec - drop, 0]);
    }
  } else for (const [bone, off] of [[B.armN, Math.PI], [B.armF, 0]]) {
    const sn = Math.sin(ph + off + (G.armPhase || 0));
    const reach = smooth01(0.5 + 0.5 * sn);
    const ang = run * (G.armBase + G.armAmp * (reach * 2 - 1)) + (1 - run) * 0.1;
    const k = 1 + run * G.armStretch * reach;
    rot[bone] = about(PV[bone], mul(R(0, 0, ang), stretch(armAxis, k)), [run * 0.03 * reach, run * (G.armLift || 0) * reach, 0]);
  }
  rot[B.tail] = about(PV[B.tail], R(0, run * 0.45 * Math.sin(2 * ph), run * 0.35 * Math.sin(2 * ph + 1.2)));
  // cheeks wobble a beat after each landing
  const jig = 1 + run * M.cheekJiggle * Math.sin(2 * ph - 1.6);
  rot[B.cheekN] = about(PV[B.cheekN], I4(), [0, 0, 0], [jig, 2 - jig, jig]);
  rot[B.cheekF] = about(PV[B.cheekF], I4(), [0, 0, 0], [jig, 2 - jig, jig]);
  rot[B.crown] = about(PV[B.crown], R(M.crownSway * Math.sin(ph * 2 - 2.2), 0, -run * M.crownSway * (0.6 + 0.6 * Math.sin(2 * ph - 2.4))));
  // eyes: blinks, glances, expression
  const blink = bump(t, M.blinkEvery, 0.16, 0.9);
  let eyeScale = 1 - 0.88 * blink;
  if (M.expression === 'squint') eyeScale *= 1 - 0.35 * expr;
  const eyeGrow = M.expression === 'surprise' ? 1 + 0.18 * expr : 1;
  const glance = M.glance * Math.sin(t * 0.8) + M.glance * bump(t, 3.7, 0.9) * 0.8;
  for (const bone of [B.eyeN, B.eyeF]) rot[bone] = about(PV[bone], R(0, glance, M.glance * 0.4 * Math.sin(t * 0.6)), [0, 0, 0], [eyeGrow, eyeScale * eyeGrow, eyeGrow]);
  // brows: lift with surprise and a little with every bounce
  const lift = (M.browLift || 0) * expr + (M.browBounce || 0) * run * Math.sin(2 * ph - 1.0);
  rot[B.browN] = about(PV[B.browN], R(0, 0, 0), [0, lift, 0]);
  rot[B.browF] = about(PV[B.browF], R(0, 0, 0), [0, lift, 0]);

  const world = [];
  for (let i = 0; i < BONES.length; i++) {
    world[i] = i === 0 ? rot[0] : mul(world[PARENT[i]], rot[i]);
    out.set(world[i], i * 16);
  }
  return out;
}

/**
 * Posed positions of the limb tips (paw fingertips, foot soles) in the hamster's own space.
 * @returns {{name: string, p: number[]}[]}
 */
export function limbTips(t, run = 1, character = 'orange', contact = false, bones = poseMatrices(t, run, undefined, character, contact)) {
  const cfg = typeof character === 'string' ? CHARACTERS[character] : character;
  return anatomyOf(cfg).tips.map(({ name, bone, p }) => {
    const o = bone * 16;
    return {
      name,
      p: [0, 1, 2].map((k) => bones[o + k] * p[0] + bones[o + 4 + k] * p[1] + bones[o + 8 + k] * p[2] + bones[o + 12 + k]),
    };
  });
}

/**
 * Ground speed of a character's run, in model units per second.
 * While a foot is planted it slides backwards relative to the body by D over a stance of duration
 * duty*T, so the body (and the ground it must push against) moves at D / (duty * T). Averaged over
 * both feet. This is the speed the wheel's inner surface has to match.
 * @returns {{speed: number, stride: number, duty: number}}
 */
export function runSpeed(character = 'orange', samples = 96) {
  const T = runPeriod(character);
  // scurry: the stance is defined exactly (tip slides `step` along the floor in duty*T)
  const SC = (typeof character === 'string' ? CHARACTERS[character] : character).run.scurry;
  if (SC) return { speed: SC.step / (SC.duty * T), stride: SC.step, duty: SC.duty };
  const feet = new Map();
  for (let k = 0; k < samples; k++) {
    for (const { name, p } of limbTips((k / samples) * T, 1, character, false)) {
      if (!name.startsWith('foot')) continue;
      if (!feet.has(name)) feet.set(name, []);
      feet.get(name).push(p);
    }
  }
  let speed = 0, stride = 0, duty = 0, n = 0;
  for (const pts of feet.values()) {
    const yMin = Math.min(...pts.map((p) => p[1]));
    const stance = pts.filter((p) => p[1] < yMin + 0.1);
    const xs = stance.map((p) => p[0]);
    const D = Math.max(...xs) - Math.min(...xs);
    const f = stance.length / pts.length;
    if (D > 0 && f > 0) {
      speed += D / (f * T);
      stride += D;
      duty += f;
      n++;
    }
  }
  return n ? { speed: speed / n, stride: stride / n, duty: duty / n } : { speed: 0, stride: 0, duty: 0 };
}

/**
 * Skinning matrices for every bone at time t (seconds).
 * run: 0 = standing/idle, 1 = full run (blendable). The cycle loops exactly every run.period.
 * contact: V3 characters inside the orb press the inner shell with their paws.
 * @returns {Float32Array} BONES.length * 16
 */
export function poseMatrices(t, run = 1, out = new Float32Array(BONES.length * 16), character = 'orange', contact = false) {
  const cfg = typeof character === 'string' ? CHARACTERS[character] : character;
  if (cfg.run.gait === 'v3') return poseV3(t, run, out, cfg, contact);
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
  rot[B.browN] = rot[B.browF] = I4();

  const world = [];
  for (let i = 0; i < BONES.length; i++) {
    world[i] = i === 0 ? rot[0] : mul(world[PARENT[i]], rot[i]);
    out.set(world[i], i * 16);
  }
  return out;
}
