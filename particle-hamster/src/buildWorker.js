// Builds the particle layers off the main thread and transfers the typed arrays back.
import { buildHamster } from './hamsterModel.js';

self.onmessage = (e) => {
  const layers = buildHamster(e.data || {});
  const transfer = [];
  for (const L of [layers.core, layers.fur])
    for (const v of Object.values(L)) if (ArrayBuffer.isView(v)) transfer.push(v.buffer);
  self.postMessage(layers, transfer);
};
