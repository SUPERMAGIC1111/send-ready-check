// Builds one character (or lab variant) as plain typed arrays. Shared by the build worker and its
// main-thread fallback.
import { buildHamster } from './hamsterModel.js';
import { voxelize } from './voxels.js';
import { buildBrain, brainField } from './brainModel.js';

export function buildVariant(character, build = {}) {
  if (build.brain === 'field') return { ...buildBrain({ candidates: 0 }), field: brainField() };
  const layers = build.brain
    ? buildBrain(build.brainOpts)
    : buildHamster(character, build.override ? { override: build.override } : {});
  if (build.voxel) layers.voxel = voxelize(layers.core, build.voxel);
  return layers;
}
