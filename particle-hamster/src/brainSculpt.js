// A recognisable folded brain for the texture lab (creative experiments A-C). Same character idea
// as the original Brain (brainModel.js, untouched), but anatomical: two hemispheres with a deep
// central fissure, frontal / temporal / occipital lobes, a striped cerebellum, and winding cortical
// folds (sulci carved along the zero lines of a warped 3D noise). Smaller eyes sit in the frontal
// lobes and a smile below them; the folds fade out around the face so it stays readable.
// Axes as the hamsters: +X is the face, +Y up, +Z the brain's left. Pure JS (runs in the worker).
import { noise3, KIND } from './hamsterModel.js';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const norm = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
// ellipsoid distance (good near the surface, which is all the sampler needs)
function ell(x, y, z, c, r) {
  const px = (x - c[0]) / r[0], py = (y - c[1]) / r[1], pz = (z - c[2]) / r[2];
  const k0 = Math.hypot(px, py, pz);
  const k1 = Math.hypot(px / r[0], py / r[1], pz / r[2]);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(...r);
}

// face region on the front of the frontal lobes: folds fade out here
const faceMask = (x, y, z) => smoothstep(0.45, 0.85, x) * (1 - smoothstep(0.18, 0.42, Math.abs(y + 0.08))) * (1 - smoothstep(0.42, 0.62, Math.abs(z)));

/**
 * Build a folded-brain shape model. The face options default to the V8 face (Pink/Jelly/Purple
 * Folded Brain); the V9 "happy" face passes its own:
 *   facePad   smooth pad over the front between the frontal lobes (no fissure notch in the face)
 *   eyes      { x, y, z, r, look: [x, y, zOutward], pupil, iris }  (pupil/iris: gaze cosines)
 *   smile     { y, curve, width, thick }     brows { lift, arch, tilt, len, thick }
 */
export function makeSculptModel(F = {}) {
  const EYE = { x: 0.95, y: 0.02, z: 0.28, r: 0.22, look: [1, 0.08, 0.05], pupil: 0.88, iris: 0.76, ...F.eyes };
  const SM = { y: -0.3, curve: 0.08, width: 0.17, thick: 0.028, ...F.smile };
  const BR = { lift: 0.29, arch: 0.035, tilt: 0.015, len: 0.11, thick: 0.022, ...F.brows };

  /** distance to the folded brain body (no eyes) and the fold value (1 at the bottom of a sulcus) */
  function body(x, y, z) {
    let d = 1e9;
    for (const s of [1, -1]) {
      let h = ell(x, y, z, [0.02, 0.1, 0.42 * s], [1.06, 0.74, 0.52]); // frontal + parietal
      h = smin(h, ell(x, y, z, [0.18, -0.3, 0.6 * s], [0.62, 0.36, 0.34]), 0.2); // temporal lobe
      h = smin(h, ell(x, y, z, [-0.66, -0.04, 0.38 * s], [0.5, 0.56, 0.44]), 0.22); // occipital
      d = smin(d, h, 0.06); // small blend: the hemispheres stay two
    }
    // happy face: a soft pad fills the notch between the frontal lobes where the face sits
    if (F.facePad) d = smin(d, ell(x, y, z, F.facePad.c, F.facePad.r), F.facePad.k);
    // cerebellum tucked under the back, finely striped
    const cb = ell(x, y, z, [-0.62, -0.52, 0], [0.44, 0.26, 0.64]) + 0.008 * Math.sin(y * 70);
    d = smin(d, cb, 0.08);
    // deep longitudinal fissure between the hemispheres (top, back and the top of the front);
    // faceCut keeps it off the forehead between the eyes (it read as a frown)
    let fis = 0.14 * Math.exp(-((z / 0.055) ** 2)) * smoothstep(-0.35, 0.15, y) * (1 - 0.7 * smoothstep(0.6, 1.0, x) * (1 - smoothstep(0.05, 0.3, y)));
    if (F.faceCut) fis *= 1 - smoothstep(F.faceCut.x0, F.faceCut.x1, x) * (1 - smoothstep(F.faceCut.y0, F.faceCut.y1, y));
    d += fis;
    // cortical folds: grooves along the zero lines of warped noise, fading around the face and on
    // the cerebellum
    const wx = x + 0.5 * (noise3(y * 1.9 + 3.1, z * 1.9, x * 1.9) - 0.5);
    const wy = y + 0.5 * (noise3(z * 1.9 + 7.3, x * 1.9, y * 1.9) - 0.5);
    const n = noise3(wx * 2.4 + 11, wy * 2.4, z * 2.4) + 0.3 * noise3(wx * 5.1, wy * 5.1 + 5, z * 5.1);
    // contour lines of the noise: many winding, roughly parallel sulci with rounded gyri between
    const stripe = Math.abs(((n * 5.5) % 1) - 0.5) * 2;
    const fold = smoothstep(0.5, 0.95, stripe) * (1 - 0.92 * faceMask(x, y, z));
    const onCerebellum = smoothstep(0.05, -0.05, cb - d);
    d += 0.06 * fold * (1 - onCerebellum);
    return { d, fold: fold * (1 - onCerebellum), fissure: fis / 0.14 };
  }
  const bodySdf = (x, y, z) => body(x, y, z).d;

  const eyes = [1, -1].map((s) => {
    const c = [EYE.x, EYE.y, EYE.z * s];
    const look = norm([EYE.look[0], EYE.look[1], EYE.look[2] * s]);
    return { c, r: EYE.r, look, side: s };
  });

  function sdf(x, y, z) {
    let d = bodySdf(x, y, z);
    for (const E of eyes) d = Math.min(d, Math.hypot(x - E.c[0], y - E.c[1], z - E.c[2]) - E.r);
    return d;
  }

  function onFront(y, z) {
    let a = 0, b = 1.6;
    for (let it = 0; it < 22; it++) {
      const m = (a + b) / 2;
      if (bodySdf(m, y, z) < 0) a = m; else b = m;
    }
    return [a, y, z];
  }

  /** smile + brows as surface polylines (found along rays towards the face) */
  function curves() {
    const curve = (fn, n = 28) => Array.from({ length: n }, (_, i) => { const [y, z] = fn(-1 + (2 * i) / (n - 1)); return onFront(y, z); });
    const smile = curve((u) => [SM.y + SM.curve * u * u, SM.width * u]);
    const brows = eyes.map((E) => curve((u) => [E.c[1] + BR.lift + BR.arch * (1 - u * u) + BR.tilt * u * E.side, E.c[2] + BR.len * u], 16));
    return { smile, brows };
  }

  /** colour + kind of a surface point (body brightness carries the folds, for the style tint) */
  function shade(p, n, cv) {
    for (const E of eyes) {
      const v = [p[0] - E.c[0], p[1] - E.c[1], p[2] - E.c[2]];
      if (Math.hypot(...v) < E.r + 0.006) {
        const dir = norm(v), cl = dot(dir, E.look);
        const hl = dot(dir, norm([E.look[0] - 0.2, E.look[1] + 0.55, E.look[2] + 0.2]));
        if (hl > 0.975) return { col: [1, 1, 1], kind: KIND.EYE, glow: 1 };
        if (cl > EYE.pupil) return { col: C.pupil, kind: KIND.EYE };
        if (cl > EYE.iris) return { col: C.iris, kind: KIND.EYE };
        return { col: C.sclera, kind: KIND.EYE };
      }
    }
    const ds = distToPolyline(p, cv.smile);
    if (ds < SM.thick) return { col: C.line, kind: KIND.FEATURE };
    if (cv.brows.some((b) => distToPolyline(p, b) < BR.thick)) return { col: C.line, kind: KIND.FEATURE };
    const { fold, fissure } = body(...p);
    const crease = Math.max(fold, fissure * 0.8);
    let col = mix3(C.pink, C.sulcus, smoothstep(0.08, 0.6, crease));
    col = mix3(col, C.top, smoothstep(0.35, 1, n[1]) * 0.4 * (1 - crease));
    return { col, kind: KIND.FUR };
  }

  return { sdf, bodySdf, eyes, shade, curves };
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

const C = {
  pink: [0.98, 0.56, 0.62],
  sulcus: [0.6, 0.16, 0.3],
  top: [1.0, 0.72, 0.76],
  sclera: [0.98, 0.98, 0.97],
  iris: [0.36, 0.16, 0.12],
  pupil: [0.02, 0.02, 0.025],
  line: [0.12, 0.03, 0.05],
  mouth: [0.62, 0.12, 0.2],
};

/** V8 folded brain (Pink / Jelly / Purple Folded Brain) */
export const SCULPT_MODEL = makeSculptModel();

/**
 * V9 happy face: the fissure stops above the forehead and a soft pad fills the notch between the
 * frontal lobes; eyes higher, a little further apart and looking forward (slightly inward), bigger
 * irises; relaxed, evenly arched brows set higher; a wider, deeper, thicker smile.
 */
export const SCULPT_HAPPY_MODEL = makeSculptModel({
  facePad: { c: [0.5, -0.04, 0], r: [0.44, 0.44, 0.42], k: 0.14 },
  faceCut: { x0: 0.45, x1: 0.8, y0: 0.42, y1: 0.7 },
  eyes: { x: 0.95, y: 0.13, z: 0.33, r: 0.22, look: [1, 0.04, -0.06], pupil: 0.86, iris: 0.68 },
  smile: { y: -0.27, curve: 0.13, width: 0.21, thick: 0.036 },
  brows: { lift: 0.31, arch: 0.07, tilt: 0, len: 0.1, thick: 0.024 },
});
