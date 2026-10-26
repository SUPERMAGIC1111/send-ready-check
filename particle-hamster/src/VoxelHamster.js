// Micro-voxel renderer: every voxel is a real 3D cube (instanced box geometry), skinned on the GPU
// with the character's bone matrices, so the blocks run with the rig. Opaque and depth-tested:
// correct occlusion with no halo. Faces are lit by their own normal and cube edges are darkened a
// little, so the block structure reads from every angle. Same interface as ParticleHamster.
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
  attribute vec3 aCenter;
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
  void main() {
    mat4 A = uBones[int(aBoneA + 0.5)];
    mat4 B = uBones[int(aBoneB + 0.5)];
    vec3 c = mix((A * vec4(aCenter, 1.0)).xyz, (B * vec4(aCenter, 1.0)).xyz, aWeight);
    // cubes turn with their bone (blend of the two rotations), so they stay attached when limbs swing
    mat3 R = mat3(A) * (1.0 - aWeight) + mat3(B) * aWeight;
    float s = uVox * (0.92 + 0.08 * uAssemble);
    vec3 p = c + R * (position * s);
    vLocal = position;
    vNormal = normalize(normalMatrix * (R * normal));
    vColor = aColor;
    vKind = aKind;
    vFlag = aFlag;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uLight;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vLocal;
  varying float vKind;
  varying float vFlag;
  void main() {
    vec3 n = normalize(vNormal);
    float diff = clamp((dot(n, uLight) + 0.5) / 1.5, 0.0, 1.0);
    // darker cube edges: a crisp block structure without an outline pass
    vec3 q = abs(vLocal) * 2.0;
    float e = (step(0.82, q.x) + step(0.82, q.y) + step(0.82, q.z));
    float edge = e > 1.5 ? 0.78 : 1.0;
    vec3 col;
    if (vKind > 2.5 && vKind < 3.5) col = vFlag > 0.5 ? vec3(1.0) : vColor * (0.9 + 0.2 * diff);
    else if (vKind > 3.5) col = vColor * (0.85 + 0.2 * diff);
    else col = vColor * (0.58 + 0.55 * diff);
    gl_FragColor = vec4(col * edge, 1.0);
  }
`;

export class VoxelHamster extends THREE.Group {
  /**
   * @param {object} voxels output of voxelize() (in layers.voxel)
   * @param {string} character id (rig and run personality)
   */
  constructor(voxels, character) {
    super();
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
    };
    const box = new THREE.BoxGeometry(1, 1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = box.index;
    g.setAttribute('position', box.getAttribute('position'));
    g.setAttribute('normal', box.getAttribute('normal'));
    const ia = (arr, k) => new THREE.InstancedBufferAttribute(arr, k);
    g.setAttribute('aCenter', ia(voxels.center, 3));
    g.setAttribute('aColor', ia(voxels.color, 3));
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
    this.add(this.mesh);
    this.particleCount = voxels.count;
    this.update(0, { run: 1 });
  }

  // interface parity with ParticleHamster
  setPointScale() {}
  setFocus() {}
  setSizeK() {}
  setSolid() {}

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
    this.removeFromParent();
  }
}

export const VOXEL_SHADERS = { VERTEX, FRAGMENT };
