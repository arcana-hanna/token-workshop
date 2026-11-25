import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

/* a dark flower-like blob on a light textured background: the edge is clear but the shape is not a simple circle */
const SCENE = `(() => { const W = 640, c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d');
  x.fillStyle = '#e8e2d4'; x.fillRect(0, 0, W, W); let z = 3; const r = () => (z = (z * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(120,110,90,.06)'; x.fillRect(r() * W, r() * W, 20, 4); }
  x.fillStyle = '#2a3a55'; x.beginPath(); for (let a = 0; a <= 360; a += 2) { const t = a / 180 * Math.PI, rad = 200 + 28 * Math.sin(t * 5); const px = 320 + Math.cos(t) * rad, py = 320 + Math.sin(t) * rad; a ? x.lineTo(px, py) : x.moveTo(px, py); } x.fill();
  return c; })()`;
const TRUTH = (t) => 200 + 28 * Math.sin(t * 5);

async function setup(page) {
  await page.evaluate((src) => { loadCanvas(eval(src), 'scene'); st.sgPending = false; setTab('popout'); clearSel(); commit(); window.__toClient = (u, v) => {
    const g = geom(cv.width, effPad()), S = cv.width, dx = (u - st.sw / 2) * g.sc * st.flip, dy = (v - st.sh / 2) * g.sc, co = Math.cos(st.rot), si = Math.sin(st.rot);
    const tx = g.tx + dx * co - dy * si, ty = g.ty + dx * si + dy * co, r = cv.getBoundingClientRect(), k = cv.width / r.width;
    return { x: r.left + (tx * st.vz + st.vx * S) / k, y: r.top + (ty * st.vz + st.vy * S) / k }; }; }, SCENE);
}
const wob = (i) => Math.sin(i * 1.7) * 9 + Math.cos(i * .9) * 5;   // sloppy hand: up to ~14 picture px off the edge
async function trace(page, sloppy) {
  const pts = []; for (let i = 0; i <= 120; i++) { const t = i / 120 * Math.PI * 2, rad = TRUTH(t) + sloppy * wob(i); pts.push([320 + Math.cos(t) * rad, 320 + Math.sin(t) * rad]); }
  const c = await page.evaluate((P) => P.map(([u, v]) => window.__toClient(u, v)), pts);
  await page.mouse.move(c[0].x, c[0].y); await page.mouse.down(); for (const p of c.slice(1)) await page.mouse.move(p.x, p.y, { steps: 2 }); await page.mouse.up();
}
const iou = (page) => page.evaluate(() => { const W = st.sw; let i = 0, u = 0; for (let y = 0; y < st.sh; y++) for (let x = 0; x < W; x++) { const t = Math.atan2(y - 320, x - 320), r = Math.hypot(x - 320, y - 320), tr = 200 + 28 * Math.sin(t * 5) <= r ? false : true, m = st.mask[y * W + x] >= 128; if (m || tr) u++; if (m && tr) i++; } return i / u; });

test('magnetic lasso follows the edge despite a sloppy hand, plain lasso does not', async () => {
  const page = await openApp(browser); await setup(page);
  await page.evaluate(() => setTool('lasso')); await trace(page, 1);
  const plain = await iou(page);
  await page.evaluate(() => { clearSel(); commit(); setTool('magnet'); }); await trace(page, 1);
  const mag = await iou(page);
  assert.ok(mag > .96, 'magnet ' + mag.toFixed(3));
  assert.ok(mag > plain + .01, 'magnet ' + mag.toFixed(3) + ' vs lasso ' + plain.toFixed(3));
  assert.deepEqual(page.errors, []);
});

test('click mode: points, Finish selects, Backspace removes a point, Esc cancels, Remove mode subtracts', async () => {
  const page = await openApp(browser); await setup(page); await page.evaluate(() => setTool('magnet'));
  const ring = async (n, from, to) => page.evaluate(([n, a, b]) => Array.from({ length: n + 1 }, (_, i) => { const t = (a + (b - a) * i / n) * Math.PI * 2, rad = 200 + 28 * Math.sin(t * 5); return window.__toClient(320 + Math.cos(t) * rad, 320 + Math.sin(t) * rad); }), [n, from, to]);
  const pts = await ring(8, 0, 1);
  for (const p of pts.slice(0, 5)) { await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up(); }
  assert.ok(await page.evaluate(() => !!st.mag && st.mag.anc.length >= 3), 'anchors placed');
  assert.equal(await page.$eval('#magDone', (e) => e.hidden), false);
  const n0 = await page.evaluate(() => st.mag.anc.length); await page.keyboard.press('Backspace');
  assert.equal(await page.evaluate(() => st.mag.anc.length), n0 - 1);
  await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => st.mag), null); assert.equal(await page.evaluate(() => st.selCount), 0);
  for (const p of pts.slice(0, 8)) { await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up(); }
  await page.click('#magDone'); const sel = await page.evaluate(() => st.selCount); assert.ok(sel > 50000, 'selected ' + sel);
  /* remove mode: the same outline removes it again */
  await page.evaluate(() => { st.mode = 'sub'; });
  for (const p of pts.slice(0, 8)) { await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up(); }
  await page.keyboard.press('Enter'); assert.ok(await page.evaluate(() => st.selCount) < sel * .2);
});

test('switching tool or step drops an unfinished outline', async () => {
  const page = await openApp(browser); await setup(page); await page.evaluate(() => setTool('magnet'));
  const c = await page.evaluate(() => window.__toClient(320, 120)); await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.up();
  assert.ok(await page.evaluate(() => !!st.mag)); await page.evaluate(() => setTool('brush')); assert.equal(await page.evaluate(() => st.mag), null);
});
