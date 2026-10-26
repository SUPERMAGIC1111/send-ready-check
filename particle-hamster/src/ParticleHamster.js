// Reusable Three.js dot hamster. Takes the dot layers produced by buildHamster() (see
// hamsterModel.js) and skins them on the GPU with the character's run-cycle bone matrices from
// poseMatrices(). Drop it into any scene (standalone, or inside a ParticleOrb).
//
//   const hamster = new ParticleHamster(layers, 'orange');
//   scene.add(hamster);
//   hamster.setPointScale(drawingBufferHeight, camera.fov, pixelRatio);
//   hamster.update(seconds, { run: 1, assemble: 1 });
//   hamster.setSolid(true);   // opaque, enlarged dots: the source image for the ASCII pass
//   hamster.dispose();
//
// Surface dots are opaque, depth-tested discs (anti-aliased with alpha-to-coverage), so dense
// silhouettes never blow out to white the way additive dots do; the fur is a soft blended shell.
import * as THREE from 'three';
import { BONES, poseMatrices, limbTips } from './hamsterModel.js';
import { CHARACTERS } from './characters.js';
import { LIGHT, ASCII, CAMERA, LOOK } from './shading.js';

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
    // fluff trails back a little while running and breathes softly
    float sw = sin(uTime * (3.0 + 6.0 * uRun) + aSeed * 6.2831);
    p += vec3(-0.018 * uRun - 0.003, 0.008 * sw, 0.006 * sw) * aT;
    // a few loose dots drift off the fur and come back
    float d = pow(max(0.0, sin(uTime * 0.6 + aSeed * 40.0)), 6.0) * aFlag;
    p += n * d * 0.22 + vec3(-0.14, 0.08, 0.0) * d;
  #endif

    // assemble from a scattered cloud (uAssemble 0 -> 1)
    float k = clamp(uAssemble * 1.6 - fract(aSeed * 7.3) * 0.6, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    p = mix(p + scatter(aSeed + position.x), p, k);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec3 nv = normalize(normalMatrix * n);

    float ndl = dot(nv, uLight);
    float diff = clamp((ndl + ${LOOK.wrap.toFixed(3)}) / ${(1 + LOOK.wrap).toFixed(3)}, 0.0, 1.0);
    float rim = pow(1.0 - clamp(nv.z, 0.0, 1.0), 3.0);
    float tw = 1.0 - ${LOOK.twinkle.toFixed(3)} + ${LOOK.twinkle.toFixed(3)} * sin(uTime * 1.7 + aSeed * 61.0);
    float wave = 0.5 + 0.5 * sin(dot(position, vec3(2.1, 1.3, 1.7)) - uTime * 0.9);
    vec3 base = aColor * (1.0 + ${LOOK.drift.toFixed(3)} * (wave - 0.5));
    // nearer dots a touch brighter, farther a touch dimmer: depth reads in a still frame
    float fade = clamp(1.0 - (-mv.z - uFocus) * ${LOOK.depthFade.toFixed(3)}, 0.75, 1.04);
    vec3 col;
    if (aKind > 2.5 && aKind < 3.5) {
      // glossy bead eyes: catch-lights are the brightest dots on the character
      col = aFlag > 0.5 ? vec3(1.0) : base * (0.9 + 0.25 * diff);
    } else if (aKind > 4.5) {
      col = base * (0.85 + 0.3 * diff); // inside of the smile
    } else {
      float lit = ${LOOK.ambient.toFixed(3)} + ${LOOK.diffuse.toFixed(3)} * diff;
    #ifdef FUR
      lit += 0.08 * aT;
    #endif
      // aFlag: sparkle dot (surface) or drifting fleck (fur)
      col = (base * lit * tw + rim * ${LOOK.rim.toFixed(3)} * (0.5 * base + 0.5)) * fade + aFlag * 0.22;
    }
    if (uSolid > 0.5) {
      // ASCII source: carve the form with light. Strong key light and dark silhouette edges give
      // the glyph ramp real light/dark structure; dark features become blank cells (holes),
      // pink skin (nose, paws, inner ears) stays bright so it reads as dense glyphs
      float key = pow(clamp((ndl + 0.15) / 1.15, 0.0, 1.0), 1.2);
      float edge = 1.0 - 0.75 * pow(1.0 - clamp(nv.z, 0.0, 1.0), 2.0);
      if (aKind > 2.5 && aKind < 3.5) col = aFlag > 0.5 ? vec3(1.0) : (dot(aColor, vec3(0.33)) > 0.7 ? aColor * 0.95 : vec3(0.0));
      else if (aKind > 4.5) col = aColor.r > 0.9 ? aColor * 0.7 : vec3(0.0);
      else if (aKind > 3.5) col = dot(aColor, vec3(0.33)) > 0.8 ? aColor : vec3(0.0);
      else if (aKind > 1.5) col = aColor * (0.75 + 0.35 * key);
      else col = aColor * (0.2 + 0.9 * key) * edge;
    }
    vColor = col;
    vKind = aKind;
    vAlpha = aAlpha * mix(0.2, 1.0, k);

    // ASCII source pass: features (kind >= 2) grow less so eyes and the smile stay readable
    float grow = uSolid > 0.5 ? (aKind > 1.5 ? ${ASCII.featureDotScale.toFixed(3)} : uDotScale) : uDotScale;
  #ifdef GLOW
    grow *= ${LOOK.glowSize.toFixed(3)};
  #endif
    gl_PointSize = max(uMinSize, aSize * grow * uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uSolid;
  uniform float uGlow;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vKind;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c) * 2.0;
    if (r > 1.0) discard;
    if (uSolid > 0.5) {
      // keep lit colours below the 8-bit clamp so colour survives the glyph pass
      // colours were already remapped for the glyph pass in the vertex shader
      float gain = abs(vKind - 1.0) < 0.5 ? ${ASCII.whiteFurGain.toFixed(3)} : 1.0;
      gl_FragColor = vec4(min(vColor * gain, vec3(1.0)), 1.0);
      return;
    }
  #ifdef GLOW
    // faint luminous underlay: the body glows softly between the crisp dots, Motion-style
    gl_FragColor = vec4(vColor, exp(-r * r * 3.5) * uGlow);
    return;
  #endif
    // round dot with a soft edge (alpha-to-coverage on the surface layer, blending on the fur)
    float a = smoothstep(1.0, 0.62, r) * vAlpha;
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor * (1.04 - 0.1 * r * r), a);
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

function occluderGeometry(cfg) {
  // shrunken body, belly and head ellipsoids (rest pose), tagged with their bone
  const A = cfg.anatomy;
  const shrink = (e, k) => ({ c: e.c, r: e.r.map((v) => v * k) });
  const parts = [
    { ...shrink(A.body, 0.88), bone: 0 },
    { ...shrink(A.belly, 0.84), bone: 0 },
    { ...shrink(A.head, 0.86), bone: 1 },
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
  /**
   * @param {{core: object, fur: object}} layers output of buildHamster()
   * @param {string} character id in characters.js (drives the pose personality and occluder)
   */
  constructor(layers, character = layers.id || 'orange') {
    super();
    this.name = 'ParticleHamster';
    this.character = CHARACTERS[character];
    this.contact = false; // V3 inside an orb: paws press the inner shell
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
      uGlow: { value: LOOK.glow },
      uLight: { value: new THREE.Vector3(...LIGHT) },
    };
    this.uniforms = shared;

    this._occluderMat = new THREE.ShaderMaterial({
      uniforms: { uBones: shared.uBones },
      vertexShader: OCCLUDER_VERTEX,
      fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }',
      colorWrite: false,
    });
    this.occluder = new THREE.Mesh(occluderGeometry(this.character), this._occluderMat);
    this.occluder.renderOrder = 0;
    this.occluder.frustumCulled = false;

    const dotMaterial = (fur) =>
      new THREE.ShaderMaterial({
        uniforms: shared,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        defines: fur ? { FUR: '' } : {},
        transparent: fur,
        depthWrite: !fur,
        alphaToCoverage: !fur,
      });
    this._coreMat = dotMaterial(false);
    this._furMat = dotMaterial(true);
    this._glowMat = new THREE.ShaderMaterial({
      uniforms: shared,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      defines: { GLOW: '' },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coreGeometry = layerGeometry(layers.core);
    this.core = new THREE.Points(coreGeometry, this._coreMat);
    this.glow = new THREE.Points(coreGeometry, this._glowMat);
    this.fur = new THREE.Points(layerGeometry(layers.fur), this._furMat);
    this.glow.renderOrder = 0.5;
    this.core.renderOrder = 1;
    this.fur.renderOrder = 2;
    this.core.frustumCulled = this.fur.frustumCulled = this.glow.frustumCulled = false;

    this.add(this.occluder, this.glow, this.core, this.fur);
    this.particleCount = layers.core.count + layers.fur.count;
    this.update(0, { run: 1 });
  }

  /** world-size -> pixel conversion; call on resize with the viewport height in device pixels */
  setPointScale(bufferHeight, fovDeg, pixelRatio = 1) {
    this.uniforms.uScale.value = bufferHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
    this.uniforms.uMinSize.value = Math.max(1, 0.9 * pixelRatio);
  }

  /** camera distance used for the subtle depth fade */
  setFocus(distance) {
    this.uniforms.uFocus.value = distance;
  }

  /** opaque enlarged dots with depth: the source image the ASCII pass samples */
  setSolid(on) {
    this.uniforms.uSolid.value = on ? 1 : 0;
    this.uniforms.uDotScale.value = on ? ASCII.solidDotScale : 1;
    this._furMat.blending = on ? THREE.NoBlending : THREE.NormalBlending;
    this._furMat.transparent = !on;
    this._furMat.depthWrite = on;
    this._coreMat.alphaToCoverage = !on;
    this._coreMat.needsUpdate = true;
    this.glow.visible = !on;
  }

  /** @param {number} t seconds; run 0..1 blends idle -> run; assemble 0..1 for the intro */
  update(t, { run = 1, assemble = 1 } = {}) {
    poseMatrices(t, run, this._boneData, this.character, this.contact);
    this._pose = { t, run };
    const bones = this.uniforms.uBones.value;
    for (let i = 0; i < BONE_COUNT; i++) bones[i].fromArray(this._boneData, i * 16);
    this.uniforms.uTime.value = t;
    this.uniforms.uRun.value = run;
    this.uniforms.uAssemble.value = assemble;
  }

  /** paw fingertips and foot soles of the current pose, in the hamster's own space */
  tips() {
    const { t = 0, run = 1 } = this._pose || {};
    return limbTips(t, run, this.character, this.contact, this._boneData);
  }

  dispose() {
    for (const o of [this.occluder, this.core, this.fur]) o.geometry.dispose();
    this._occluderMat.dispose();
    this._coreMat.dispose();
    this._furMat.dispose();
    this._glowMat.dispose();
    this.removeFromParent();
  }
}

// exported for tools/validate-shaders.mjs
export const SHADERS = { VERTEX, FRAGMENT, OCCLUDER_VERTEX };
