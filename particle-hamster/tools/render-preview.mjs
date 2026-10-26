// Headless CPU renderer of the exact dot data + rig used by the WebGL module (no browser).
// DOTS: additive soft dots, occluded by a dense depth cloud (stands in for the GPU occluder).
// ASCII: opaque enlarged dots -> 2x2 samples per cell -> glyph by brightness, tinted by colour,
// drawn with a built-in 5x7 bitmap font (the browser uses the system monospace font instead).
// Usage: node tools/render-preview.mjs [outDir]   CHAR=orange|purple|golden  ONLY=views,run,detail,ascii
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildHamster, poseMatrices, runPeriod } from '../src/hamsterModel.js';
import { shadeDot, asciiDotScale, VIEWS, CAMERA, ASCII } from '../src/shading.js';

const CHAR = process.env.CHAR || 'orange';
const RUN_PERIOD = runPeriod(CHAR);
import { encodePNG } from './png.mjs';

const outDir = process.argv[2] || new URL('../captures/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const t0 = Date.now();
const model = buildHamster(CHAR, { depthCloud: true });
console.log(`built ${model.counts.core} surface dots + ${model.counts.fur} fluff dots in ${Date.now() - t0}ms`);

function makeProjector({ yaw, pitch, time, run, W, H, zoom, center }) {
  const f = (H / (2 * Math.tan((CAMERA.fov * Math.PI) / 360))) * zoom;
  const D = CAMERA.distance;
  const bones = poseMatrices(time, run, undefined, CHAR);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const rot = (x, y, z) => {
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
  };
  return (L, i, isFur) => {
    const a = L.boneA[i] * 16, b = L.boneB[i] * 16, w = L.weight[i];
    const px = L.position[i * 3], py = L.position[i * 3 + 1], pz = L.position[i * 3 + 2];
    const nx = L.normal[i * 3], ny = L.normal[i * 3 + 1], nz = L.normal[i * 3 + 2];
    const p = [], n = [];
    for (let k = 0; k < 3; k++) {
      const pa = bones[a + k] * px + bones[a + 4 + k] * py + bones[a + 8 + k] * pz + bones[a + 12 + k];
      const pb = bones[b + k] * px + bones[b + 4 + k] * py + bones[b + 8 + k] * pz + bones[b + 12 + k];
      const na = bones[a + k] * nx + bones[a + 4 + k] * ny + bones[a + 8 + k] * nz;
      const nb = bones[b + k] * nx + bones[b + 4 + k] * ny + bones[b + 8 + k] * nz;
      p.push(pa + (pb - pa) * w);
      n.push(na + (nb - na) * w);
    }
    if (isFur) {
      // same loose-dot motion as the vertex shader
      const sw = Math.sin(time * (4 + 7 * run) + L.seed[i] * 6.2831), tt = L.strandT[i];
      p[0] += (-0.02 * run - 0.004) * tt; p[1] += 0.012 * sw * tt; p[2] += 0.008 * sw * tt;
      const d = Math.pow(Math.max(0, Math.sin(time * 0.6 + L.seed[i] * 40)), 6) * L.flag[i];
      for (let k = 0; k < 3; k++) p[k] += n[k] * d * 0.3 + [-0.18, 0.1, 0][k] * d;
    }
    const v = rot(...p);
    v[1] += CAMERA.lookY;
    const nv = rot(...n);
    const nl = Math.hypot(...nv) || 1;
    const depth = D - v[2];
    return { sx: W / 2 + (f * (v[0] - center[0])) / depth, sy: H / 2 - (f * (v[1] - center[1])) / depth, depth, n: nv.map((q) => q / nl), f };
  };
}

function depthBuffer(project, W, H) {
  const zb = new Float32Array(W * H).fill(Infinity);
  const L = model.depth;
  for (let i = 0; i < L.count; i++) {
    const pr = project(L, i, false);
    const r = Math.max(1, (0.03 * pr.f) / pr.depth / 2);
    for (let y = Math.max(0, Math.floor(pr.sy - r)); y <= Math.min(H - 1, Math.ceil(pr.sy + r)); y++)
      for (let x = Math.max(0, Math.floor(pr.sx - r)); x <= Math.min(W - 1, Math.ceil(pr.sx + r)); x++)
        if (Math.hypot(x + 0.5 - pr.sx, y + 0.5 - pr.sy) <= r && pr.depth < zb[y * W + x]) zb[y * W + x] = pr.depth;
  }
  return zb;
}

const SS = 2;
function renderDots({ yaw, pitch = CAMERA.pitch, time = 0, run = 1, size = 520, zoom = 1, center = [0, 0] }) {
  const W = size * SS, H = size * SS;
  const project = makeProjector({ yaw, pitch, time, run, W, H, zoom, center });
  const zb = depthBuffer(project, W, H);
  const col = new Float32Array(W * H * 3);
  const dz = new Float32Array(W * H).fill(Infinity); // surface dots are opaque and depth-tested, as on the GPU
  for (const [L, isFur] of [[model.core, false], [model.fur, true]]) {
    for (let i = 0; i < L.count; i++) {
      const pr = project(L, i, isFur);
      const cx = Math.min(W - 1, Math.max(0, Math.round(pr.sx))), cyy = Math.min(H - 1, Math.max(0, Math.round(pr.sy)));
      if (!process.env.NO_OCC && pr.depth > zb[cyy * W + cx] + 0.06) continue; // hidden behind the body
      const rest = [L.position[i * 3], L.position[i * 3 + 1], L.position[i * 3 + 2]];
      const rgb = shadeDot([L.color[i * 3], L.color[i * 3 + 1], L.color[i * 3 + 2]], pr.n, rest, L.kind[i], L.flag[i], L.seed[i], time, isFur, pr.depth, L.strandT[i]);
      const r = Math.max(0.6 * SS, (L.size[i] * pr.f) / pr.depth / 2);
      for (let y = Math.max(0, Math.floor(pr.sy - r)); y <= Math.min(H - 1, Math.ceil(pr.sy + r)); y++)
        for (let x = Math.max(0, Math.floor(pr.sx - r)); x <= Math.min(W - 1, Math.ceil(pr.sx + r)); x++) {
          const d = Math.hypot(x + 0.5 - pr.sx, y + 0.5 - pr.sy) / r;
          if (d > 1) continue;
          const t = Math.min(1, Math.max(0, (1 - d) / 0.38));
          const a = L.alpha[i] * t * t * (3 - 2 * t);
          const k = y * W + x;
          if (pr.depth > dz[k]) continue;
          const shade = 1.04 - 0.1 * d * d;
          if (!isFur) { if (a < 0.5) continue; dz[k] = pr.depth; }
          const w = isFur ? a : 1;
          for (let c = 0; c < 3; c++) col[k * 3 + c] += (Math.min(1, rgb[c] * shade) - col[k * 3 + c]) * w;
        }
    }
  }
  return downsample(col, W, H, size);
}

function downsample(col, W, H, size) {
  const out = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) s += col[((y * SS + j) * W + x * SS + i) * 3 + c];
        out[(y * size + x) * 3 + c] = Math.round(Math.min(1, s / (SS * SS)) * 255);
      }
  return { w: size, h: size, rgb: out };
}

// ---- ASCII
const FONT = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 12, 12],
  ':': [0, 12, 12, 0, 12, 12, 0],
  '-': [0, 0, 0, 31, 0, 0, 0],
  '=': [0, 0, 31, 0, 31, 0, 0],
  '+': [0, 4, 4, 31, 4, 4, 0],
  '*': [0, 21, 14, 31, 14, 21, 0],
  '#': [10, 10, 31, 10, 31, 10, 10],
  '%': [25, 26, 2, 4, 8, 11, 19],
  '@': [14, 17, 23, 21, 23, 16, 15],
};
function renderAscii({ yaw, pitch = CAMERA.pitch, time = 0, run = 1, size = 840 }) {
  const scale = 2; // 5x7 glyph drawn 2x inside a 14x22 cell (same 7:11 cell as the browser)
  const cw = ASCII.cell[0] * scale, ch = ASCII.cell[1] * scale;
  const cols = Math.floor(size / cw), rows = Math.floor(size / ch);
  const W = cols * 2, H = rows * 2; // 2x2 samples per cell, like the GPU pass
  // solid pass: opaque enlarged dots with a z-buffer
  const Hs = Math.round((W * rows * ch) / (cols * cw)); // keep pixel aspect of the cell grid
  const proj2 = makeProjector({ yaw, pitch, time, run, W, H: Hs, zoom: 1, center: [0, 0] });
  // depth cloud stands in for the GPU occluder: holes (pupils, eye ring) stay black
  const occ = depthBuffer(proj2, W, Hs);
  const zb = new Float32Array(W * Hs).fill(Infinity), col = new Float32Array(W * Hs * 3);
  for (const [L, isFur] of [[model.core, false], [model.fur, true]])
    for (let i = 0; i < L.count; i++) {
      const pr = proj2(L, i, isFur);
      const ox = Math.min(W - 1, Math.max(0, Math.round(pr.sx))), oy = Math.min(Hs - 1, Math.max(0, Math.round(pr.sy)));
      if (pr.depth > occ[oy * W + ox] + 0.06) continue;
      const rest = [L.position[i * 3], L.position[i * 3 + 1], L.position[i * 3 + 2]];
      const rgb = shadeDot([L.color[i * 3], L.color[i * 3 + 1], L.color[i * 3 + 2]], pr.n, rest, L.kind[i], L.flag[i], L.seed[i], time, isFur, pr.depth, L.strandT[i]);
      const r = Math.max(0.5, (L.size[i] * asciiDotScale(L.kind[i]) * pr.f) / pr.depth / 2);
      for (let y = Math.max(0, Math.floor(pr.sy - r)); y <= Math.min(Hs - 1, Math.ceil(pr.sy + r)); y++)
        for (let x = Math.max(0, Math.floor(pr.sx - r)); x <= Math.min(W - 1, Math.ceil(pr.sx + r)); x++) {
          if (Math.hypot(x + 0.5 - pr.sx, y + 0.5 - pr.sy) > r) continue;
          const k = y * W + x;
          // 8-bit render target on the GPU: colours clamp to 0..1
          let g = ASCII.solidGain * (L.kind[i] === 1 ? ASCII.whiteFurGain : 1);
          if (L.kind[i] === 3) g = (rgb[0] + rgb[1] + rgb[2]) / 3 > 0.9 ? 1 : 0; // eyes: dark holes + catch-light
          if (pr.depth < zb[k]) { zb[k] = pr.depth; col[k * 3] = Math.min(1, rgb[0] * g); col[k * 3 + 1] = Math.min(1, rgb[1] * g); col[k * 3 + 2] = Math.min(1, rgb[2] * g); }
        }
    }
  if (process.env.DUMP_SOLID) {
    const im = new Uint8Array(W * Hs * 3);
    for (let k = 0; k < W * Hs * 3; k++) im[k] = Math.round(Math.min(1, col[k]) * 255);
    writeFileSync(process.env.DUMP_SOLID, encodePNG(W, Hs, im));
  }
  const outW = cols * cw, outH = rows * ch, out = new Uint8Array(outW * outH * 3);
  const ramp = ASCII.ramp;
  const sy = Hs / rows;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const avg = [0, 0, 0];
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const x = Math.min(W - 1, Math.floor((c + ox) * 2)), y = Math.min(Hs - 1, Math.floor((r + oy) * sy));
        for (let k = 0; k < 3; k++) avg[k] += col[(y * W + x) * 3 + k] / 4;
      }
      const v = 0.3 * avg[0] + 0.59 * avg[1] + 0.11 * avg[2];
      const idx = Math.floor(Math.min(0.999, Math.max(0, v * ASCII.lumScale)) * ramp.length);
      if (idx < 1) continue;
      const glyph = FONT[ramp[idx]];
      const peak = Math.max(...avg, 1e-3);
      const tint = avg.map((q) => Math.min(1, (q / peak) * (0.45 + 0.75 * Math.min(v, 1))));
      for (let gy = 0; gy < 7; gy++)
        for (let gx = 0; gx < 5; gx++) {
          if (!((glyph[gy] >> (4 - gx)) & 1)) continue;
          for (let sy2 = 0; sy2 < scale; sy2++)
            for (let sx2 = 0; sx2 < scale; sx2++) {
              const X = c * cw + scale + gx * scale + sx2, Y = r * ch + 2 * scale + gy * scale + sy2;
              const k = (Y * outW + X) * 3;
              out[k] = tint[0] * 255; out[k + 1] = tint[1] * 255; out[k + 2] = tint[2] * 255;
            }
        }
    }
  return { w: outW, h: outH, rgb: out };
}

function sheet(images, cols) {
  const w = images[0].w, h = images[0].h, rows = Math.ceil(images.length / cols);
  const W = w * cols, H = h * rows, rgb = new Uint8Array(W * H * 3);
  images.forEach((im, idx) => {
    const ox = (idx % cols) * w, oy = Math.floor(idx / cols) * h;
    for (let y = 0; y < h; y++) rgb.set(im.rgb.subarray(y * w * 3, (y + 1) * w * 3), ((oy + y) * W + ox) * 3);
  });
  return { w: W, h: H, rgb };
}
const save = (name, im) => writeFileSync(`${outDir}/${name}.png`, encodePNG(im.w, im.h, im.rgb));

const which = process.env.ONLY || 'views,run,detail,ascii';
if (which.includes('views')) {
  const ims = Object.entries(VIEWS).map(([name, yaw]) => {
    const im = renderDots({ yaw, time: 0.05 });
    save(`${CHAR}-view-${name}`, im);
    return im;
  });
  save(`${CHAR}-sheet-views`, sheet(ims.slice(0, 6), 3));
}
if (which.includes('run')) {
  const ims = [0, 1, 2, 3, 4, 5].map((k) => renderDots({ yaw: VIEWS.side, time: (k / 6) * RUN_PERIOD, size: 360 }));
  save(`${CHAR}-sheet-run-cycle`, sheet(ims, 3));
}
if (which.includes('detail')) {
  save(`${CHAR}-detail-face`, renderDots({ yaw: VIEWS.side, time: 0.05, zoom: 2.4, center: [0.75, 0.2] }));
  save(`${CHAR}-detail-body`, renderDots({ yaw: VIEWS.side, time: 0.05, zoom: 2.6, center: [-0.45, -0.35] }));
  save(`${CHAR}-detail-ear-paw`, renderDots({ yaw: VIEWS['three-quarter'], time: 0.05, zoom: 1.7, center: [0.35, 0.1] }));
}
if (which.includes('ascii')) {
  // size 1600 with 2x glyphs = the browser's 7x11px cells on an 800px-tall (desktop) viewport
  for (const v of process.env.ASCII_VIEWS?.split(',') ?? ['side', 'three-quarter', 'front']) save(`${CHAR}-ascii-${v}`, renderAscii({ yaw: VIEWS[v], time: 0.05, size: 1600 }));
}
console.log(`done in ${Date.now() - t0}ms -> ${outDir}`);
