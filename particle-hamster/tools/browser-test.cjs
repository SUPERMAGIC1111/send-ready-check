// Interaction test of gallery.html in ONE headless Chromium (cloud container, SwiftShader GL):
// mouse drag + inertia, touch drag, running continues while dragging, idle auto-orbit, reset,
// tap-to-expand / Escape, ASCII toggle. Usage: node tools/browser-test.cjs <baseUrl> <outDir>
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const [base, outDir] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const results = [];
  const check = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };
  const st = (i) => page.evaluate((i) => { const s = window.__gallery[i].stage; return { yaw: s.orbit.yaw, pitch: s.orbit.pitch, time: s.time, mode: s.mode, running: s.running }; }, i);

  // inertia: measured first, on the single-demo page in a small fresh tab, because software GL
  // gets too slow later for a realistic fling (input events then arrive 200-400 ms apart, which
  // the orbit correctly treats as a held-still release)
  {
    const p2 = await ctx.newPage();
    await p2.setViewportSize({ width: 640, height: 480 });
    p2.on('pageerror', (e) => errors.push(e.message));
    await p2.goto(`${base}/index.html?character=orange&auto=0`, { waitUntil: 'load' });
    await p2.waitForFunction(() => document.querySelector('canvas')?.dataset.particles, null, { timeout: 180000 });
    await p2.waitForTimeout(800);
    const vfps = await p2.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => (performance.now() - t0 < 1500 ? (n++, requestAnimationFrame(f)) : res(n / 1.5)); requestAnimationFrame(f); }));
    const yawOf = () => p2.evaluate(() => window.__stage.orbit.yaw);
    const yStart = await yawOf();
    await p2.mouse.move(320, 240);
    await p2.mouse.down();
    for (let i = 1; i <= 10; i++) { await p2.mouse.move(320 + i * 16, 240); await p2.waitForTimeout(12); }
    await p2.mouse.up();
    const y0 = await yawOf();
    const v0 = await p2.evaluate(() => window.__stage.orbit.vYaw);
    await p2.waitForTimeout(700);
    const y1 = await yawOf();
    check('inertia after release', y1 - y0 > 0.02, `drag ${yStart.toFixed(2)} -> ${y0.toFixed(2)}, release velocity ${v0.toFixed(2)} rad/s, +${(y1 - y0).toFixed(3)} rad after release (${vfps.toFixed(0)} fps)`);
    await p2.close();
  }

  await page.goto(`${base}/gallery.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 180000 });
  check('all six demos built', true, `${await page.evaluate(() => document.body.dataset.particles)} points`);
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => (performance.now() - t0 < 2000 ? (n++, requestAnimationFrame(f)) : res(n / 2)); requestAnimationFrame(f); }));
  console.log(`info: ${fps.toFixed(1)} fps for all six demos in software GL (SwiftShader, no GPU)`);
  await page.waitForTimeout(1200);

  // mouse drag on 01 while it runs
  const box = await page.locator('#d01').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const s0 = await st(0);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  let sDrag;
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(cx + i * 18, cy + i * 3);
    if (i === 6) sDrag = await st(0); // mid-drag
    await page.waitForTimeout(16);
  }
  await page.mouse.up(); // released while still moving -> fling
  const sUp = await st(0);
  await page.waitForTimeout(600);
  const sInertia = await st(0);
  check('mouse drag rotates the 3D scene', Math.abs(sUp.yaw - s0.yaw) > 0.3, `yaw ${s0.yaw.toFixed(2)} -> ${sUp.yaw.toFixed(2)}, pitch ${s0.pitch.toFixed(2)} -> ${sUp.pitch.toFixed(2)}`);
  check('run cycle keeps running during drag', sUp.time > s0.time + 0.05 && sUp.running, `t ${s0.time.toFixed(2)} -> ${sDrag.time.toFixed(2)} (mid-drag) -> ${sUp.time.toFixed(2)}`);
  console.log(`info: gallery inertia +${(sInertia.yaw - sUp.yaw).toFixed(3)} rad (input is starved at ~8 fps in software GL; inertia is measured on index.html above)`);
  await page.screenshot({ path: path.join(outDir, 'after-drag.png'), clip: box });

  // touch drag on 02 (pointer events from a real touch sequence via CDP)
  const b2 = await page.locator('#d02').boundingBox();
  const t0 = await st(1);
  const cdp = await ctx.newCDPSession(page);
  const tx = b2.x + b2.width / 2, ty = b2.y + b2.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx - i * 16, y: ty }] }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const t1 = await st(1);
  check('touch drag rotates', t1.yaw < t0.yaw - 0.3, `yaw ${t0.yaw.toFixed(2)} -> ${t1.yaw.toFixed(2)}`);

  // reset on 01
  await page.locator('#d01').hover();
  await page.locator('#d01 [data-act="reset"]').click();
  // software GL is slow: wait until the eased reset settles (frames, not wall time)
  await page.waitForFunction(() => !window.__gallery[0].stage.orbit.resetting, null, { timeout: 60000 }).catch(() => {});
  const sReset = await st(0);
  const home = await page.evaluate(() => window.__gallery[0].stage.orbit.home);
  const dYaw = Math.abs(((sReset.yaw - home.yaw) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  check('reset returns to the side view', dYaw < 0.05, `yaw ${sReset.yaw.toFixed(3)} (home ${home.yaw.toFixed(3)})`);

  // idle auto-orbit on 03 (untouched)
  const a0 = await st(2);
  await page.waitForTimeout(2500);
  const a1 = await st(2);
  const rate = (a1.yaw - a0.yaw) / Math.max(1e-3, a1.time - a0.time); // per simulated second (frame-rate independent)
  check('idle auto-orbit turns slowly', rate > 0.05 && rate < 0.5, `${rate.toFixed(3)} rad/s`);

  // ASCII toggle on 04
  await page.locator('#d04').hover();
  await page.locator('#d04 [data-act="ascii"]').click();
  await page.waitForTimeout(800);
  check('ASCII mode toggles', (await st(3)).mode === 'ascii');
  await page.screenshot({ path: path.join(outDir, 'ascii-04.png'), clip: await page.locator('#d04').boundingBox() });
  await page.locator('#d04 [data-act="ascii"]').click();

  // pause / run toggle on 05
  await page.locator('#d05').hover();
  await page.locator('#d05 [data-act="run"]').click();
  await page.waitForTimeout(700);
  check('pause stops the run blend', (await st(4)).running === false);
  await page.locator('#d05 [data-act="run"]').click();

  // tap to expand 06, Escape to close
  const b6 = await page.locator('#d06').boundingBox();
  await page.mouse.click(b6.x + b6.width / 2, b6.y + b6.height / 2);
  await page.waitForTimeout(600);
  const expanded = await page.evaluate(() => document.body.classList.contains('has-focus') && location.hash === '#06');
  check('tap expands a demo (deep link #06)', expanded);
  await page.screenshot({ path: path.join(outDir, 'expanded-06.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('Escape returns to all six', await page.evaluate(() => !document.body.classList.contains('has-focus')));

  // deep link opens directly
  await page.goto(`${base}/gallery.html#02`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 180000 });
  check('deep link #02 opens focused', await page.evaluate(() => document.querySelector('#d02').classList.contains('focused')));

  check('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
  await browser.close();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
})();
