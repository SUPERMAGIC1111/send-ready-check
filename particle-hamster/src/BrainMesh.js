// D1: the Brain as a smooth, opaque, lit 3D mesh. The lobed body is polygonised from the brain
// SDF with marching cubes (three's MarchingCubes, fed our own field) and coloured per vertex
// (pink lobes, deeper creases); the eyes are glossy spheres and the smile and brows are tubes
// laid on the surface. Same interface as ParticleHamster so the stage can host it.
import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { EYES, brainShade, faceCurves, brainBodySdf } from './brainModel.js';
import { LIGHT } from './shading.js';

const srgb = (c) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);

function normalOf(p) {
  const h = 0.003, f = brainBodySdf;
  const g = [f(p[0] + h, p[1], p[2]) - f(p[0] - h, p[1], p[2]), f(p[0], p[1] + h, p[2]) - f(p[0], p[1] - h, p[2]), f(p[0], p[1], p[2] + h) - f(p[0], p[1], p[2] - h)];
  const l = Math.hypot(...g) || 1;
  return g.map((v) => v / l);
}

export class BrainMesh extends THREE.Group {
  /** @param {{field: Float32Array, res: number, extent: number, isolation: number}} F from brainField() */
  constructor(F) {
    super();
    this.name = 'BrainMesh';
    this.contact = false;
    this._disposables = [];
    const keep = (x) => (this._disposables.push(x), x);

    // --- body: marching cubes over our field, copied into a static geometry
    const mc = new MarchingCubes(F.res, new THREE.MeshBasicMaterial(), false, false, 160000);
    mc.isolation = F.isolation;
    mc.field.set(F.field);
    mc.update();
    const n = mc.count;
    const pos = new Float32Array(mc.positionArray.subarray(0, n * 3));
    const nor = new Float32Array(mc.normalArray.subarray(0, n * 3));
    for (let i = 0; i < pos.length; i++) pos[i] *= F.extent;
    const col = new Float32Array(n * 3);
    const curves = faceCurves();
    for (let i = 0; i < n; i++) {
      const p = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
      const sh = brainShade(p, normalOf(p), { smile: [], brows: [] }); // lines are tubes in this mode
      const c = srgb(sh.col);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    mc.geometry.dispose();
    mc.material.dispose();
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const skin = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, emissive: srgb([0.18, 0.04, 0.06]) }));
    this.body = new THREE.Mesh(g, skin);
    this.add(this.body);
    this.triangles = n / 3;

    // --- eyes: white glossy balls, big black pupils, two catch-lights each
    const sclera = keep(new THREE.MeshStandardMaterial({ color: 0xfafaf8, roughness: 0.18, metalness: 0 }));
    const pupilM = keep(new THREE.MeshStandardMaterial({ color: 0x060608, roughness: 0.12, metalness: 0 }));
    const shine = keep(new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const sGeo = keep(new THREE.SphereGeometry(1, 48, 32));
    this.eyes = EYES.map((E) => {
      const eye = new THREE.Group();
      eye.position.set(...E.c);
      const ball = new THREE.Mesh(sGeo, sclera);
      ball.scale.setScalar(E.r);
      const pupil = new THREE.Mesh(sGeo, pupilM);
      pupil.scale.setScalar(E.pupil.r);
      pupil.position.set(E.pupil.c[0] - E.c[0], E.pupil.c[1] - E.c[1], E.pupil.c[2] - E.c[2]);
      const hl = (dir, r) => {
        const d = new THREE.Vector3(...dir).normalize();
        const m = new THREE.Mesh(sGeo, shine);
        m.scale.setScalar(r);
        m.position.copy(pupil.position).addScaledVector(d, E.pupil.r * 0.97);
        return m;
      };
      eye.add(ball, pupil, hl([E.look[0] - 0.15, E.look[1] + 0.5, E.look[2] + 0.18], 0.055), hl([E.look[0] + 0.25, E.look[1] - 0.25, E.look[2] - 0.15], 0.026));
      return eye;
    });
    this.add(...this.eyes);

    // --- smile + brows as soft dark tubes on the surface
    const lineM = keep(new THREE.MeshStandardMaterial({ color: 0x140608, roughness: 0.4 }));
    for (const pts of [curves.smile, ...curves.brows]) {
      const lifted = pts.map((p) => { const nn = normalOf(p); return new THREE.Vector3(p[0] + nn[0] * 0.012, p[1] + nn[1] * 0.012, p[2] + nn[2] * 0.012); });
      const tube = keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lifted), 48, 0.032, 10, false));
      this.add(new THREE.Mesh(tube, lineM));
    }

    // --- lights live with the character (the dot renderers do not use scene lights)
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(...LIGHT.map((v) => v * 5));
    const fill = new THREE.HemisphereLight(0xfff4f0, 0x40202a, 1.1);
    this.add(key, fill);
    this.particleCount = Math.round(this.triangles);
  }

  // interface parity with ParticleHamster
  setPointScale() {}
  setFocus() {}
  setSizeK() {}
  setSolid() {}
  tips() { return []; }

  update(t, { assemble = 1 } = {}) {
    // gentle float and a blink every few seconds
    this.position.y = 0.04 * Math.sin(t * 1.6);
    this.rotation.z = 0.03 * Math.sin(t * 0.9);
    const ph = t % 3.7, blink = ph < 0.16 ? Math.sin((ph / 0.16) * Math.PI) : 0;
    for (const e of this.eyes) e.scale.set(1, 1 - 0.85 * blink, 1);
    this.scale.setScalar(0.6 + 0.4 * assemble);
  }

  dispose() {
    for (const d of this._disposables) d.dispose();
    this.removeFromParent();
  }
}
