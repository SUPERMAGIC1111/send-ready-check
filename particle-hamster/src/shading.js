// Shared constants + the CPU mirror of the particle shader's lighting.
// Keep in sync with the GLSL in ParticleHamster.js.
export const CAMERA = { fov: 30, distance: 6.4, pitch: 0.07, lookY: -0.02 };

// object yaw for the named views (camera on +Z; hamster faces +X)
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
function normalize(v) {
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
}

export function shadeParticle(base, n, kind, flag, strandT, isFur) {
  const ndl = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
  const diff = Math.min(1, Math.max(0, (ndl + 0.45) / 1.45));
  const rim = Math.pow(1 - Math.min(1, Math.max(0, n[2])), 2.5);
  if (kind === 3) {
    // eyes: glossy, keep contrast; catch-lights (flag) always bright
    if (flag > 0) return [1.2, 1.2, 1.2];
    const k = 0.62 + 0.45 * diff;
    return base.map((c) => c * k);
  }
  const lit = 0.3 + 0.88 * diff + (isFur ? 0.12 * strandT : 0);
  return base.map((c) => c * lit + rim * 0.3 * (0.5 * c + 0.5 * 0.95) + (flag > 0 ? 0.35 : 0));
}
