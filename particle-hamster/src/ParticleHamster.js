// Reusable Three.js particle hamster. Takes the particle layers produced by
// buildHamster() (see hamsterModel.js) and skins them on the GPU with the run-cycle
// bone matrices from poseMatrices(). Drop it into any scene (e.g. inside an orb later).
//
//   const hamster = new ParticleHamster(layers);
//   scene.add(hamster);
//   hamster.setPointScale(drawingBufferHeight, camera.fov);
//   hamster.update(seconds, { run: 1, assemble: 1 });
//   hamster.dispose();
import * as THREE from 'three';
import { BONES, poseMatrices } from './hamsterModel.js';
import { LIGHT } from './shading.js';

const BONE_COUNT = BONES.length;

// Lighting mirrors shadeParticle() in shading.js (used by the headless preview renderer).
const VERTEX = /* glsl */ `
  uniform mat4 uBones[${BONE_COUNT}];
  uniform float uTime;
  uniform float uRun;
  uniform float uScale;
  uniform float uMinSize;
  uniform float uAssemble;
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
    // tips trail backwards while running and sway a little
    float sw = sin(uTime * (5.0 + 9.0 * uRun) + aSeed * 6.2831);
    p += vec3(-0.022 * uRun - 0.004, 0.012 * sw, 0.008 * sw) * aT;
    // a few flecks drift off the fur and come back
    float d = pow(max(0.0, sin(uTime * 0.6 + aSeed * 40.0)), 6.0) * aFlag;
    p += n * d * 0.24 + vec3(-0.14, 0.09, 0.0) * d;
  #endif

    // assemble from a scattered cloud (uAssemble 0 -> 1)
    float k = clamp(uAssemble * 1.6 - fract(aSeed * 7.3) * 0.6, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    p = mix(p + scatter(aSeed + position.x), p, k);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec3 nv = normalize(normalMatrix * n);

    float ndl = dot(nv, uLight);
    float diff = clamp((ndl + 0.45) / 1.45, 0.0, 1.0);
    float rim = pow(1.0 - clamp(nv.z, 0.0, 1.0), 2.5);
    vec3 col;
    if (aKind > 2.5 && aKind < 3.5) {
      // eyes: glossy with fixed catch-lights
      col = aFlag > 0.5 ? vec3(1.2) : aColor * (0.62 + 0.45 * diff);
    } else {
    #ifdef FUR
      float lit = 0.3 + 0.88 * diff + 0.12 * aT;
    #else
      float lit = 0.3 + 0.88 * diff;
    #endif
      col = aColor * lit + rim * 0.3 * (0.5 * aColor + 0.475);
    #ifdef FUR
      col += aFlag * 0.35;
    #endif
    }
    vColor = col;
    vAlpha = aAlpha * mix(0.25, 1.0, k);

    gl_PointSize = max(uMinSize, aSize * uScale / -mv.z);
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
  #ifdef FUR
    gl_FragColor = vec4(vColor, vAlpha * pow(1.0 - r, 1.2));
  #else
    gl_FragColor = vec4(vColor * (1.06 - 0.16 * r * r), 1.0);
  #endif
  }
`;

// depth-only inner body so far-side particles never show through gaps
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
  // slightly shrunken body, belly and head ellipsoids (rest pose), tagged with their bone
  const parts = [
    { c: [-0.16, -0.15, 0], r: [0.74, 0.71, 0.74], bone: 0 },
    { c: [0.06, -0.39, 0], r: [0.58, 0.42, 0.62], bone: 0 },
    { c: [0.5, 0.36, 0], r: [0.58, 0.54, 0.57], bone: 1 },
  ];
  const geos = parts.map(({ c, r, bone }) => {
    const g = new THREE.SphereGeometry(1, 28, 20);
    g.scale(r[0], r[1], r[2]);
    g.translate(c[0], c[1], c[2]);
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    g.setAttribute('aBone', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(bone), 1));
    return g;
  });
  const merged = mergeIndexed(geos);
  geos.forEach((g) => g.dispose());
  return merged;
}

function mergeIndexed(geos) {
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
    const bones = Array.from({ length: BONE_COUNT }, () => new THREE.Matrix4());
    const shared = {
      uBones: { value: bones },
      uTime: { value: 0 },
      uRun: { value: 1 },
      uScale: { value: 800 },
      uMinSize: { value: 1 },
      uAssemble: { value: 1 },
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

    this._coreMat = new THREE.ShaderMaterial({
      uniforms: shared,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
    });
    this.core = new THREE.Points(layerGeometry(layers.core), this._coreMat);
    this.core.renderOrder = 1;
    this.core.frustumCulled = false;

    this._furMat = new THREE.ShaderMaterial({
      uniforms: shared,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      defines: { FUR: '' },
      transparent: true,
      depthWrite: false,
    });
    this.fur = new THREE.Points(layerGeometry(layers.fur), this._furMat);
    this.fur.renderOrder = 2;
    this.fur.frustumCulled = false;

    this.add(this.occluder, this.core, this.fur);
    this.particleCount = layers.core.count + layers.fur.count;
    this.update(0, { run: 1 });
  }

  /** world-size -> pixel conversion; call on resize with the drawing-buffer height */
  setPointScale(bufferHeight, fovDeg, pixelRatio = 1) {
    this.uniforms.uScale.value = bufferHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
    this.uniforms.uMinSize.value = Math.max(1, 0.9 * pixelRatio);
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
