import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, settle } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('picture adjustments are non-destructive, cached and survive undo and project export', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(() => {
    const px = (cv) => cv.getContext('2d').getImageData(10, 10, 1, 1).data.join();
    const orig = px(st.src);
    st.bri = 40; st.sat = -100; st.popDirty = true;
    const adj = picSrc(false), changed = px(adj), again = picSrc(false) === adj;
    const untouched = px(st.src) === orig;
    commit(); const snapOk = JSON.parse(H.a[H.i].s).includes(40);
    st.bri = 0; st.sat = 0;
    const back = picSrc(false) === st.src;
    return { differs: changed !== orig, again, untouched, snapOk, back };
  });
  assert.deepEqual(r, { differs: true, again: true, untouched: true, snapOk: true, back: true });
});

test('Match to ring changes brightness or saturation and is undoable', async () => {
  const page = await openApp(browser);
  await settle(page);
  const r = await page.evaluate(() => { const h = H.i; matchToRing(); const moved = st.bri !== 0 || st.sat !== 0; undo(); return { moved, undone: st.bri === 0 && st.sat === 0, h, now: H.i }; });
  assert.ok(r.moved && r.undone, JSON.stringify(r));
  assert.deepEqual(page.errors, []);
});

test('halo removal recolours only the soft edge pixels', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 100; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 100, 100);
    x.fillStyle = '#202020'; x.fillRect(30, 30, 40, 40); x.fillStyle = '#909090'; x.fillRect(28, 28, 2, 44);   /* grey halo column left of the box */
    loadCanvas(c, 't'); const m = new Uint8Array(100 * 100);
    for (let y = 30; y < 70; y++) for (let xx = 30; xx < 70; xx++) m[y * 100 + xx] = 255;
    for (let y = 28; y < 72; y++) for (let xx = 28; xx < 30; xx++) m[y * 100 + xx] = 128;   /* soft edge over the halo */
    st.mask = m; maskChanged(); st.bgC = '#ffffff'; st.bgAuto = false;
    st.defr = 0; const before = popSrc(false).getContext('2d').getImageData(28, 50, 1, 1).data[0];
    st.defr = 1; st.maskVer++; const after = popSrc(false).getContext('2d').getImageData(28, 50, 1, 1).data[0];
    const inner = popSrc(false).getContext('2d').getImageData(50, 50, 1, 1).data[0];
    return { before, after, inner };
  });
  assert.ok(r.after < r.before - 20, 'halo pixel got darker, i.e. less background colour: ' + JSON.stringify(r));
  assert.equal(r.inner, 0x20);
});

test('table-size preview draws three sizes and can be switched off', async () => {
  const page = await openApp(browser);
  await page.evaluate(() => setStrip(true));
  await settle(page, 300);
  const r = await page.evaluate(() => [...document.querySelectorAll('#tableStrip canvas')].map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 128) n++; return n; }));
  assert.equal(r.length, 3); assert.ok(r[0] > 100 && r[1] > r[0] && r[2] > r[1], r.join());
  await page.evaluate(() => setStrip(false));
  assert.equal(await page.evaluate(() => document.querySelector('#tableStrip').hidden), true);
});

test('undo and redo are always reachable on a phone (header buttons)', async () => {
  const page = await openApp(browser, { width: 390, height: 844, touch: true });
  const r = await page.evaluate(() => { const b = document.querySelector('#bUndo2').getBoundingClientRect(); return { visible: b.width > 0 && b.right <= innerWidth, disabled: document.querySelector('#bUndo2').disabled }; });
  assert.ok(r.visible);
  await page.evaluate(() => { st.zoom = 2; commit(); });
  assert.equal(await page.evaluate(() => document.querySelector('#bUndo2').disabled), false);
  await page.tap('#bUndo2');
  assert.equal(await page.evaluate(() => st.zoom), 1.3);
});
