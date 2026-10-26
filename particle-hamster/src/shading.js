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

// key light from the upper left, slightly in front: the face stays lit as the view turns
export const LIGHT = normalize([-0.35, 0.62, 0.7]);
// soft, friendly lighting: high ambient, gentle wrap, a little warm rim, subtle twinkle/drift
export const LOOK = { ambient: 0.66, diffuse: 0.46, wrap: 0.5, rim: 0.2, twinkle: 0.06, drift: 0.12, depthFade: 0.22, glow: 0.05, glowSize: 3.2 };
export const ASCII = { ramp: ' .:-=+*#%@', cell: [7, 11], solidDotScale: 2.0, featureDotScale: 1.35, solidGain: 0.7, whiteFurGain: 0.78, lumScale: 1.1 };
// in the ASCII source pass, eyes/pink/features grow less than fur so eyes and the smile stay open
export const asciiDotScale = (kind) => (kind >= 2 ? ASCII.featureDotScale : ASCII.solidDotScale);

function normalize(v) {
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
}
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/**
 * Colour of one dot. base: authored colour; n: view-space normal; rest: rest-pose position;
 * kind 3 = eye, 5 = inside of the mouth; flag = catch-light/sparkle (surface) or drifting fleck
 * (fur); strandT 0..1 along the fluff; seed 0..1; t seconds.
 */
export function shadeDot(base, n, rest, kind, flag, seed, t, isFur, depth = CAMERA.distance, strandT = 0, focus = CAMERA.distance) {
  const ndl = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
  const diff = clamp01((ndl + LOOK.wrap) / (1 + LOOK.wrap));
  const rim = Math.pow(1 - clamp01(n[2]), 3);
  const tw = 1 - LOOK.twinkle + LOOK.twinkle * Math.sin(t * 1.7 + seed * 61);
  const wave = 0.5 + 0.5 * Math.sin(rest[0] * 2.1 + rest[1] * 1.3 + rest[2] * 1.7 - t * 0.9);
  const b = base.map((c) => c * (1 + LOOK.drift * (wave - 0.5)));
  const fade = Math.min(1.04, Math.max(0.75, 1 - (depth - focus) * LOOK.depthFade));
  if (kind === 3) return flag > 0 ? [1, 1, 1] : b.map((c) => c * (0.9 + 0.25 * diff));
  if (kind === 5) return b.map((c) => c * (0.85 + 0.3 * diff));
  const lit = LOOK.ambient + LOOK.diffuse * diff + (isFur ? 0.08 * strandT : 0);
  return b.map((c) => (c * lit * tw + rim * LOOK.rim * (0.5 * c + 0.5)) * fade + flag * 0.22);
}
