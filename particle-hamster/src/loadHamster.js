// Builds each character's dots once, in a Web Worker (main-thread fallback), and caches them.
const cache = new Map();

async function buildHere(id) {
  const { buildHamster } = await import('./hamsterModel.js');
  return buildHamster(id);
}

export function loadHamster(id) {
  if (!cache.has(id)) {
    cache.set(
      id,
      new Promise((resolve) => {
        try {
          const worker = new Worker(new URL('./buildWorker.js', import.meta.url), { type: 'module' });
          worker.onmessage = (e) => { worker.terminate(); resolve(e.data); };
          worker.onerror = (e) => { e.preventDefault?.(); worker.terminate(); resolve(buildHere(id)); };
          worker.postMessage({ character: id });
        } catch {
          resolve(buildHere(id));
        }
      })
    );
  }
  return cache.get(id);
}
