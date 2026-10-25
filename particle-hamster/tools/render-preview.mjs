// Headless CPU splat renderer of the exact particle data + rig used by the WebGL module.
// Not the WebGL output itself — a faithful-as-possible stand-in for checking shape/colour
// without opening a browser. Usage: node tools/render-preview.mjs [outDir]
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildHamster, poseMatrices } from '../src/hamsterModel.js';
import { shadeParticle, VIEWS, CAMERA } from '../src/shading.js';
import { encodePNG } from './png.mjs';

const outDir = process.argv[2] || new URL('../captures/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const t0 = Date.now();
const model = buildHamster();
console.log(`built ${model.counts.core} core + ${model.counts.fur} fur particles in ${Date.now() - t0}ms`);

const SS = 2;
function render({ yaw, pitch = CAMERA.pitch, time = 0, run = 1, size = 520, zoom = 1, center = [0, 0] }) {
  const W = size * SS, H = size * SS;
  const f = (H / (2 * Math.tan((CAMERA.fov * Math.PI) / 360))) * zoom;
  const D = CAMERA.distance;
  const col = new Float32Array(W * H * 3);
  const zb = new Float32Array(W * H).fill(Infinity);
  const bones = poseMatrices(time, run);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const toView = (x, y, z) => {
    // object yaw about Y, then pitch about X (camera looking slightly down)
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    return [x1, y2 + CAMERA.lookY, z2];
  };
  const project = (L, i) => {
    const a = L.boneA[i] * 16, b = L.boneB[i] * 16, w = L.weight[i];
    const px = L.position[i * 3], py = L.position[i * 3 + 1], pz = L.position[i * 3 + 2];
    const nx = L.normal[i * 3], ny = L.normal[i * 3 + 1], nz = L.normal[i * 3 + 2];
    const tp = (o) => [
      bones[o] * px + bones[o + 4] * py + bones[o + 8] * pz + bones[o + 12],
      bones[o + 1] * px + bones[o + 5] * py + bones[o + 9] * pz + bones[o + 13],
      bones[o + 2] * px + bones[o + 6] * py + bones[o + 10] * pz + bones[o + 14],
    ];
    const tn = (o) => [
      bones[o] * nx + bones[o + 4] * ny + bones[o + 8] * nz,
      bones[o + 1] * nx + bones[o + 5] * ny + bones[o + 9] * nz,
      bones[o + 2] * nx + bones[o + 6] * ny + bones[o + 10] * nz,
    ];
    const pa = tp(a), pb = tp(b), na = tn(a), nb = tn(b);
    let p = [0, 1, 2].map((k) => pa[k] + (pb[k] - pa[k]) * w);
    const n = [0, 1, 2].map((k) => na[k] + (nb[k] - na[k]) * w);
    const v = toView(...p);
    const nv = toView(...n); nv[1] -= CAMERA.lookY;
    const nl = Math.hypot(...nv) || 1;
    const depth = D - v[2];
    return { sx: W / 2 + f * (v[0] - center[0]) / depth, sy: H / 2 - f * (v[1] - center[1]) / depth, depth, n: nv.map((q) => q / nl) };
  };
  const splat = (L, i, blend) => {
    const pr = project(L, i);
    const rgb = shadeParticle([L.color[i * 3], L.color[i * 3 + 1], L.color[i * 3 + 2]], pr.n, L.kind[i], L.flag[i], L.strandT[i], blend);
    const r = Math.max(0.7 * SS, (L.size[i] * f) / pr.depth / 2);
    const alpha = L.alpha[i];
    const x0 = Math.floor(pr.sx - r), x1 = Math.ceil(pr.sx + r), y0 = Math.floor(pr.sy - r), y1 = Math.ceil(pr.sy + r);
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
        const dd = Math.hypot(x + 0.5 - pr.sx, y + 0.5 - pr.sy) / r;
        if (dd > 1) continue;
        const k = y * W + x;
        if (!blend) {
          if (pr.depth < zb[k]) {
            zb[k] = pr.depth;
            const shade = 1.06 - 0.16 * dd * dd;
            col[k * 3] = rgb[0] * shade; col[k * 3 + 1] = rgb[1] * shade; col[k * 3 + 2] = rgb[2] * shade;
          }
        } else if (pr.depth < zb[k] + 0.01) {
          const a = alpha * Math.pow(1 - dd, 1.2);
          col[k * 3] += (rgb[0] - col[k * 3]) * a;
          col[k * 3 + 1] += (rgb[1] - col[k * 3 + 1]) * a;
          col[k * 3 + 2] += (rgb[2] - col[k * 3 + 2]) * a;
        }
      }
    return pr.depth;
  };
  for (let i = 0; i < model.core.count; i++) splat(model.core, i, false);
  const order = [...Array(model.fur.count).keys()].map((i) => [i, project(model.fur, i).depth]).sort((a, b) => b[1] - a[1]);
  for (const [i] of order) splat(model.fur, i, true);

  const w = size, h = size, out = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) s += col[((y * SS + j) * W + x * SS + i) * 3 + c];
        const lin = s / (SS * SS);
        out[(y * w + x) * 3 + c] = Math.round(Math.min(1, Math.max(0, lin)) * 255);
      }
  return { w, h, rgb: out };
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

const which = process.env.ONLY || 'views,run,detail';
if (which.includes('views')) {
  const ims = Object.entries(VIEWS).map(([name, yaw]) => {
    const im = render({ yaw, time: 0.05 });
    save(`view-${name}`, im);
    return im;
  });
  save('sheet-views', sheet(ims, 3));
}
if (which.includes('run')) {
  const ims = [0, 1, 2, 3, 4, 5].map((k) => render({ yaw: VIEWS.side, time: (k / 6) * 0.42, size: 360 }));
  save('sheet-run-cycle', sheet(ims, 3));
}
if (which.includes('detail')) {
  save('detail-face', render({ yaw: VIEWS.side, time: 0.05, zoom: 2.4, center: [0.62, 0.38] }));
}
console.log(`done in ${Date.now() - t0}ms -> ${outDir}`);
