// One self-contained 3D experience: a character (optionally inside a particle orb) on a
// turntable, with its own camera, orbit controls, run clock and Dots/ASCII mode. The gallery
// renders several stages into sub-viewports of one canvas; index.html renders one full-window.
import * as THREE from 'three';
import { animate } from 'motion';
import { ParticleHamster } from './ParticleHamster.js';
import { ParticleOrb } from './ParticleOrb.js';
import { AsciiPass } from './asciiPass.js';
import { Orbit } from './orbit.js';
import { CHARACTERS } from './characters.js';
import { CAMERA } from './shading.js';
import { loadHamster } from './loadHamster.js';
import { limbTips, runPeriod } from './hamsterModel.js';

const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export class HamsterStage {
  /**
   * Where to place a V3 hamster inside an orb of radius R so that, over one stride, the paws just
   * reach the front of the shell and the feet just reach its floor, without the head, ears, nose or
   * tail ever passing through it. Grid search over the offset in the side plane.
   */
  static solveContactOffset(character, R) {
    const cfg = CHARACTERS[character], A = cfg.anatomy;
    const period = runPeriod(character);
    const paws = [], feet = [];
    for (let k = 0; k < 24; k++) {
      for (const { name, p } of limbTips((k / 24) * period, 1, character, true)) (name.startsWith('paw') ? paws : feet).push(p);
    }
    const body = [
      [A.head.c[0], A.head.c[1] + A.head.r[1] + 0.25, 0], // crown
      [A.ear.c[0], A.ear.c[1] + A.ear.r[1], A.ear.c[2]],
      [A.nose.c[0] + A.nose.r[0] + 0.04, A.nose.c[1], 0],
      [A.tail.c[0] - A.tail.r[0] - 0.12, A.tail.c[1], 0],
      [A.head.c[0], A.head.c[1], A.head.r[2] + 0.12],
    ];
    const far = (pts, o) => Math.max(...pts.map((p) => Math.hypot(p[0] + o[0], p[1] + o[1], p[2])));
    let best = null;
    for (let ox = -1.2; ox <= 1.2; ox += 0.02)
      for (let oy = -1.2; oy <= 1.2; oy += 0.02) {
        const o = [ox, oy, 0];
        const ep = far(paws, o) - (R - 0.04), ef = far(feet, o) - (R - 0.04), eb = Math.max(0, far(body, o) - (R - 0.08));
        const cost = ep * ep + 0.6 * ef * ef + 20 * eb * eb + 0.02 * (ox * ox + oy * oy);
        if (!best || cost < best.cost) best = { cost, o };
      }
    return best.o;
  }

  /**
   * @param {THREE.WebGLRenderer} renderer shared renderer
   * @param {{character: string, orb?: boolean, reducedMotion?: boolean, time?: number}} opts
   */
  constructor(renderer, { character = 'orange', orb = false, reducedMotion = false, time = 0 } = {}) {
    this.renderer = renderer;
    this.character = character;
    this.reducedMotion = reducedMotion;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 60);
    this.turntable = new THREE.Group();
    this.turntable.position.y = CAMERA.lookY;
    this.scene.add(this.turntable);
    this.orbit = new Orbit({ auto: !reducedMotion });
    this.orb = orb ? new ParticleOrb(CHARACTERS[character].orb) : null;
    if (this.orb) this.turntable.add(this.orb);
    // V3 in an orb: the hamster runs against the inside of the shell, paws pressing the wall
    this.contactMode = !!(this.orb && CHARACTERS[character].run.contact);
    if (this.contactMode) this.contactOffset = HamsterStage.solveContactOffset(character, this.orb.style.radius);
    this.ascii = new AsciiPass(renderer);
    this.mode = 'dots';
    this.time = time;
    this.orbTime = time;
    this.running = !reducedMotion;
    this.paused = false;
    this.runBlend = { v: this.running ? 1 : 0 };
    this.intro = { v: reducedMotion ? 1 : 0 };
    this.hamster = null;
    this.size = { w: 0, h: 0, dpr: 1 };
    this.ready = loadHamster(character).then((layers) => {
      this.hamster = new ParticleHamster(layers, character);
      this.hamster.setSolid(this.mode === 'ascii');
      if (this.contactMode) {
        this.hamster.contact = true;
        this.hamster.position.set(...this.contactOffset);
      }
      this.turntable.add(this.hamster);
      this._applySize();
      if (this.intro.v < 1) animate(this.intro, { v: 1 }, { duration: 1.4, ease: [0.22, 1, 0.36, 1] });
      return this;
    });
  }

  get particleCount() {
    return (this.hamster?.particleCount ?? 0) + (this.orb?.particleCount ?? 0);
  }

  setRunning(on) {
    this.running = on;
    animate(this.runBlend, { v: on ? 1 : 0 }, { duration: this.reducedMotion ? 0 : 0.5, ease: 'easeInOut' });
  }

  setMode(mode) {
    this.mode = mode;
    this.hamster?.setSolid(mode === 'ascii');
  }

  setAutoOrbit(on) {
    this.orbit.auto = on;
  }

  /** cssW/cssH: viewport size in CSS px */
  resize(cssW, cssH, dpr) {
    if (cssW === this.size.w && cssH === this.size.h && dpr === this.size.dpr) return;
    this.size = { w: cssW, h: cssH, dpr };
    this._applySize();
  }

  _applySize() {
    const { w, h, dpr } = this.size;
    if (!w || !h) return;
    const cam = this.camera;
    cam.aspect = w / h;
    // frame the hamster (or the whole orb) on wide and narrow viewports alike
    // V3 characters (giant heads, crown tufts) need a little more room than V2
    const big = !!CHARACTERS[this.character].run.contact;
    const halfH = this.orb ? 2.42 : big ? 1.95 : 1.62, halfW = this.orb ? 2.42 : big ? 2.05 : 1.8;
    const t = Math.tan((CAMERA.fov * Math.PI) / 360);
    const dist = Math.max(halfH / t, halfW / (t * cam.aspect));
    const zm = this.zoom; // optional QA close-up: { z, fx, fy }
    cam.position.set(zm ? zm.fx * 0.9 : 0, zm ? zm.fy : 0, zm ? dist / zm.z : dist);
    cam.lookAt(zm ? zm.fx * 0.9 : 0, zm ? zm.fy : 0, 0);
    cam.updateProjectionMatrix();
    this.hamster?.setPointScale(h * dpr, CAMERA.fov, dpr);
    this.hamster?.setFocus(dist);
    this.orb?.setPointScale(h * dpr, CAMERA.fov, dpr);
    this.ascii.setSize(Math.round(w * dpr), Math.round(h * dpr), dpr);
  }

  update(dt) {
    this.orbit.update(dt);
    this.orbit.apply(this.turntable);
    if (!this.paused) {
      this.time += dt;
      this.orbTime += this.reducedMotion ? 0 : dt;
    }
    this.hamster?.update(this.time, { run: this.runBlend.v, assemble: this.intro.v });
    if (this.contactMode && this.hamster) {
      const R = this.orb.style.radius, o = this.contactOffset;
      const touch = this.hamster.tips().map(({ name, p }) => {
        const q = [p[0] + o[0], p[1] + o[1], p[2] + o[2]];
        const d = Math.hypot(...q);
        const paw = name.startsWith('paw');
        const s = smooth((d - (R - (paw ? 0.2 : 0.16))) / (paw ? 0.17 : 0.12)) * (paw ? 1 : 0.45) * this.runBlend.v * this.intro.v;
        return { p: q, s };
      });
      this.orb.setContacts(touch);
      this.contacts = touch;
    }
    this.orb?.update(this.orbTime, 1, this.contactMode ? this.runBlend.v * (this.reducedMotion ? 0 : 0.35) : 0);
  }

  /** draws into the renderer's current viewport/scissor; rect is that viewport (CSS px, bottom-left origin) */
  render(rect) {
    if (this.mode === 'ascii') this.ascii.render(this.scene, this.camera, rect);
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.hamster?.dispose();
    this.orb?.dispose();
    this.ascii.dispose();
  }
}
