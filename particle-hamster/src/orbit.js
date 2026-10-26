// Drag/touch orbit with inertia, sensible pitch limits, slow idle auto-orbit and an eased
// reset to the default right-facing side view. Rotates a group (the "turntable"), so the
// hamster keeps running while it is being inspected.
import { CAMERA, VIEWS } from './shading.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const TAU = Math.PI * 2;

export class Orbit {
  constructor({ yaw = VIEWS.side, pitch = CAMERA.pitch, autoSpeed = 0.16, auto = true, limits = [-0.55, 0.85] } = {}) {
    this.home = { yaw, pitch };
    this.yaw = yaw;
    this.pitch = pitch;
    this.vYaw = 0;
    this.vPitch = 0;
    this.autoSpeed = autoSpeed;
    this.auto = auto;
    this.limits = limits;
    this.dragging = false;
    this.resetting = false;
    this.lastInput = -Infinity;
    this._autoRamp = 0;
  }

  /** Listen for pointer drags on an element. Returns a function that removes the listeners. */
  attach(el) {
    let last = null;
    const down = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      el.setPointerCapture?.(e.pointerId);
      // event timestamps (when the input happened), not handler time: slow frames can't fake a pause
      last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      this._cadence = 16; // typical gap between this device's pointer events (ms)
      this.dragging = true;
      this.resetting = false;
      this.vYaw = this.vPitch = 0;
      this.lastInput = performance.now();
    };
    const move = (e) => {
      if (!this.dragging || !last) return;
      const now = e.timeStamp;
      const rect = el.getBoundingClientRect();
      const k = 4.0 / Math.max(260, Math.min(rect.width, rect.height));
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      const gap = Math.max(8, now - last.t);
      this._cadence = this._cadence * 0.7 + Math.min(gap, 250) * 0.3;
      const dt = gap / 1000;
      this.yaw += dx * k;
      this.pitch = clamp(this.pitch + dy * k * 0.7, ...this.limits);
      // smoothed release velocity for inertia
      this.vYaw = this.vYaw * 0.5 + ((dx * k) / dt) * 0.5;
      this.vPitch = this.vPitch * 0.5 + ((dy * k * 0.7) / dt) * 0.5;
      last = { x: e.clientX, y: e.clientY, t: now };
      this.lastInput = performance.now();
    };
    const up = (e) => {
      if (!this.dragging) return;
      // frame-aligned pointermoves can be delivered after pointerup on slow frames: apply the
      // final delta here, and only treat the release as "held still" if the pointer truly stopped
      const moved = e && last && Math.hypot(e.clientX - last.x, e.clientY - last.y) > 1;
      if (moved) move(e);
      this.dragging = false;
      // "held still" = a pause clearly longer than this device's own input cadence (slow frames
      // deliver pointer events far apart, which must not cancel a fling)
      const pause = (e?.timeStamp ?? performance.now()) - (last?.t ?? 0);
      if (!moved && pause > Math.max(120, 2.5 * (this._cadence || 16))) this.vYaw = this.vPitch = 0;
      last = null;
      this.lastInput = performance.now();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('lostpointercapture', up);
    };
  }

  /** keyboard nudge (arrow keys) */
  nudge(dYaw, dPitch) {
    this.resetting = false;
    this.vYaw += dYaw;
    this.vPitch += dPitch;
    this.lastInput = performance.now();
  }

  reset() {
    this.resetting = true;
    this.vYaw = this.vPitch = 0;
    this.lastInput = performance.now();
  }

  update(dt, now = performance.now()) {
    if (this.dragging) return;
    if (this.resetting) {
      const target = this.home.yaw + Math.round((this.yaw - this.home.yaw) / TAU) * TAU;
      const e = 1 - Math.exp(-dt * 4);
      this.yaw += (target - this.yaw) * e;
      this.pitch += (this.home.pitch - this.pitch) * e;
      if (Math.abs(target - this.yaw) < 1e-3 && Math.abs(this.home.pitch - this.pitch) < 1e-3) {
        this.yaw = this.home.yaw;
        this.pitch = this.home.pitch;
        this.resetting = false;
        this._autoRamp = 0;
        this.lastInput = now;
      }
      return;
    }
    // inertia
    this.yaw += this.vYaw * dt;
    this.pitch = clamp(this.pitch + this.vPitch * dt, ...this.limits);
    const damp = Math.exp(-dt * 3.2);
    this.vYaw *= damp;
    this.vPitch *= damp;
    // slow idle auto-orbit, easing in after a few quiet seconds
    const idle = now - this.lastInput > 2500 && Math.abs(this.vYaw) < 0.05;
    this._autoRamp = clamp(this._autoRamp + (idle && this.auto ? dt : -dt * 3) * 0.6, 0, 1);
    this.yaw += this.autoSpeed * this._autoRamp * dt;
    if (idle) this.pitch += (this.home.pitch - this.pitch) * (1 - Math.exp(-dt * 0.8));
  }

  apply(group) {
    group.rotation.set(this.pitch, this.yaw, 0);
  }
}
