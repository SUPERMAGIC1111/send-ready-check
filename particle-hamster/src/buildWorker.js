// Builds a character's dot layers off the main thread and transfers the typed arrays back.
// Texture lab variants pass `build` options: config overrides, voxelization, or a brain build.
import { buildVariant } from './buildVariant.js';

self.onmessage = (e) => {
  const layers = buildVariant(e.data?.character || 'orange', e.data?.build);
  const transfer = [];
  for (const L of [layers.core, layers.fur, layers.voxel, layers.field])
    if (L) for (const v of Object.values(L)) if (ArrayBuffer.isView(v)) transfer.push(v.buffer);
  self.postMessage(layers, transfer);
};
