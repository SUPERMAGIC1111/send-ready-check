// Lightweight Node checks (no browser): particle budget, finite data, valid rig indices,
// and a numeric check that the hind feet stay visible below the belly through the run cycle.
// These are data checks, NOT a visual pass.
import { buildHamster, poseMatrices, BONES, RUN_PERIOD } from '../src/hamsterModel.js';

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };

const t0 = Date.now();
const m = buildHamster();
ok(Date.now() - t0 < 8000, `build time ${Date.now() - t0}ms`);
const total = m.core.count + m.fur.count;
ok(total > 60000 && total < 120000, `particle budget ${total} (core ${m.core.count}, fur ${m.fur.count})`);
for (const [name, L] of Object.entries({ core: m.core, fur: m.fur })) {
  let bad = 0, badBone = 0;
  for (const k of ['position', 'normal', 'color', 'size', 'weight', 'alpha']) for (const v of L[k]) if (!Number.isFinite(v)) bad++;
  for (let i = 0; i < L.count; i++) if (!(L.boneA[i] >= 0 && L.boneA[i] < BONES.length && L.boneB[i] >= 0 && L.boneB[i] < BONES.length)) badBone++;
  ok(bad === 0, `${name}: all attributes finite`);
  ok(badBone === 0, `${name}: bone indices valid`);
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
for (let f = 0; f < 6; f++) {
  const B = poseMatrices((f / 6) * RUN_PERIOD, 1);
  let belly = Infinity; const foot = { [legN]: Infinity, [legF]: Infinity };
  for (let i = 0; i < m.core.count; i++) {
    const y = skinY(m.core, i, B);
    if (m.core.boneB[i] === 0) belly = Math.min(belly, y);
    if ((m.core.boneB[i] === legN || m.core.boneB[i] === legF) && m.core.kind[i] === 2 && m.core.weight[i] > 0.9) foot[m.core.boneB[i]] = Math.min(foot[m.core.boneB[i]], y);
  }
  ok(foot[legN] < belly - 0.04 && foot[legF] < belly - 0.04,
    `frame ${f + 1}/6 feet below belly: near ${(belly - foot[legN]).toFixed(3)}, far ${(belly - foot[legF]).toFixed(3)}`);
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall data checks passed (visual review still required)');
process.exit(failures ? 1 : 0);
