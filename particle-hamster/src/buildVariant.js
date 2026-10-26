// Builds one character (or lab variant) as plain typed arrays. Shared by the build worker and its
// main-thread fallback.
import { buildHamster } from './hamsterModel.js';
import { voxelize } from './voxels.js';
import { buildBrain, brainField } from './brainModel.js';
import { SCULPT_MODEL } from './brainSculpt.js';

// merge two packed layers (same attribute set) so both can be voxelised together
function concat(a, b) {
  const out = { count: a.count + b.count };
  for (const k of Object.keys(a)) {
    if (!ArrayBuffer.isView(a[k])) continue;
    const m = new a[k].constructor(a[k].length + b[k].length);
    m.set(a[k]); m.set(b[k], a[k].length);
    out[k] = m;
  }
  return out;
}

export function buildVariant(character, build = {}) {
  if (build.brain === 'field') return { ...buildBrain({ candidates: 0 }), field: brainField() };
  const layers = build.brain
    ? buildBrain(build.brainOpts?.model === 'sculpt' ? { ...build.brainOpts, model: SCULPT_MODEL } : build.brainOpts)
    : buildHamster(character, build.override ? { override: build.override } : {});
  if (build.voxel) layers.voxel = voxelize(build.voxelFur ? concat(layers.core, layers.fur) : layers.core, build.voxel);
  return layers;
}
