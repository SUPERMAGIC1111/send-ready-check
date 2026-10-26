// Voxelize a packed surface-dot layer (hamsterModel.pack format) into a set of grid cubes.
// Pure JS (runs in the build worker). Each occupied cell becomes one voxel at the cell centre,
// with the averaged colour of the dots inside it and the skinning of its dots, so the voxels
// animate with the same rig. Facial features win over fur inside a cell, so eyes, nose and
// mouth stay readable at voxel resolution.
import { KIND } from './hamsterModel.js';

// higher = wins a mixed cell (eye/feature/mouth/skin over fur)
const PRIORITY = { [KIND.EYE]: 5, [KIND.FEATURE]: 4, [KIND.MOUTH]: 4, [KIND.SKIN]: 3, [KIND.WHITE_FUR]: 1, [KIND.FUR]: 1 };

/**
 * @param {object} L packed layer with position, normal, color, boneA, boneB, weight, kind, flag
 * @param {number} size voxel edge length (model units)
 */
export function voxelize(L, size) {
  const cells = new Map();
  for (let i = 0; i < L.count; i++) {
    const x = L.position[i * 3], y = L.position[i * 3 + 1], z = L.position[i * 3 + 2];
    const key = `${Math.floor(x / size)},${Math.floor(y / size)},${Math.floor(z / size)}`;
    let c = cells.get(key);
    if (!c) cells.set(key, (c = { i: [], pri: -1 }));
    const pr = PRIORITY[L.kind[i]] ?? 1;
    if (pr > c.pri) { c.pri = pr; c.i = [i]; }
    else if (pr === c.pri) c.i.push(i);
  }
  const n = cells.size;
  const V = {
    count: n,
    size,
    center: new Float32Array(n * 3),
    normal: new Float32Array(n * 3),
    color: new Float32Array(n * 3),
    boneA: new Float32Array(n),
    boneB: new Float32Array(n),
    weight: new Float32Array(n),
    kind: new Float32Array(n),
    flag: new Float32Array(n),
  };
  let v = 0;
  for (const [key, c] of cells) {
    const [gx, gy, gz] = key.split(',').map(Number);
    V.center.set([(gx + 0.5) * size, (gy + 0.5) * size, (gz + 0.5) * size], v * 3);
    const col = [0, 0, 0], nor = [0, 0, 0];
    let flag = 0;
    for (const i of c.i) {
      for (let k = 0; k < 3; k++) { col[k] += L.color[i * 3 + k]; nor[k] += L.normal[i * 3 + k]; }
      if (L.flag[i] > 0 && L.kind[i] === KIND.EYE) flag = 1; // catch-light
    }
    const m = c.i.length, nl = Math.hypot(...nor) || 1;
    V.color.set(col.map((q) => q / m), v * 3);
    V.normal.set(nor.map((q) => q / nl), v * 3);
    const first = c.i[0];
    V.boneA[v] = L.boneA[first];
    V.boneB[v] = L.boneB[first];
    V.weight[v] = L.weight[first];
    V.kind[v] = L.kind[first];
    V.flag[v] = flag;
    v++;
  }
  return V;
}
