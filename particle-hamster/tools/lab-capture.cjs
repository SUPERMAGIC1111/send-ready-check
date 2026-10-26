// Texture-lab captures in ONE headless Chromium (cloud container QA only, SwiftShader).
//   node tools/lab-capture.cjs <baseUrl> <outDir> <name>=<query> ...   (query for lab.html)
//   FRAMES=n PERIOD=s STRIDES=k: n frames of the run cycle instead of one still
//   SWITCH=1 node tools/lab-capture.cjs <baseUrl>   : click through every variant in place and print
//                                                     GPU geometry/texture counts after each switch
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const [base, outDir, ...jobs] = process.argv.slice(2);
  const size = (process.env.SIZE || '640x640').split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const waitFor = (id) => page.waitForFunction((v) => document.querySelector('canvas')?.dataset.variant === v, id, { timeout: 300000 });
  if (process.env.SWITCH) {
    await page.goto(`${base}/lab.html?variant=v4&auto=0`, { waitUntil: 'load' });
    await waitFor('v4');
    const ids = await page.evaluate(() => window.__lab.variants);
    for (const id of [...ids, ...ids]) {
      await page.click(`[data-variant="${id}"]`);
      await waitFor(id);
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => ({ ...window.__stage.renderer.info.memory, programs: window.__stage.renderer.info.programs.length, scene: window.__stage.scene.children.length, rig: window.__stage.rig.children.length, n: window.__stage.hamster.particleCount }));
      console.log(id.padEnd(12), JSON.stringify(m));
    }
  } else {
    fs.mkdirSync(outDir, { recursive: true });
    for (const job of jobs) {
      const i = job.indexOf('=');
      const name = job.slice(0, i), query = job.slice(i + 1);
      await page.goto(`${base}/lab.html?${query}`, { waitUntil: 'load' });
      await waitFor(new URLSearchParams(query).get('variant'));
      if (process.env.EVAL) await page.evaluate(process.env.EVAL);
      if (process.env.NO_UI) await page.evaluate(() => { for (const id of ['ui', 'picker']) document.getElementById(id)?.remove(); });
      await page.waitForTimeout(Number(process.env.SETTLE || 1200));
      const frames = Number(process.env.FRAMES || 0);
      if (frames) {
        // a run cycle from paused frames: the pose is a pure function of the run clock, the wheel
        // angle follows the same clock (omega * t), so frame k is exactly what the live loop draws
        const period = Number(process.env.PERIOD || 0.28);
        for (let k = 0; k < frames; k++) {
          await page.evaluate(([t]) => { const s = window.__stage; s.time = t; s.wheelAngle = -s.wheelOmega * t; }, [(k / frames) * period * Number(process.env.STRIDES || 1)]);
          await page.waitForTimeout(250);
          await page.screenshot({ path: path.join(outDir, `${name}-${String(k).padStart(2, '0')}.png`), timeout: 180000 });
        }
      } else await page.screenshot({ path: path.join(outDir, `${name}.png`), timeout: 180000 });
      console.log('captured', name);
    }
  }
  if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 8));
  await browser.close();
})();
