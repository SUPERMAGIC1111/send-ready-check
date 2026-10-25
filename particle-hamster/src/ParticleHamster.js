// Reusable Three.js dot hamster. Takes the dot layers produced by buildHamster() (see
// hamsterModel.js) and skins them on the GPU with the run-cycle bone matrices from
// poseMatrices(). Drop it into any scene (e.g. inside an orb later).
//
//   const hamster = new ParticleHamster(layers);
//   scene.add(hamster);
//   hamster.setPointScale(drawingBufferHeight, camera.fov, pixelRatio);
//   hamster.update(seconds, { run: 1, assemble: 1 });
//   hamster.setSolid(true);   // opaque, enlarged dots: the source image for the ASCII pass
//   hamster.dispose();
import * as THREE from 'three';
import { BONES, poseMatrices } from './hamsterModel.js';
import { LIGHT, ASCII, CAMERA } from './shading.js';

const BONE_COUNT = BONES.length;

// Dot shading mirrors shadeDot() in shading.js (used by the headless preview renderer).
const VERTEX = /* glsl */ `
  uniform mat4 uBones[${BONE_COUNT}];
  uniform float uTime;
  uniform float uRun;
  uniform float uScale;
  uniform float uMinSize;
  uniform float uAssemble;
  uniform float uDotScale;
  uniform float uFocus;
  uniform float uSolid;
  uniform vec3 uLight;

  attribute vec3 aColor;
  attribute float aSize;
  attribute float aBoneA;
  attribute float aBoneB;
  attribute float aWeight;
  attribute float aKind;
  attribute float aT;
  attribute float aFlag;
  attribute float aSeed;
  attribute float aAlpha;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vKind;

  vec3 scatter(float s) {
    // deterministic scatter direction for the assemble-in effect
    float a = s * 91.7, b = s * 37.3;
    return normalize(vec3(sin(a) * cos(b), cos(a) * 0.8, sin(a) * sin(b))) * (1.6 + fract(s * 13.1) * 1.4);
  }

  void main() {
    mat4 A = uBones[int(aBoneA + 0.5)];
    mat4 B = uBones[int(aBoneB + 0.5)];
    vec3 p = mix((A * vec4(position, 1.0)).xyz, (B * vec4(position, 1.0)).xyz, aWeight);
    vec3 n = normalize(mix(mat3(A) * normal, mat3(B) * normal, aWeight));

  #ifdef FUR
    // loose dots trail backwards while running and sway a little
    float sw = sin(uTime * (4.0 + 7.0 * uRun) + aSeed * 6.2831);
    p += vec3(-0.02 * uRun - 0.004, 0.012 * sw, 0.008 * sw) * aT;
    // a few dots escape the fur, drift off and come back
    float d = pow(max(0.0, sin(uTime * 0.6 + aSeed * 40.0)), 6.0) * aFlag;
    p += n * d * 0.3 + vec3(-0.18, 0.1, 0.0) * d;
  #endif

    // assemble from a scattered cloud (uAssemble 0 -> 1)
    float k = clamp(uAssemble * 1.6 - fract(aSeed * 7.3) * 0.6, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    p = mix(p + scatter(aSeed + position.x), p, k);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec3 nv = normalize(normalMatrix * n);

    float ndl = dot(nv, uLight);
    float diff = clamp((ndl + 0.45) / 1.45, 0.0, 1.0);
    float rim = pow(1.0 - clamp(nv.z, 0.0, 1.0), 2.0);
    float tw = 0.88 + 0.12 * sin(uTime * 1.7 + aSeed * 61.0);
    float wave = 0.5 + 0.5 * sin(dot(position, vec3(2.1, 1.3, 1.7)) - uTime * 0.9);
    vec3 base = mix(aColor, aColor * vec3(1.08, 0.92, 1.05) + vec3(0.05, 0.0, 0.04), 0.25 * wave);
    vec3 col;
    // nearer dots brighter, farther dimmer: depth reads even in a still frame
    float fade = clamp(1.0 - (-mv.z - uFocus) * 0.45, 0.5, 1.2);
    if (aKind > 2.5 && aKind < 3.5) {
      // eyes: catch-lights are the brightest dots on the character
      col = aFlag > 0.5 ? vec3(1.4) : base * (0.85 + 0.4 * diff) * fade;
    } else {
      // aFlag: sparkle dot (surface) or drifting fleck (fur)
      col = (base * (0.85 + 0.85 * diff) * tw + rim * 0.3 * (0.6 * base + 0.4)) * fade + aFlag * 0.4;
    }
    vColor = col;
    vKind = aKind;
    vAlpha = aAlpha * mix(0.2, 1.0, k);

    float boost = 0.9 + 0.2 * rim;
    // ASCII source pass: features (kind >= 2) grow less so pupils and eye rings stay open
    float grow = uSolid > 0.5 ? (aKind > 1.5 ? ${ASCII.featureDotScale.toFixed(3)} : uDotScale) : uDotScale;
    gl_PointSize = max(uMinSize, aSize * boost * grow * uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uSolid;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vKind;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c) * 2.0;
    if (r > 1.0) discard;
    if (uSolid > 0.5) {
      // keep lit colours below the 8-bit clamp so orange stays orange for the glyph pass
      // white fur a step below the pure-white eyes so the eyes keep the densest glyphs
      float gain = ${ASCII.solidGain.toFixed(3)} * (abs(vKind - 1.0) < 0.5 ? ${ASCII.whiteFurGain.toFixed(3)} : 1.0);
      gl_FragColor = vec4(vColor * gain, 1.0);
    } else {
      // crisp core + soft glow; additive, so black stays black between dots
      float core = smoothstep(0.72, 0.3, r);
      float halo = exp(-r * r * 5.0) * 0.6;
      gl_FragColor = vec4(vColor, vAlpha * (core + halo));
    }
  }
`;

// depth-only inner body so dots on the far side never show through
const OCCLUDER_VERTEX = /* glsl */ `
  uniform mat4 uBones[${BONE_COUNT}];
  attribute float aBone;
  void main() {
    vec3 p = (uBones[int(aBone + 0.5)] * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

function layerGeometry(L) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(L.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(L.normal, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(L.color, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(L.size, 1));
  g.setAttribute('aBoneA', new THREE.BufferAttribute(L.boneA, 1));
  g.setAttribute('aBoneB', new THREE.BufferAttribute(L.boneB, 1));
  g.setAttribute('aWeight', new THREE.BufferAttribute(L.weight, 1));
  g.setAttribute('aKind', new THREE.BufferAttribute(L.kind, 1));
  g.setAttribute('aT', new THREE.BufferAttribute(L.strandT, 1));
  g.setAttribute('aFlag', new THREE.BufferAttribute(L.flag, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(L.seed, 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(L.alpha, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2.2);
  return g;
}

function occluderGeometry() {
  // shrunken body, belly and head ellipsoids (rest pose), tagged with their bone
  const parts = [
    { c: [-0.16, -0.15, 0], r: [0.72, 0.69, 0.72], bone: 0 },
    { c: [0.06, -0.39, 0], r: [0.56, 0.4, 0.6], bone: 0 },
    { c: [0.5, 0.36, 0], r: [0.56, 0.52, 0.55], bone: 1 },
  ];
  const geos = parts.map(({ c, r, bone }) => {
    const g = new THREE.SphereGeometry(1, 28, 20);
    g.scale(r[0], r[1], r[2]);
    g.translate(c[0], c[1], c[2]);
    g.setAttribute('aBone', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(bone), 1));
    return g;
  });
  let vCount = 0, iCount = 0;
  for (const g of geos) { vCount += g.attributes.position.count; iCount += g.index.count; }
  const pos = new Float32Array(vCount * 3), bone = new Float32Array(vCount), idx = new Uint32Array(iCount);
  let vo = 0, io = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, vo * 3);
    bone.set(g.attributes.aBone.array, vo);
    for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + vo;
    vo += g.attributes.position.count;
    io += g.index.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('aBone', new THREE.BufferAttribute(bone, 1));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

export class ParticleHamster extends THREE.Group {
  /** @param {{core: object, fur: object}} layers output of buildHamster() */
  constructor(layers) {
    super();
    this.name = 'ParticleHamster';
    this._boneData = new Float32Array(BONE_COUNT * 16);
    const shared = {
      uBones: { value: Array.from({ length: BONE_COUNT }, () => new THREE.Matrix4()) },
      uTime: { value: 0 },
      uRun: { value: 1 },
      uScale: { value: 800 },
      uMinSize: { value: 1 },
      uAssemble: { value: 1 },
      uDotScale: { value: 1 },
      uSolid: { value: 0 },
      uFocus: { value: CAMERA.distance },
      uLight: { value: new THREE.Vector3(...LIGHT) },
    };
    this.uniforms = shared;

    this._occluderMat = new THREE.ShaderMaterial({
      uniforms: { uBones: shared.uBones },
      vertexShader: OCCLUDER_VERTEX,
      fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }',
      colorWrite: false,
    });
    this.occluder = new THREE.Mesh(occluderGeometry(), this._occluderMat);
    this.occluder.renderOrder = 0;
    this.occluder.frustumCulled = false;

    const dotMaterial = (fur) =>
      new THREE.ShaderMaterial({
        uniforms: shared,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        defines: fur ? { FUR: '' } : {},
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    this._coreMat = dotMaterial(false);
    this._furMat = dotMaterial(true);
    this.core = new THREE.Points(layerGeometry(layers.core), this._coreMat);
    this.fur = new THREE.Points(layerGeometry(layers.fur), this._furMat);
    this.core.renderOrder = 1;
    this.fur.renderOrder = 2;
    this.core.frustumCulled = this.fur.frustumCulled = false;

    this.add(this.occluder, this.core, this.fur);
    this.particleCount = layers.core.count + layers.fur.count;
    this.update(0, { run: 1 });
  }

  /** world-size -> pixel conversion; call on resize with the drawing-buffer height */
  setPointScale(bufferHeight, fovDeg, pixelRatio = 1) {
    this.uniforms.uScale.value = bufferHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
    this.uniforms.uMinSize.value = Math.max(1, 1.2 * pixelRatio);
  }

  /** opaque enlarged dots with depth: the source image the ASCII pass samples */
  setSolid(on) {
    this.uniforms.uSolid.value = on ? 1 : 0;
    this.uniforms.uDotScale.value = on ? ASCII.solidDotScale : 1;
    for (const m of [this._coreMat, this._furMat]) {
      m.blending = on ? THREE.NoBlending : THREE.AdditiveBlending;
      m.transparent = !on;
      m.depthWrite = on;
    }
  }

  /** @param {number} t seconds; run 0..1 blends idle -> run; assemble 0..1 for the intro */
  update(t, { run = 1, assemble = 1 } = {}) {
    poseMatrices(t, run, this._boneData);
    const bones = this.uniforms.uBones.value;
    for (let i = 0; i < BONE_COUNT; i++) bones[i].fromArray(this._boneData, i * 16);
    this.uniforms.uTime.value = t;
    this.uniforms.uRun.value = run;
    this.uniforms.uAssemble.value = assemble;
  }

  dispose() {
    for (const o of [this.occluder, this.core, this.fur]) o.geometry.dispose();
    this._occluderMat.dispose();
    this._coreMat.dispose();
    this._furMat.dispose();
    this.removeFromParent();
  }
}

// exported for tools/validate-shaders.mjs
export const SHADERS = { VERTEX, FRAGMENT, OCCLUDER_VERTEX };
