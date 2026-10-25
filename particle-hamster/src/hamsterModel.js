// Pure-JS hamster model: implicit (SDF) anatomy, surface + fur particle sampling,
// a 9-bone rig and the run cycle. No Three.js dependency, so the exact same
// particle data can be rendered by the WebGL module and by the Node preview tool.
//
// CHARACTER SPEC (from the reference sheets; units: body height ~1.9)
//   axes      +X = forward (hamster runs right), +Y = up, +Z = near side in the side view
//   silhouette one round ball, ~1.15 wide : 1 tall; head is the upper-front third and
//              merges into the body with no neck; chubby low belly; spiky tuft on top
//   head      centre (0.45, 0.30), r~0.58; muzzle bulges forward to x~1.14, pink nose on tip,
//              two buck teeth under it
//   eyes      huge (r 0.19, ~1/3 head height), high on the front-sides of the head, wide set,
//              white sclera, brown iris, black pupil, two bright highlights, dark brows
//   ears      round, small, top-back of head (x~0.18, y~0.80), pink inner facing forward
//   colours   orange back/top/head-sides/ears; cream belly below a diagonal line from cheek to
//              rear bottom, white cheeks, muzzle and a blaze between the eyes; pink paws/feet/nose
//   limbs     front paws held at the chest (x~0.85, y~-0.33); short hind legs under the
//              middle with long pink feet just showing below the fur line; round tail tuft at rear

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
function noise3(x, y, z) {
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
export const BONES = ['body', 'head', 'earN', 'earF', 'armN', 'armF', 'legN', 'legF', 'tail'];
const B = Object.fromEntries(BONES.map((n, i) => [n, i]));
const PARENT = [0, 0, 1, 1, 0, 0, 0, 0, 0];
const PIVOT = [
  [-0.1, -0.15, 0],
  [0.36, 0.06, 0],
  [0.3, 0.76, 0.34],
  [0.3, 0.76, -0.34],
  [0.62, -0.08, 0.38],
  [0.62, -0.08, -0.38],
  [-0.32, -0.4, 0.44],
  [-0.32, -0.4, -0.44],
  [-0.9, -0.18, 0],
];

// ---------------------------------------------------------------- anatomy (SDF primitives)
// type 'e' = oriented ellipsoid, 'c' = tapered capsule. k = smooth-union radius with the rest.
function ell(name, bone, c, r, k, basis) {
  const [u, v, w] = basis || [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  return { name, bone, type: 'e', c, r, k, u, v, w };
}
function cap(name, bone, a, b, r1, r2, k) {
  return { name, bone, type: 'c', a, b, r1, r2, k };
}
function earBasis(side) {
  const w = norm([0.55, 0.12, 0.82 * side]);
  const u = norm(cross([0, 1, 0], w));
  return [u, cross(w, u), w];
}

// head centre; most face features are placed relative to it
const HC = [0.5, 0.36, 0];
const EYE_R = 0.2;
const EYES = [1, -1].map((s) => {
  // eyeballs sit ~42deg off the forward axis, 12deg up: the near eye reads fully in the
  // hero side view, and both eyes still face the viewer in the front view
  const dir = norm([0.727, 0.208, 0.655 * s]);
  return {
    c: [HC[0] + dir[0] * 0.53, HC[1] + dir[1] * 0.53, dir[2] * 0.53],
    gaze: dir,
    // pupils look forward (running toward the right)
    look: norm([0.92, 0.17, 0.38 * s]),
    side: s,
  };
});

const PRIMS = [];
for (const s of [1, -1]) {
  const N = s > 0 ? 'N' : 'F';
  PRIMS.push(
    ell('cheek' + N, B.head, [0.79, 0.08, 0.31 * s], [0.28, 0.25, 0.24], 0.22),
    ell('eye' + N, B.head, EYES[s > 0 ? 0 : 1].c, [EYE_R, EYE_R, EYE_R], 0.03),
    ell('ear' + N, B['ear' + N], [0.3, 0.93, 0.4 * s], [0.23, 0.24, 0.07], 0.05, earBasis(s)),
    cap('arm' + N, B['arm' + N], [0.62, -0.08, 0.39 * s], [0.93, -0.24, 0.37 * s], 0.11, 0.08, 0.08),
    ell('paw' + N, B['arm' + N], [1.01, -0.27, 0.36 * s], [0.1, 0.085, 0.09], 0.035),
    cap('leg' + N, B['leg' + N], [-0.32, -0.42, 0.44 * s], [-0.28, -0.98, 0.47 * s], 0.2, 0.1, 0.1),
    ell('foot' + N, B['leg' + N], [-0.15, -1.085, 0.47 * s], [0.21, 0.072, 0.105], 0.04),
    ell('tooth' + N, B.head, [1.2, 0.045, 0.027 * s], [0.022, 0.055, 0.024], 0.006)
  );
}
PRIMS.unshift(
  ell('body', B.body, [-0.16, -0.15, 0], [0.8, 0.77, 0.8], 0),
  ell('belly', B.body, [0.06, -0.39, 0], [0.64, 0.48, 0.68], 0.2),
  ell('head', B.head, HC, [0.64, 0.6, 0.63], 0.13),
  ell('muzzle', B.head, [1.04, 0.16, 0], [0.2, 0.165, 0.2], 0.1),
  ell('nose', B.head, [1.245, 0.235, 0], [0.056, 0.046, 0.062], 0.02),
  ell('tail', B.tail, [-0.99, -0.18, 0], [0.13, 0.11, 0.11], 0.06)
);
const P = Object.fromEntries(PRIMS.map((p, i) => [p.name, i]));

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

const _d = new Float64Array(PRIMS.length);
// returns the blended distance; per-primitive distances are left in _d
function sdf(x, y, z) {
  let d = 1e9;
  for (let i = 0; i < PRIMS.length; i++) {
    const di = primDist(PRIMS[i], x, y, z);
    _d[i] = di;
    d = i === 0 ? di : smin(d, di, PRIMS[i].k);
  }
  return d;
}
function gradient(x, y, z) {
  const e = 0.002;
  return norm([
    sdf(x + e, y, z) - sdf(x - e, y, z),
    sdf(x, y + e, z) - sdf(x, y - e, z),
    sdf(x, y, z + e) - sdf(x, y, z - e),
  ]);
}

// ---------------------------------------------------------------- colours
const C = {
  tangerine: [0.95, 0.5, 0.14],
  amber: [1.0, 0.64, 0.22],
  copper: [0.72, 0.31, 0.09],
  gold: [1.0, 0.8, 0.42],
  cream: [1.0, 0.92, 0.8],
  ivory: [1.0, 0.97, 0.91],
  creamShade: [0.9, 0.78, 0.64],
  pink: [1.0, 0.62, 0.64],
  pinkDeep: [0.9, 0.42, 0.5],
  sclera: [0.98, 0.97, 0.95],
  iris: [0.85, 0.5, 0.18],
  irisDark: [0.55, 0.27, 0.08],
  pupil: [0.02, 0.015, 0.012],
  brow: [0.24, 0.11, 0.05],
  mouth: [0.36, 0.1, 0.09],
};

// material kinds -> fur behaviour
export const KIND = { FUR: 0, WHITE_FUR: 1, SKIN: 2, EYE: 3, FEATURE: 4 };

function browDistance(eye, x, y, z) {
  // brow arc above each eye, measured in the plane facing along the eye's gaze, so it
  // always lands on the head surface; inner end raised (eager/worried look from the sheets)
  const side = norm(cross([0, 1, 0], eye.gaze));
  const up = cross(eye.gaze, side);
  const v = [x - eye.c[0], y - eye.c[1], z - eye.c[2]];
  if (dot(v, eye.gaze) < -0.12) return 1e9;
  const sx = dot(v, side) / 0.2, sy = dot(v, up);
  if (Math.abs(sx) > 1) return 1e9;
  const inner = sx * eye.side > 0 ? 1 : 0; // toward the face centre
  const arc = 0.27 + 0.045 * (1 - sx * sx) + 0.05 * Math.abs(sx) * inner;
  return Math.abs(sy - arc) * (1 + 0.6 * sx * sx);
}

// returns { col, kind, fur } for a surface point with primitive label `name`
function shadeRegion(name, p, n, rnd) {
  const [x, y, z] = p;
  const jitter = (noise3(x * 9, y * 9, z * 9) - 0.5) * 0.12;
  const furTone = () => {
    const t = noise3(x * 4 + 3, y * 4, z * 4);
    let c = t < 0.5 ? mix3(C.copper, C.tangerine, t * 2) : mix3(C.tangerine, C.amber, (t - 0.5) * 2);
    // darker along the spine/back, sunlit gold on the top
    c = mix3(c, C.copper, smoothstep(0.2, 0.9, -n[0]) * 0.25);
    c = mix3(c, C.gold, smoothstep(0.55, 1, n[1]) * 0.25 * rnd());
    return c;
  };
  const whiteTone = () => mix3(C.ivory, C.cream, noise3(x * 5, y * 5, z * 5 + 7)) ;
  const orange = { col: furTone(), kind: KIND.FUR, fur: 1 };
  const white = (len = 0.9) => ({ col: whiteTone(), kind: KIND.WHITE_FUR, fur: len });

  if (name.startsWith('eye')) {
    const eye = EYES[name === 'eyeN' ? 0 : 1];
    const dir = norm([x - eye.c[0], y - eye.c[1], z - eye.c[2]]);
    const cl = dot(dir, eye.look);
    // two catch-lights, up and toward the light (front-upper)
    const h1 = dot(dir, norm([eye.look[0] - 0.25, eye.look[1] + 0.45, eye.look[2] + 0.1 * eye.side]));
    const h2 = dot(dir, norm([eye.look[0] + 0.15, eye.look[1] - 0.32, eye.look[2] - 0.15 * eye.side]));
    if (h1 > 0.985 || h2 > 0.996) return { col: [1, 1, 1], kind: KIND.EYE, fur: 0, glow: 1 };
    if (cl > 0.935) return { col: C.pupil, kind: KIND.EYE, fur: 0 };
    if (cl > 0.8) return { col: mix3(C.irisDark, C.iris, smoothstep(0.93, 0.83, cl) * (0.6 + 0.4 * dir[1] + 0.4)), kind: KIND.EYE, fur: 0 };
    if (cl > 0.785) return { col: C.irisDark, kind: KIND.EYE, fur: 0 };
    return { col: mix3(C.sclera, [0.85, 0.82, 0.8], smoothstep(0.2, -0.4, cl)), kind: KIND.EYE, fur: 0 };
  }
  if (name === 'nose') return { col: mix3(C.pink, C.pinkDeep, smoothstep(0.3, -0.5, n[1])), kind: KIND.FEATURE, fur: 0 };
  if (name.startsWith('tooth')) return { col: C.ivory, kind: KIND.FEATURE, fur: 0 };
  if (name.startsWith('paw') || name.startsWith('foot')) {
    const toe = noise3(x * 30, y * 30, z * 30) > 0.62;
    return { col: toe ? C.pinkDeep : mix3(C.pink, [1, 0.74, 0.74], rnd() * 0.5), kind: KIND.SKIN, fur: 0 };
  }
  if (name.startsWith('ear')) {
    const pr = PRIMS[P[name]];
    const dx = x - pr.c[0], dy = y - pr.c[1], dz = z - pr.c[2];
    const lu = (dx * pr.u[0] + dy * pr.u[1] + dz * pr.u[2]) / pr.r[0];
    const lv = (dx * pr.v[0] + dy * pr.v[1] + dz * pr.v[2]) / pr.r[1];
    const lw = dx * pr.w[0] + dy * pr.w[1] + dz * pr.w[2];
    if (lw > 0 && Math.hypot(lu, lv + 0.08) < 0.74)
      return { col: mix3(C.pink, C.pinkDeep, smoothstep(0.7, 0.1, Math.hypot(lu, lv))), kind: KIND.SKIN, fur: 0 };
    return { col: furTone(), kind: KIND.FUR, fur: 0.35 };
  }

  // brows sit on top of everything around the eyes
  for (const eye of EYES) {
    if (browDistance(eye, x, y, z) < 0.03 && dot(n, eye.gaze) > -0.2) return { col: C.brow, kind: KIND.FEATURE, fur: 0 };
  }

  if (name === 'muzzle') {
    if (x > 1.09 && y < 0.12 && y > 0.06 && Math.abs(z) < 0.11) return { col: C.mouth, kind: KIND.FEATURE, fur: 0 };
    return white(0.25);
  }
  if (name.startsWith('cheek')) return white(1.35);
  if (name === 'head') {
    // white blaze between the eyes down to the muzzle, white chin; orange cap and eye patches
    const blaze = Math.abs(z) < 0.1 + 0.25 * smoothstep(0.51, 0.11, y) + jitter * 0.5 && n[0] > 0.25 && y < 0.68;
    if (blaze || y < 0.14 + jitter) return white(0.6);
    // spiky crown tuft on top of the head (the sheets' most recognisable outline detail)
    return { ...orange, fur: n[1] > 0.55 ? 2.2 : 0.9 };
  }
  if (name === 'body' || name === 'belly') {
    // white chest joins the cheeks to the belly, as in the sheets
    const line = 0.22 + 0.44 * (x - 0.75) - 0.32 * Math.abs(z) + 0.28 * smoothstep(0.15, 0.55, x) + jitter;
    if (y < line) return white(n[1] < -0.5 ? 0.6 : 1.0);
    return orange;
  }
  if (name.startsWith('arm')) return { ...orange, fur: 0.55 };
  if (name.startsWith('leg')) return y < -0.78 ? white(0.45) : { ...orange, fur: 0.75 };
  if (name === 'tail') return { ...orange, fur: 0.8 };
  return orange;
}

// ---------------------------------------------------------------- sampling
const BBOX = { min: [-1.22, -1.2, -1.0], max: [1.4, 1.2, 1.0] };

function buildBandCells(res) {
  const cells = [];
  const sx = (BBOX.max[0] - BBOX.min[0]) / res[0];
  const sy = (BBOX.max[1] - BBOX.min[1]) / res[1];
  const sz = (BBOX.max[2] - BBOX.min[2]) / res[2];
  const diag = Math.hypot(sx, sy, sz);
  for (let i = 0; i < res[0]; i++)
    for (let j = 0; j < res[1]; j++)
      for (let k = 0; k < res[2]; k++) {
        const x = BBOX.min[0] + (i + 0.5) * sx, y = BBOX.min[1] + (j + 0.5) * sy, z = BBOX.min[2] + (k + 0.5) * sz;
        if (Math.abs(sdf(x, y, z)) < diag * 0.75) cells.push(x - sx / 2, y - sy / 2, z - sz / 2);
      }
  return { cells, size: [sx, sy, sz] };
}

function labelAt() {
  let best = 0;
  for (let i = 1; i < PRIMS.length; i++) if (_d[i] < _d[best]) best = i;
  return best;
}

// skin weight between a primitive's bone and its parent bone
function skin(label) {
  const bone = PRIMS[label].bone;
  if (bone === 0) return [0, 0, 0];
  const parent = PARENT[bone];
  let dSelf = 1e9, dPar = 1e9;
  for (let i = 0; i < PRIMS.length; i++) {
    if (PRIMS[i].bone === bone) dSelf = Math.min(dSelf, _d[i]);
    else if (PRIMS[i].bone === parent) dPar = Math.min(dPar, _d[i]);
  }
  const band = bone === B.head ? 0.22 : 0.09;
  return [parent, bone, smoothstep(-band * 0.5, band, dPar - dSelf)];
}

/**
 * Build the dot cloud in the rest pose.
 * The anatomy surface is densely sampled, then thinned into evenly spaced (Poisson-disc) dots, the
 * way the Motion.dev sphere is made of separate points. Spacing is tighter on the facial
 * features so eyes, brows and nose read. Pupils are left empty (black) apart from their
 * catch-lights. Sparse fluff dots and dotted spikes (crown tuft) make the outline irregular.
 * @returns {{core: Layer, fur: Layer, depth?: Layer, counts: object}}
 * Layer = { count, position, normal, color, size, boneA, boneB, weight, kind, strandT, flag, seed, alpha }
 */
export function buildHamster({
  candidates = 90000,
  spacing = 0.032,
  faceSpacing = 0.025,
  featureSpacing = 0.0185,
  fluff = 3600,
  tuftSpikes = 150,
  seed = 7,
  depthCloud = false,
} = {}) {
  const rnd = mulberry32(seed);
  const { cells, size } = buildBandCells([66, 58, 52]);
  const nCells = cells.length / 3;

  const cand = [];
  const tryPoint = (x, y, z, faceOnly) => {
    let d = sdf(x, y, z);
    if (Math.abs(d) > 0.02) return false;
    // project onto the surface (two Newton steps)
    for (let it = 0; it < 2; it++) {
      const g = gradient(x, y, z);
      x -= g[0] * d; y -= g[1] * d; z -= g[2] * d;
      d = sdf(x, y, z);
    }
    const label = labelAt();
    const name = PRIMS[label].name;
    if (faceOnly && !(x > 0.6 && y > -0.1 && name !== 'body')) return false;
    const n = gradient(x, y, z);
    sdf(x, y, z); // refresh _d for skinning at final point
    const [boneA, boneB, w] = skin(label);
    const reg = shadeRegion(name, [x, y, z], n, rnd);
    cand.push({ p: [x, y, z], n, col: reg.col, kind: reg.kind, fur: reg.fur, glow: reg.glow || 0, boneA, boneB, w, name });
    return true;
  };
  const sample = (target, faceOnly) => {
    let got = 0, guard = 0;
    while (got < target && guard++ < target * 40) {
      const c = Math.floor(rnd() * nCells) * 3;
      const x = cells[c] + rnd() * size[0], y = cells[c + 1] + rnd() * size[1], z = cells[c + 2] + rnd() * size[2];
      if (faceOnly && (x < 0.55 || y < -0.12)) continue;
      if (tryPoint(x, y, z, faceOnly)) got++;
    }
  };
  sample(candidates, false);
  sample(Math.round(candidates * 0.25), true);

  // ---- Poisson-disc thinning: features first so they claim their dots before the fur does
  const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  const radius = (pt) => {
    // dark features (pupils, brows, mouth line) are drawn as negative space: no dots at all
    if (pt.kind === KIND.EYE && !pt.glow && lum(pt.col) < 0.06) return -1;
    if (pt.kind === KIND.FEATURE && lum(pt.col) < 0.2) return -1;
    // a thin empty ring around each eyeball so the white eye never melts into the white face
    if (pt.kind !== KIND.EYE)
      for (const e of EYES) if (Math.hypot(pt.p[0] - e.c[0], pt.p[1] - e.c[1], pt.p[2] - e.c[2]) < EYE_R + 0.05) return -1;
    if (pt.glow) return featureSpacing * 0.9;
    if (pt.kind === KIND.EYE || pt.kind === KIND.FEATURE) return featureSpacing;
    if (pt.kind === KIND.SKIN) return featureSpacing * 0.85; // pink paws/feet/ears/nose read as solid pink clusters
    if (pt.boneB === B.head && pt.p[0] > 0.62 && pt.p[1] > -0.12) return faceSpacing;
    return spacing;
  };
  for (const pt of cand) pt.r = radius(pt);
  for (let i = cand.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cand[i], cand[j]] = [cand[j], cand[i]];
  }
  cand.sort((a, b) => (a.r === b.r ? 0 : a.r - b.r));
  const cellSize = featureSpacing;
  const grid = new Map();
  const key = (i, j, k) => (i * 73856093) ^ (j * 19349663) ^ (k * 83492791);
  const core = [];
  for (const pt of cand) {
    if (pt.r < 0) continue;
    const [x, y, z] = pt.p;
    const ci = Math.floor(x / cellSize), cj = Math.floor(y / cellSize), ck = Math.floor(z / cellSize);
    const reach = Math.ceil(pt.r / cellSize);
    let free = true;
    for (let i = -reach; i <= reach && free; i++)
      for (let j = -reach; j <= reach && free; j++)
        for (let k = -reach; k <= reach && free; k++) {
          const bucket = grid.get(key(ci + i, cj + j, ck + k));
          if (!bucket) continue;
          for (const q of bucket) {
            if (Math.hypot(q.p[0] - x, q.p[1] - y, q.p[2] - z) < pt.r) { free = false; break; }
          }
        }
    if (!free) continue;
    const kk = key(ci, cj, ck);
    if (!grid.has(kk)) grid.set(kk, []);
    grid.get(kk).push(pt);
    core.push(pt);
  }

  // ---- fluff: sparse dots floating just off the fur, plus dotted spikes for the crown tuft
  const fur = [];
  const furry = core.filter((pt) => pt.fur > 0);
  const eyeFade = (p) => {
    let m = 1;
    for (const e of EYES) m = Math.min(m, smoothstep(EYE_R + 0.02, EYE_R + 0.2, Math.hypot(p[0] - e.c[0], p[1] - e.c[1], p[2] - e.c[2])));
    return m;
  };
  const strandDir = (pt, tuft) => {
    const { p, n } = pt;
    const f = tuft ? 7 : 3.5;
    const comb = [noise3(p[0] * f, p[1] * f, p[2] * f) - 0.5, noise3(p[0] * f + 11, p[1] * f, p[2] * f) - 0.5, noise3(p[0] * f, p[1] * f + 23, p[2] * f) - 0.5];
    let flow;
    if (tuft) flow = [-0.35, 1.0, 0];
    else if (pt.name.startsWith('cheek')) flow = [-0.7, -0.6, 0];
    else flow = [-1, -0.3, 0];
    const coh = tuft ? 2.2 : 1.0, jit = tuft ? 0.25 : 0.35;
    return norm([0, 1, 2].map((k) => n[k] + flow[k] * 0.55 + comb[k] * coh + (rnd() - 0.5) * jit));
  };
  const tipOf = (pt) => (pt.kind === KIND.FUR ? mix3(pt.col, C.gold, 0.3 + rnd() * 0.35) : mix3(pt.col, [1, 1, 1], 0.35));
  for (let s = 0; s < fluff && furry.length; s++) {
    const root = furry[Math.floor(rnd() * furry.length)];
    const len = 0.11 * root.fur * eyeFade(root.p) * (0.6 + rnd() * 0.7);
    if (len < 0.03) continue;
    const dir = strandDir(root, false);
    const t = 0.35 + rnd() * 0.65;
    fur.push({
      p: [0, 1, 2].map((k) => root.p[k] + dir[k] * len * t - (k === 1 ? 0.25 * len * t * t : 0)),
      n: root.n, col: mix3(root.col, tipOf(root), t), kind: root.kind,
      boneA: root.boneA, boneB: root.boneB, w: root.w,
      t, fleck: rnd() < 0.05 ? 1 : 0, seed: rnd(), size: 0.75, alpha: 0.75 - 0.3 * t,
    });
  }
  const tuftRoots = furry.filter((pt) => pt.name === 'head' && pt.n[1] > 0.55 && pt.kind === KIND.FUR);
  for (let s = 0; s < tuftSpikes && tuftRoots.length; s++) {
    const root = tuftRoots[Math.floor(rnd() * tuftRoots.length)];
    const len = 0.11 * 2.2 * (0.6 + rnd() * 0.7);
    const dir = strandDir(root, true);
    const steps = Math.max(3, Math.round(len / 0.026));
    const seedS = rnd(), tip = tipOf(root);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      fur.push({
        p: [0, 1, 2].map((k) => root.p[k] + dir[k] * len * t - (k === 1 ? 0.05 * len * t * t : 0)),
        n: root.n, col: mix3(root.col, tip, t), kind: root.kind,
        boneA: root.boneA, boneB: root.boneB, w: root.w,
        t, fleck: 0, seed: seedS, size: 0.9 - 0.35 * t, alpha: 0.95 - 0.4 * t,
      });
    }
  }

  // a few sparse sparkle dots (bigger, brighter) on the fur, like the Motion.dev field
  for (const pt of core) if (!pt.glow && pt.kind <= KIND.WHITE_FUR && rnd() < 0.035) pt.sparkle = 1;
  const dotSize = (pt) => (pt.glow ? 1.15 : pt.sparkle ? 1.45 : pt.kind === KIND.SKIN ? 1 : pt.r <= featureSpacing * 1.3 ? 0.86 : pt.r <= faceSpacing ? 0.92 : 1);
  const out = {
    core: pack(core, (pt) => 0.027 * dotSize(pt), () => 0, (pt) => pt.glow || pt.sparkle || 0, null, () => 1),
    fur: pack(fur, (pt) => 0.027 * pt.size, (pt) => pt.t, (pt) => pt.fleck, (pt) => pt.seed, (pt) => pt.alpha),
    counts: { core: core.length, fur: fur.length },
  };
  // dense surface samples, only for the headless renderer's occlusion buffer
  if (depthCloud) out.depth = pack(cand, () => 0.03, () => 0, () => 0, null, () => 1);
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
    L.color.set(pt.col, i * 3);
    L.size[i] = sizeOf(pt) * (0.72 + r() * 0.56);
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
function R(ax, ay, az) {
  // R = Rz * Ry * Rx
  const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
  const m = I4();
  m[0] = cz * cy; m[1] = sz * cy; m[2] = -sy;
  m[4] = cz * sy * sx - sz * cx; m[5] = sz * sy * sx + cz * cx; m[6] = cy * sx;
  m[8] = cz * sy * cx + sz * sx; m[9] = sz * sy * cx - cz * sx; m[10] = cy * cx;
  return m;
}
const about = (pv, rot, extra = [0, 0, 0]) => mul(T(pv[0] + extra[0], pv[1] + extra[1], pv[2] + extra[2]), mul(rot, T(-pv[0], -pv[1], -pv[2])));

export const RUN_PERIOD = 0.42; // seconds per stride

/**
 * Skinning matrices for every bone at time t (seconds).
 * run: 0 = standing/idle, 1 = full run (blendable).
 * @returns {Float32Array} BONES.length * 16
 */
export function poseMatrices(t, run = 1, out = new Float32Array(BONES.length * 16)) {
  const ph = (t / RUN_PERIOD) * Math.PI * 2;
  const breathe = Math.sin(t * 2.2) * 0.012 * (1 - run);
  // half-bound gait: the two hind legs strike ~0.3 of a stride apart, front paws pump in
  // counter-phase; the body rises twice per stride and pitches with the push-off
  const rot = [];
  const bounce = 0.5 - 0.5 * Math.cos(2 * ph - 0.6);
  rot[B.body] = about(PIVOT[0], R(0, 0, run * 0.09 * Math.sin(ph + 0.5)), [0, run * 0.085 * bounce + breathe, 0]);
  // head lags the body (follow-through) and bobs a little against it
  rot[B.head] = about(PIVOT[1], R(0, run * 0.03 * Math.sin(ph), -run * 0.1 * Math.sin(ph - 0.2) + 0.02 * (1 - run) * Math.sin(t * 0.9)), [0, -run * 0.025 * bounce, 0]);
  // ears blown back while running, flapping a beat behind the bounce
  const earLag = Math.sin(2 * ph - 1.8);
  rot[B.earN] = about(PIVOT[2], R(run * 0.12 * earLag, 0, run * (0.22 + 0.16 * earLag)));
  rot[B.earF] = about(PIVOT[3], R(-run * 0.12 * earLag, 0, run * (0.22 + 0.16 * earLag)));
  for (const [bone, off] of [[B.legN, 0], [B.legF, Math.PI * 0.62]]) {
    const a = Math.sin(ph + off);
    const ang = run * (0.8 * a - 0.18);
    // a rigid leg swinging about the hip would arc the foot up into the belly; drop the bone by
    // the arc height (a cheap knee) and lift only during the forward recovery swing
    const lift = Math.max(0, Math.cos(ph + off));
    const drop = 0.6 * (1 - Math.cos(ang));
    rot[bone] = about(PIVOT[bone], R(0, 0, ang), [run * 0.04 * a, run * 0.08 * lift - drop, 0]);
  }
  for (const [bone, off] of [[B.armN, Math.PI], [B.armF, Math.PI * 1.62]]) {
    const a = Math.sin(ph + off);
    rot[bone] = about(PIVOT[bone], R(0, 0, run * 0.75 * a + 0.05), [run * 0.06 * Math.cos(ph + off), 0, 0]);
  }
  rot[B.tail] = about(PIVOT[B.tail], R(0, run * 0.4 * Math.sin(2 * ph), run * 0.3 * Math.sin(ph + 1.2)));

  const world = [];
  for (let i = 0; i < BONES.length; i++) {
    world[i] = i === 0 ? rot[0] : mul(world[PARENT[i]], rot[i]);
    out.set(world[i], i * 16);
  }
  return out;
}
