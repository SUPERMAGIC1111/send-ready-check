// Lightweight Node checks (no browser), for all three characters: build time, dot budget,
// finite data, valid rig indices, dots stay separate, the run loop is seamless, and the hind
// feet stay visible below the belly through the run cycle. Data checks, NOT a visual pass.
import { buildHamster, poseMatrices, BONES, runPeriod } from '../src/hamsterModel.js';
import { CHARACTER_IDS, CHARACTERS } from '../src/characters.js';

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };

for (const id of CHARACTER_IDS) {
  console.log(`\n# ${id}`);
  const t0 = Date.now();
  const m = buildHamster(id);
  ok(Date.now() - t0 < 6000, `build time ${Date.now() - t0}ms`);
  const total = m.core.count + m.fur.count;
  // V3 carries ~4x the hair (owner request: "much more hair"), so its budget is higher
  const cap = CHARACTERS[id].run.gait === 'v3' ? 175000 : 90000;
  ok(total > 30000 && total < cap, `dot budget ${total} / ${cap} (surface ${m.core.count}, fur ${m.fur.count})`);
  for (const [name, L] of Object.entries({ core: m.core, fur: m.fur })) {
    let bad = 0, badBone = 0;
    for (const k of ['position', 'normal', 'color', 'size', 'weight', 'alpha']) for (const v of L[k]) if (!Number.isFinite(v)) bad++;
    for (let i = 0; i < L.count; i++) if (!(L.boneA[i] >= 0 && L.boneA[i] < BONES.length && L.boneB[i] >= 0 && L.boneB[i] < BONES.length)) badBone++;
    ok(bad === 0 && badBone === 0, `${name}: attributes finite, bone indices valid`);
  }

  // dots stay visibly separate: median nearest-neighbour distance vs drawn dot size
  {
    const P = m.core.position, n = m.core.count, cell = 0.05, grid = new Map();
    const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    for (let i = 0; i < n; i++) { const k = key(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); (grid.get(k) || grid.set(k, []).get(k)).push(i); }
    const nn = [];
    for (let i = 0; i < n; i += 11) {
      let best = Infinity;
      const [x, y, z] = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++)
        for (const j of grid.get(key(x + a * cell, y + b * cell, z + c * cell)) || [])
          if (j !== i) best = Math.min(best, Math.hypot(P[j * 3] - x, P[j * 3 + 1] - y, P[j * 3 + 2] - z));
      nn.push(best);
    }
    nn.sort((a, b) => a - b);
    const sizes = [...m.core.size].sort((a, b) => a - b);
    const med = nn[nn.length >> 1], medDot = sizes[sizes.length >> 1];
    // the visible disc is ~0.75 of the point size, so gaps remain when spacing > ~0.6 x size
    ok(med > medDot * 0.6, `median dot spacing ${med.toFixed(4)} vs median dot ${medDot.toFixed(4)}`);
  }

  // seamless loop: the pose at t and t + period must match (blinks/expressions aside: run=1 cycle)
  {
    const T = runPeriod(id);
    const a = poseMatrices(0.123, 1, undefined, id), b = poseMatrices(0.123 + T, 1, undefined, id);
    // limbs, body and tail are periodic in the stride; head/eyes carry slower personality motion
    // (cheeks/ears/eyes/crown ride on the head, which adds slow, continuous personality motion)
    const periodic = ['body', 'legN', 'legF', 'armN', 'armF', 'tail'].map((n) => BONES.indexOf(n));
    let maxDiff = 0;
    for (const bi of periodic) for (let k = 0; k < 16; k++) maxDiff = Math.max(maxDiff, Math.abs(a[bi * 16 + k] - b[bi * 16 + k]));
    ok(maxDiff < 1e-4, `run loop repeats exactly every ${T}s (max matrix diff ${maxDiff.toExponential(1)})`);
  }

  // feet: posed lowest pink (paw/foot) particles of each hind leg vs the posed belly bottom
  const skinY = (L, i, B) => {
    const a = L.boneA[i] * 16, b = L.boneB[i] * 16, w = L.weight[i];
    const [x, y, z] = [L.position[i * 3], L.position[i * 3 + 1], L.position[i * 3 + 2]];
    const ya = B[a + 1] * x + B[a + 5] * y + B[a + 9] * z + B[a + 13];
    const yb = B[b + 1] * x + B[b + 5] * y + B[b + 9] * z + B[b + 13];
    return ya + (yb - ya) * w;
  };
  const legN = BONES.indexOf('legN'), legF = BONES.indexOf('legF');
  const gaps = [];
  for (let f = 0; f < 6; f++) {
    const B = poseMatrices((f / 6) * runPeriod(id), 1, undefined, id);
    let belly = Infinity; const foot = { [legN]: Infinity, [legF]: Infinity };
    for (let i = 0; i < m.core.count; i++) {
      const y = skinY(m.core, i, B);
      if (m.core.boneB[i] === 0) belly = Math.min(belly, y);
      if ((m.core.boneB[i] === legN || m.core.boneB[i] === legF) && m.core.kind[i] === 2 && m.core.weight[i] > 0.9) foot[m.core.boneB[i]] = Math.min(foot[m.core.boneB[i]], y);
    }
    gaps.push(Math.min(belly - foot[legN], belly - foot[legF]));
  }
  ok(gaps.every((g) => g > 0.03), `feet below the belly in all 6 run frames (min ${Math.min(...gaps).toFixed(3)})`);
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall data checks passed (visual review still required)');
process.exit(failures ? 1 : 0);
