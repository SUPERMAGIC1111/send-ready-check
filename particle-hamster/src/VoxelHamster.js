// Micro-voxel renderer: every voxel is a real 3D cube (instanced box geometry), skinned on the GPU
// with the character's bone matrices, so the blocks run with the rig. Opaque and depth-tested:
// correct occlusion with no halo. Faces are lit by their own normal and cube edges are darkened a
// little, so the block structure reads from every angle. Same interface as ParticleHamster.
// An optional `style` (texture lab) restyles the same voxels without another renderer: palette
// tint, rounded "pillow" voxels, gloss, luminous rim, inner light and a translucent outer layer.
// Every style value defaults to the plain Micro-Voxel look, so existing variants are unchanged.
import * as THREE from 'three';
import { BONES, poseMatrices, limbTips } from './hamsterModel.js';
import { CHARACTERS } from './characters.js';
import { LIGHT } from './shading.js';

const BONE_COUNT = BONES.length;

const VERTEX = /* glsl */ `
  uniform mat4 uBones[${BONE_COUNT}];
  uniform float uVox;
  uniform float uAssemble;
  uniform float uTime;
  uniform float uShell;      // SOFT outer layer: push the cube out along its surface normal (voxels)
  uniform float uShellScale; // and enlarge it, so neighbouring shell cubes overlap (no gaps)
  attribute vec3 aCenter;
  attribute vec3 aNormal;
  attribute vec3 aColor;
  attribute float aBoneA;
  attribute float aBoneB;
  attribute float aWeight;
  attribute float aKind;
  attribute float aFlag;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vLocal;
  varying float vKind;
  varying float vFlag;
  varying vec3 vBend;    // view-space direction from the cube centre to this point (rounded voxels)
  varying vec3 vViewPos;
  void main() {
    mat4 A = uBones[int(aBoneA + 0.5)];
    mat4 B = uBones[int(aBoneB + 0.5)];
    vec3 c = mix((A * vec4(aCenter, 1.0)).xyz, (B * vec4(aCenter, 1.0)).xyz, aWeight);
    // cubes turn with their bone (blend of the two rotations), so they stay attached when limbs swing
    mat3 R = mat3(A) * (1.0 - aWeight) + mat3(B) * aWeight;
    c += normalize(R * aNormal) * uShell * uVox;
    float s = uVox * uShellScale * (0.92 + 0.08 * uAssemble);
    vec3 p = c + R * (position * s);
    vLocal = position;
    vNormal = normalize(normalMatrix * (R * normal));
    vBend = normalMatrix * (R * position);
    vViewPos = (modelViewMatrix * vec4(p, 1.0)).xyz;
    vColor = aColor;
    vKind = aKind;
    vFlag = aFlag;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uLight;
  uniform float uAlpha;
  uniform float uTint;      // 1: recolour the body (kind 0/1) from its brightness: deep -> light -> hi
  uniform vec3 uDeep;
  uniform vec3 uLite;
  uniform vec3 uHi;
  uniform float uRound;     // 0 = sharp cubes; 1 = rounded pillow voxels (bent normal, soft edges)
  uniform float uGloss;     // specular highlight
  uniform float uRim;       // luminous fresnel edge
  uniform float uInner;     // soft internal light on the shadow side
  uniform float uCoreDark;  // body colour under a translucent layer (layered depth)
  uniform float uShellFace; // outer layer: 0 = no shell over the face; 1 = face rides on top, opaque
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vLocal;
  varying float vKind;
  varying float vFlag;
  varying vec3 vBend;
  varying vec3 vViewPos;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 q = abs(vLocal) * 2.0;
    float edge;
    if (uRound > 0.0) {
      // pillow voxel: tilt the normal towards the edges, darken softly near them (no hard lines)
      vec3 t = vBend - dot(vBend, n) * n;
      n = normalize(n + uRound * 1.4 * t);
      float second = q.x + q.y + q.z - max(q.x, max(q.y, q.z)) - min(q.x, min(q.y, q.z));
      edge = 1.0 - 0.28 * uRound * smoothstep(0.55, 1.0, second);
    } else {
      // darker cube edges: a crisp block structure without an outline pass
      float e = (step(0.82, q.x) + step(0.82, q.y) + step(0.82, q.z));
      edge = e > 1.5 ? 0.78 : 1.0;
    }
    float diff = clamp((dot(n, uLight) + 0.5) / 1.5, 0.0, 1.0);
    vec3 v = normalize(-vViewPos);
    float spec = uGloss * pow(max(dot(n, normalize(uLight + v)), 0.0), 36.0);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.5);
    vec3 base = vColor;
    if (uTint > 0.5 && vKind < 1.5) {
      float l = dot(vColor, vec3(0.3, 0.59, 0.11));
      base = mix(uDeep, uLite, smoothstep(0.42, 0.78, l));
      base = mix(base, uHi, smoothstep(0.7, 0.86, l));
    }
    vec3 col;
    if (vKind > 2.5 && vKind < 3.5) col = vFlag > 0.5 ? vec3(1.0) : base * (0.9 + 0.2 * diff) + spec;
    else if (vKind > 3.5) col = base * (0.85 + 0.2 * diff) + 0.5 * spec;
    else col = base * (0.58 + 0.55 * diff);
  #ifdef SHELL
    if (vKind > 1.5) {
      // soft outer layer: eyes, nose, mouth and pink skin stay crisp underneath (no shell over
      // them), or (uShellFace) ride on top of the translucent layer, opaque and glossy
      if (uShellFace < 0.5) discard;
      gl_FragColor = vec4(col * edge, 1.0);
      return;
    }
    vec3 sc = mix(base * (0.75 + 0.4 * diff), vec3(1.0), 0.12) + spec + uRim * fres * mix(uHi, vec3(1.0), 0.3);
    gl_FragColor = vec4(sc, min(1.0, uAlpha + 0.5 * uRim * fres));
  #else
    if (vKind < 1.5) {
      col *= uCoreDark;
      col += uInner * (1.0 - diff) * mix(base, uHi, 0.4) * 0.6 + spec + uRim * 0.35 * fres * uHi;
    }
    gl_FragColor = vec4(col * edge, 1.0);
  #endif
  }
`;

export class VoxelHamster extends THREE.Group {
  /**
   * @param {object} voxels output of voxelize() (in layers.voxel)
   * @param {string} character id (rig and run personality)
   */
  constructor(voxels, character, style = null) {
    super();
    this.style = style;
    // style colours are display values, like the voxel colours themselves (no colour-space conversion)
    const S = style || {}, rgb = (c, d) => new THREE.Vector3(...(c || d));
    this.name = 'VoxelHamster';
    this.character = CHARACTERS[character];
    this.contact = false;
    this._boneData = new Float32Array(BONE_COUNT * 16);
    this.uniforms = {
      uBones: { value: Array.from({ length: BONE_COUNT }, () => new THREE.Matrix4()) },
      uVox: { value: voxels.size },
      uAssemble: { value: 1 },
      uTime: { value: 0 },
      uLight: { value: new THREE.Vector3(...LIGHT) },
      uShell: { value: 0 },
      uShellScale: { value: 1 },
      uAlpha: { value: 1 },
      uTint: { value: S.tint ? 1 : 0 },
      uDeep: { value: rgb(S.tint?.deep, [0, 0, 0]) },
      uLite: { value: rgb(S.tint?.light, [1, 1, 1]) },
      uHi: { value: rgb(S.tint?.hi, [1, 1, 1]) },
      uRound: { value: S.round ?? 0 },
      uGloss: { value: S.gloss ?? 0 },
      uRim: { value: S.rim ?? 0 },
      uInner: { value: S.inner ?? 0 },
      uCoreDark: { value: S.coreDark ?? 1 },
      uShellFace: { value: S.shell ? 1 : 0 },
    };
    const box = new THREE.BoxGeometry(1, 1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = box.index;
    g.setAttribute('position', box.getAttribute('position'));
    g.setAttribute('normal', box.getAttribute('normal'));
    const ia = (arr, k) => new THREE.InstancedBufferAttribute(arr, k);
    g.setAttribute('aCenter', ia(voxels.center, 3));
    g.setAttribute('aColor', ia(voxels.color, 3));
    g.setAttribute('aNormal', ia(voxels.normal, 3));
    g.setAttribute('aBoneA', ia(voxels.boneA, 1));
    g.setAttribute('aBoneB', ia(voxels.boneB, 1));
    g.setAttribute('aWeight', ia(voxels.weight, 1));
    g.setAttribute('aKind', ia(voxels.kind, 1));
    g.setAttribute('aFlag', ia(voxels.flag, 1));
    g.instanceCount = voxels.count;
    this._box = box;
    this.material = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    // SOFT TRANSLUCENT: the opaque cubes stay as the inner body; a second, translucent layer of the
    // same cubes sits half a voxel further out. It writes depth, so only its nearest layer blends
    // over the body (you never see through the hamster), and it is drawn after the body.
    this.shellMaterial = new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, uShell: { value: S.shell?.offset ?? 0.5 }, uShellScale: { value: S.shell?.scale ?? 1.25 }, uAlpha: { value: S.shell?.alpha ?? 0.42 } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      defines: { SHELL: '' },
      transparent: true,
      depthWrite: true,
    });
    this.shell = new THREE.Mesh(g, this.shellMaterial);
    this.shell.frustumCulled = false;
    this.shell.renderOrder = 3;
    this.shell.visible = !!S.shell; // a style with its own translucent layer always shows it
    this.add(this.mesh, this.shell);
    this.particleCount = voxels.count;
    this.update(0, { run: 1 });
  }

  // interface parity with ParticleHamster
  setPointScale() {}
  setFocus() {}
  setSizeK() {}
  setSolid() {}

  /** SOLID (false) or SOFT TRANSLUCENT (true) */
  setSoft(on) {
    if (this.style?.shell) return;
    this.shell.visible = !!on;
  }

  update(t, { run = 1, assemble = 1 } = {}) {
    poseMatrices(t, run, this._boneData, this.character, this.contact);
    this._pose = { t, run };
    const bones = this.uniforms.uBones.value;
    for (let i = 0; i < BONE_COUNT; i++) bones[i].fromArray(this._boneData, i * 16);
    this.uniforms.uAssemble.value = assemble;
    this.uniforms.uTime.value = t;
  }

  tips() {
    const { t = 0, run = 1 } = this._pose || {};
    return limbTips(t, run, this.character, this.contact, this._boneData);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this._box.dispose();
    this.material.dispose();
    this.shellMaterial.dispose();
    this.removeFromParent();
  }
}

export const VOXEL_SHADERS = { VERTEX, FRAGMENT };
