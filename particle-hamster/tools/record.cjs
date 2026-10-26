// Records short frame sequences in ONE headless Chromium (cloud container) for animated GIFs:
//   run   : the live run cycle of a character (real time, untouched)
//   drag  : a real mouse drag-rotation of a demo, frames captured during and after release
// Usage: node tools/record.cjs <baseUrl> <outDir> <kind> <query> <frames>
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const [base, outDir, kind, query, n = '16'] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 480 } });
  await page.goto(`${base}/index.html?${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.particles, null, { timeout: 180000 });
  await page.evaluate(() => document.getElementById('ui')?.remove());
  await page.waitForTimeout(600);
  const frames = Number(n);
  const shot = (i) => page.screenshot({ path: path.join(outDir, `f${String(i).padStart(3, '0')}.png`) });
  if (kind === 'run') {
    // step the paused clock so frames are evenly spaced in animation time (software GL is slow)
    const period = Number(process.env.PERIOD || 0.42);
    for (let i = 0; i < frames; i++) {
      await page.evaluate((t) => { window.__stage.time = t; }, 10 + (i / frames) * period * 2);
      await page.waitForTimeout(250);
      await shot(i);
    }
  } else {
    await page.mouse.move(160, 240);
    await page.mouse.down();
    let i = 0;
    for (let k = 1; k <= frames / 2; k++) { await page.mouse.move(160 + k * 22, 240 - k * 3); await shot(i++); }
    await page.mouse.up();
    while (i < frames) { await page.waitForTimeout(120); await shot(i++); }
  }
  await browser.close();
})();
