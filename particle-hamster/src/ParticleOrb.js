// Motion.dev-style luminous particle orb: thousands of separate points on a 3D sphere shell
// with organic (noise-driven) density, bright patches drifting across the surface, a glowing
// limb, gentle turbulence, stray points that wander out and settle back, and an optional
// playful scatter. Points facing the viewer fade out so a character inside stays visible.
//
//   const orb = new ParticleOrb('gold');  scene.add(orb);
//   orb.setPointScale(viewportHeightPx, camera.fov);  orb.update(seconds);  orb.dispose();
import * as THREE from 'three';
import { mulberry32, noise3 } from './hamsterModel.js';
import { LIGHT } from './shading.js';

export const ORB_STYLES = {
  // 04 - rich gold / amber / tangerine / ivory / warm white
  gold: {
    palette: [[0.8, 0.36, 0.08], [0.98, 0.52, 0.14], [1.0, 0.66, 0.24], [1.0, 0.78, 0.42], [1.0, 0.9, 0.7]],
    count: 26000, radius: 2.05, size: 0.021, spin: 0.09, turbulence: 0.04, strays: 0.05, band: 1.0, burst: 0, frontFade: 0.92, gain: 1.0,
  },
  // 05 - pearl / silver / lavender / lilac / subtle violet, cool white highlights: the elegant one
  pearl: {
    palette: [[0.42, 0.3, 0.72], [0.58, 0.46, 0.86], [0.72, 0.64, 0.92], [0.82, 0.8, 0.94], [0.94, 0.94, 1.0]],
    count: 30000, radius: 2.05, size: 0.017, spin: 0.055, turbulence: 0.026, strays: 0.035, band: 0.85, burst: 0, frontFade: 0.94, gain: 0.95,
  },
  // 06 - honey / gold / cream / champagne / warm amber, livelier with little scatter bursts
  honey: {
    palette: [[0.86, 0.5, 0.12], [1.0, 0.64, 0.2], [1.0, 0.76, 0.34], [0.98, 0.84, 0.56], [1.0, 0.92, 0.76]],
    count: 24000, radius: 2.1, size: 0.022, spin: 0.12, turbulence: 0.05, strays: 0.07, band: 1.1, burst: 1, frontFade: 0.9, gain: 1.05,
  },
};

// Ashima/Stefan Gustavson 3D simplex noise (MIT)
const SIMPLEX = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uMinSize;
  uniform float uRadius;
  uniform float uTurb;
  uniform float uBand;
  uniform float uBurst;
  uniform float uFrontFade;
  uniform float uGain;
  uniform vec3 uLight;
  uniform vec3 uPal[5];
  attribute float aSize;
  attribute float aSeed;
  attribute float aTone;
  attribute float aStray;
  varying vec3 vColor;
  varying float vAlpha;
  ${SIMPLEX}
  vec3 palette(float t) {
    t = clamp(t, 0.0, 1.0) * 4.0;
    if (t < 1.0) return mix(uPal[0], uPal[1], t);
    if (t < 2.0) return mix(uPal[1], uPal[2], t - 1.0);
    if (t < 3.0) return mix(uPal[2], uPal[3], t - 2.0);
    return mix(uPal[3], uPal[4], t - 3.0);
  }
  void main() {
    vec3 dir = normalize(position);
    float r = length(position);
    // the shell breathes with slow turbulence
    r += uTurb * snoise(dir * 2.2 + vec3(0.0, uTime * 0.12, uTime * 0.05));
    // strays wander out and settle back
    r += aStray * uRadius * 0.18 * (0.5 + 0.5 * sin(uTime * 0.35 + aSeed * 31.0));
    // playful scatter: every few seconds a handful of points pop outward and spring back
    float bt = mod(uTime * 0.9 + aSeed * 3.0, 5.5);
    float pop = uBurst * step(0.82, fract(aSeed * 7.13)) * exp(-bt * 1.6) * (1.0 - cos(min(bt * 6.0, 3.1416)));
    r *= 1.0 + 0.11 * pop;
    vec3 p = dir * r;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec3 nv = normalize(normalMatrix * dir);

    // bright patches drifting across the surface (the Motion.dev bands)
    float band = snoise(dir * 1.25 + vec3(uTime * 0.07, -uTime * 0.05, uTime * 0.04));
    band = smoothstep(-0.05, 0.6, band) * uBand;
    // slow dark lanes so the shell is never uniformly dotted
    float lane = smoothstep(-0.55, 0.15, snoise(dir * 2.3 - vec3(uTime * 0.03, 0.0, uTime * 0.02)));
    float lambert = max(dot(nv, uLight), 0.0);
    float limb = pow(1.0 - abs(nv.z), 2.0);
    float back = step(nv.z, 0.0);
    // the lit limb glows as a crescent (upper left), the far limb falls off into warm dark
    vec2 lx = normalize(uLight.xy);
    float crescent = max(dot(normalize(nv.xy + 1e-4), lx), 0.0);
    float lum = 0.12 + 0.32 * lambert + limb * (0.04 + 0.95 * crescent * crescent) + 1.25 * band;
    float sparkle = step(0.985, fract(aSeed * 91.3)) * (0.6 + 0.4 * sin(uTime * 2.0 + aSeed * 50.0));
    vColor = palette(aTone * 0.8 + band * 0.25) * (lum + sparkle) * uGain;

    // keep the character visible: only points facing the viewer AND over the middle of the orb
    // (where the hamster is) fade; the limb and the far side stay, so the orb keeps its volume
    vec4 cv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float centre = 1.0 - smoothstep(0.5, 0.86, length(mv.xy - cv.xy) / uRadius);
    float front = smoothstep(0.0, 0.6, nv.z) * centre * uFrontFade;
    // limb points pile up in screen space; thin them so additive light stays gold instead of white
    vAlpha = (1.0 - front) * (0.3 + 0.7 * lane) * (0.5 + 0.5 * fract(aSeed * 13.7)) * (1.0 - 0.4 * aStray) * (1.0 - 0.25 * back) * (1.0 - 0.55 * limb);

    gl_PointSize = max(uMinSize, aSize * (1.0 + 0.6 * band) * uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c) * 2.0;
    if (r > 1.0) discard;
    float a = (smoothstep(1.0, 0.35, r) + 0.25 * exp(-r * r * 4.0)) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

function orbGeometry(style, seed = 11) {
  const rnd = mulberry32(seed);
  const pos = [], size = [], seeds = [], tone = [], stray = [];
  const N = style.count;
  const golden = Math.PI * (3 - Math.sqrt(5));
  // oversample a Fibonacci sphere and keep points by an organic density field
  const total = Math.round(N * 3.2);
  for (let i = 0; i < total && seeds.length < N; i++) {
    const y = 1 - ((i + 0.5) / total) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = golden * i + (rnd() - 0.5) * 0.9;
    let d = [Math.cos(th) * rr, y, Math.sin(th) * rr];
    d = d.map((v) => v + (rnd() - 0.5) * 0.02);
    const l = Math.hypot(...d);
    d = d.map((v) => v / l);
    const dens = noise3(d[0] * 2.4 + 5, d[1] * 2.4, d[2] * 2.4) * 0.7 + noise3(d[0] * 7, d[1] * 7 + 3, d[2] * 7) * 0.3;
    if (rnd() > 0.06 + 0.94 * Math.pow(dens, 2.0)) continue; // dense glowing patches, dark sparse regions
    const isStray = rnd() < style.strays;
    const r = style.radius * (isStray ? 1.03 + Math.pow(rnd(), 2) * 0.3 : 1 + (rnd() - 0.5) * 0.035);
    pos.push(d[0] * r, d[1] * r, d[2] * r);
    size.push(style.size * (0.55 + Math.pow(rnd(), 3) * 1.3));
    seeds.push(rnd());
    tone.push(Math.min(1, Math.max(0, dens * 0.8 + (rnd() - 0.5) * 0.5)));
    stray.push(isStray ? 1 : 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  g.setAttribute('aTone', new THREE.Float32BufferAttribute(tone, 1));
  g.setAttribute('aStray', new THREE.Float32BufferAttribute(stray, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), style.radius * 1.5);
  return g;
}

export class ParticleOrb extends THREE.Group {
  constructor(styleName = 'gold') {
    super();
    this.name = 'ParticleOrb';
    this.style = ORB_STYLES[styleName];
    const s = this.style;
    this.uniforms = {
      uTime: { value: 0 },
      uScale: { value: 800 },
      uMinSize: { value: 1 },
      uRadius: { value: s.radius },
      uTurb: { value: s.turbulence },
      uBand: { value: s.band },
      uBurst: { value: s.burst },
      uFrontFade: { value: s.frontFade },
      uGain: { value: s.gain },
      uLight: { value: new THREE.Vector3(...LIGHT) },
      uPal: { value: s.palette.map((c) => new THREE.Vector3(...c)) },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(orbGeometry(s), this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3; // after the character, so its depth hides the orb's far side
    this.spinner = new THREE.Group();
    this.spinner.add(this.points);
    this.add(this.spinner);
    this.particleCount = this.points.geometry.attributes.position.count;
  }

  setPointScale(bufferHeight, fovDeg, pixelRatio = 1) {
    this.uniforms.uScale.value = bufferHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
    this.uniforms.uMinSize.value = Math.max(1, 0.8 * pixelRatio);
  }

  /** @param {number} t seconds (the orb's own clock); motion 0..1 scales its autonomous movement */
  update(t, motion = 1) {
    this.uniforms.uTime.value = t * motion;
    this.spinner.rotation.y = t * this.style.spin * motion;
    this.spinner.rotation.x = Math.sin(t * 0.13) * 0.12 * motion;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
    this.removeFromParent();
  }
}

export const ORB_SHADERS = { VERTEX, FRAGMENT };
