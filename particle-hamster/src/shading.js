// Shared constants + the CPU mirror of the dot shader (keep in sync with the GLSL in
// ParticleHamster.js). Used by the headless preview renderer.
export const CAMERA = { fov: 30, distance: 6.4, pitch: 0.07, lookY: -0.02 };

// 'side' is the hero side view used as the default pose: right-facing, turned ~24deg toward
// the viewer exactly like the reference running sheets; 'profile' is the strict 90deg side.
export const VIEWS = {
  side: -0.42,
  profile: 0,
  'three-quarter': -Math.PI / 4,
  front: -Math.PI / 2,
  'opposite-side': Math.PI,
  back: Math.PI / 2,
  'rear-three-quarter': Math.PI * 0.75,
};

export const LIGHT = normalize([-0.35, 0.62, 0.7]);
export const ASCII = { ramp: ' .:-=+*#%@', cell: [7, 11], solidDotScale: 2.0, featureDotScale: 1.35, solidGain: 0.7, whiteFurGain: 0.78, lumScale: 1.1 };
// in the ASCII source pass, eyes/pink/features grow less than fur so pupils and the eye ring stay open
export const asciiDotScale = (kind) => (kind >= 2 ? ASCII.featureDotScale : ASCII.solidDotScale);

function normalize(v) {
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
}
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/**
 * Colour of one dot. base: authored colour; n: view-space normal; rest: rest-pose position;
 * kind 3 = eye; flag = catch-light (core) or drifting fleck (fur); seed 0..1; t seconds.
 */
export function shadeDot(base, n, rest, kind, flag, seed, t, isFur, depth = CAMERA.distance) {
  const ndl = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
  const diff = clamp01((ndl + 0.45) / 1.45);
  const rim = Math.pow(1 - clamp01(n[2]), 2);
  const tw = 0.88 + 0.12 * Math.sin(t * 1.7 + seed * 61);
  // slow travelling colour drift (rose/gold), like the Motion.dev particles
  const wave = 0.5 + 0.5 * Math.sin(rest[0] * 2.1 + rest[1] * 1.3 + rest[2] * 1.7 - t * 0.9);
  const tint = [1.08, 0.92, 1.05], add = [0.05, 0, 0.04];
  const b = base.map((c, i) => c + (c * tint[i] + add[i] - c) * 0.25 * wave);
  // nearer dots brighter, farther dimmer: depth reads even in a still frame
  const fade = Math.min(1.2, Math.max(0.5, 1 - (depth - CAMERA.distance) * 0.45));
  if (kind === 3) {
    if (flag > 0) return [1.4, 1.4, 1.4];
    return b.map((c) => c * (0.85 + 0.4 * diff) * fade);
  }
  return b.map((c) => (c * (0.75 + 0.85 * diff) * tw + rim * 0.3 * (0.6 * c + 0.4)) * fade + flag * 0.4);
}

/** silhouette dots are drawn a little larger (and brighter via the rim term) */
export const dotBoost = (n) => 0.9 + 0.2 * Math.pow(1 - clamp01(n[2]), 2);
