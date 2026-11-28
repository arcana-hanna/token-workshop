import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

/* a head on a busy gradient background, ring centred on the face, body below, ground truth known */
const SCENE = `(() => {
  const W = 600, c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, W); g.addColorStop(0, '#2f6f78'); g.addColorStop(.5, '#b8873a'); g.addColorStop(1, '#4b3a6e'); x.fillStyle = g; x.fillRect(0, 0, W, W);
  let z = 7; const r = () => (z = (z * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(' + (r() * 255 | 0) + ',' + (r() * 255 | 0) + ',' + (r() * 255 | 0) + ',.035)'; x.fillRect(r() * W, r() * W, 12 + r() * 30, 3 + r() * 6); }
  x.fillStyle = '#2b2530'; x.beginPath(); x.moveTo(90, 540); x.lineTo(130, 430); x.lineTo(470, 430); x.lineTo(510, 540); x.fill();   // shoulders
  x.fillStyle = '#c98f6b'; x.fillRect(255, 380, 90, 80);                                                                         // neck
  x.fillStyle = '#3a1d12'; x.beginPath(); x.ellipse(300, 252, 100, 124, 0, 0, 7); x.fill();                                      // hair
  x.fillStyle = '#d9a07c'; x.beginPath(); x.ellipse(300, 285, 82, 105, 0, 0, 7); x.fill();                                       // face
  return c; })()`;

test('Auto applies nothing by itself: a full-screen layer offers large options, one click applies, Undo reverts', async () => {
  const page = await openApp(browser);
  const r0 = await page.evaluate(async (src) => { loadCanvas(eval(src), 'scene'); st.zoom = 2.2; viewChanged(); st.sgPending = false; setTab('popout'); clearSel(); commit(); return { sel: st.selCount }; }, SCENE);
  assert.equal(r0.sel, 0);
  await page.click('#bAuto');
  await page.waitForSelector('#sgList .sg-card', { timeout: 20000 });
  const cards = await page.$$eval('#sgList .sg-card', (a) => a.length);
  assert.ok(cards >= 2 && cards <= 4, 'cards ' + cards);
  assert.equal(await page.evaluate(() => st.selCount), 0, 'nothing applied by Auto itself');
  assert.equal(await page.$eval('#sgList .sg-card .best', (e) => e.textContent), 'Best guess');
  const lay = await page.evaluate(() => { const r = document.querySelector('#sgBar').getBoundingClientRect(), c = document.querySelector('#sgList .sg-card canvas').getBoundingClientRect();
    return { full: r.width >= innerWidth - 1 && r.height >= innerHeight - 1, card: c.width, sub: document.querySelector('.sg-sub').textContent }; });
  assert.ok(lay.full && lay.card >= 150 && /Choose which option to apply/.test(lay.sub), JSON.stringify(lay));
  await page.click('#sgList .sg-card >> nth=0');   // one click applies
  const done = await page.evaluate(() => ({ sel: st.selCount, bar: document.querySelector('#sgBar').hidden, show: st.sgShow }));
  assert.ok(done.sel > 1000 && done.bar && !done.show, JSON.stringify(done));
  await page.evaluate(() => undo());
  assert.equal(await page.evaluate(() => st.selCount), 0, 'Undo brings back the empty selection');
  assert.deepEqual(page.errors, []);
});

test('Ignore closes the strip and leaves the selection alone', async () => {
  const page = await openApp(browser);
  await page.evaluate(async (src) => { loadCanvas(eval(src), 'scene'); st.zoom = 2.2; viewChanged(); st.sgPending = false; setTab('popout'); }, SCENE);
  const before = await page.evaluate(() => st.selCount);
  await page.click('#bAuto'); await page.waitForSelector('#sgList .sg-card', { timeout: 20000 });
  await page.click('#sgClose');
  const r = await page.evaluate(() => ({ sel: st.selCount, hidden: document.querySelector('#sgBar').hidden }));
  assert.equal(r.sel, before); assert.ok(r.hidden);
});

test('opening a picture selects nothing; entering the Pop-out step offers suggestions', async () => {
  const page = await openApp(browser, { step: 'image' });
  await page.evaluate(async (src) => {
    const c = eval(src), blob = await new Promise((res) => c.toBlob(res, 'image/png')); loadFile(new File([blob], 'scene.png', { type: 'image/png' }));
    await new Promise((res) => setTimeout(res, 700)); }, SCENE);
  assert.equal(await page.evaluate(() => st.selCount), 0);
  assert.ok(await page.$eval('#sgBar', (e) => e.hidden));
  await page.evaluate(() => { st.zoom = 2.2; viewChanged(); setTab('popout'); });
  await page.waitForSelector('#sgList .sg-card', { timeout: 20000 });
  assert.equal(await page.evaluate(() => st.selCount), 0);
  await page.evaluate(() => setTab('ring'));
  assert.ok(await page.$eval('#sgBar', (e) => e.hidden), 'strip closes when leaving the step');
});

test('hard scene (busy background, body below the ring): at least one of the suggestions is close to the head-and-hair pop-out', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(async (src) => {
    loadCanvas(eval(src), 'scene'); st.zoom = 2.2; viewChanged(); setTab('popout');
    const W = st.sw, H = st.sh, I = sgInput(), k = I.k, cxI = I.cx / k, cyI = I.cy / k, riI = I.ri / k, RI = I.R / k, band = Math.PI * (RI * RI - riI * riI);
    const t = document.createElement('canvas'); t.width = W; t.height = H; const x = t.getContext('2d'); x.fillStyle = '#000'; x.beginPath(); x.ellipse(300, 252, 100, 124, 0, 0, 7); x.fill();
    const d = x.getImageData(0, 0, W, H).data, truth = (i) => d[i * 4 + 3] > 128;
    const { cands } = sgCandidates(), pick = sgPick(cands);
    const err = (m) => { let n = 0; for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { if (Math.hypot(xx - cxI, y - cyI) <= riI) continue; if ((m[y * W + xx] >= 128) !== truth(y * W + xx)) n++; } return n / band; };
    return { picks: pick.map((c) => c.id + ' ' + err(c.mask).toFixed(2)), best: Math.min(...pick.map((c) => err(c.mask))), first: err(pick[0].mask) };
  }, SCENE);
  assert.ok(r.best < .25, JSON.stringify(r));
});

test('edge snapping pulls a slightly-off outline onto the real edge', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = c.height = 500; const x = c.getContext('2d'); x.fillStyle = '#e9e4d8'; x.fillRect(0, 0, 500, 500);
    x.fillStyle = '#31405e'; x.beginPath(); x.ellipse(250, 250, 150, 190, .3, 0, 7); x.fill(); loadCanvas(c, 's');
    const W = st.sw, truth = new Uint8Array(W * W), off = new Uint8Array(W * W), t = document.createElement('canvas'); t.width = t.height = W; const tx = t.getContext('2d'); tx.fillStyle = '#000'; tx.beginPath(); tx.ellipse(250, 250, 150, 190, .3, 0, 7); tx.fill();
    const d = tx.getImageData(0, 0, W, W).data; for (let i = 0; i < W * W; i++) truth[i] = d[i * 4 + 3] > 128 ? 255 : 0;
    const o = document.createElement('canvas'); o.width = o.height = W; const ox = o.getContext('2d'); ox.fillStyle = '#000'; ox.beginPath(); ox.ellipse(252, 247, 153, 187, .3, 0, 7); ox.fill();   // wobbly, a few px off
    const e = ox.getImageData(0, 0, W, W).data; for (let i = 0; i < W * W; i++) off[i] = e[i * 4 + 3] > 128 ? 255 : 0;
    const iou = (m) => { let a = 0, b = 0; for (let i = 0; i < W * W; i++) { const p = m[i] >= 128, q = truth[i] >= 128; if (p || q) b++; if (p && q) a++; } return a / b; };
    const snapped = sgSnap(off); return { before: iou(off), after: iou(snapped) };
  });
  assert.ok(r.after > r.before + .01 && r.after > .98, JSON.stringify(r));
});
