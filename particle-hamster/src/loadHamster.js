// Builds each character's dots once, in a Web Worker (main-thread fallback), and caches them.
// Texture-lab builds (`build` options) are cached by variant key; only the latest few are kept so
// switching variants does not pile up typed arrays.
const cache = new Map();
const MAX = 3;

async function buildHere(id, build) {
  const { buildVariant } = await import('./buildVariant.js');
  return buildVariant(id, build);
}

export function loadHamster(id, build) {
  const key = build ? `${id}|${JSON.stringify(build)}` : id;
  if (!cache.has(key)) {
    cache.set(
      key,
      new Promise((resolve) => {
        try {
          const worker = new Worker(new URL('./buildWorker.js', import.meta.url), { type: 'module' });
          worker.onmessage = (e) => { worker.terminate(); resolve(e.data); };
          worker.onerror = (e) => { e.preventDefault?.(); worker.terminate(); resolve(buildHere(id, build)); };
          worker.postMessage({ character: id, build });
        } catch {
          resolve(buildHere(id, build));
        }
      })
    );
    while (cache.size > MAX) cache.delete(cache.keys().next().value);
  } else {
    // most recently used last
    const p = cache.get(key);
    cache.delete(key);
    cache.set(key, p);
  }
  return cache.get(key);
}
