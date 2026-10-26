// Real-browser captures of the WebGL pages in ONE headless Chromium (SwiftShader software GL).
// For QA in the cloud container only. Usage:
//   node tools/capture.cjs <baseUrl> <outDir> <name>=<query> [<name>=<query> ...]
// e.g. node tools/capture.cjs http://localhost:5173 captures/browser orange-side="character=orange&view=side&paused=1&t=0.1"
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const [base, outDir, ...jobs] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const size = (process.env.SIZE || '720x720').split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: Number(process.env.DPR || 1) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  for (const job of jobs) {
    const i = job.indexOf('=');
    const name = job.slice(0, i), query = job.slice(i + 1);
    const page_ = query.startsWith('gallery') ? query : `index.html?${query}`;
    await page.goto(`${base}/${page_}`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.particles || document.body.dataset.ready, null, { timeout: 120000 });
    await page.waitForTimeout(Number(process.env.SETTLE || 1500));
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log('captured', name);
  }
  if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 8));
  await browser.close();
})();
