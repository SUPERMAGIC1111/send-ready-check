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

export class HamsterStage {
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
    const halfH = this.orb ? 2.42 : 1.62, halfW = this.orb ? 2.42 : 1.8;
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
    this.orb?.update(this.orbTime);
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
