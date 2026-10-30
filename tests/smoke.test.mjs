import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, openApp, settle } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('boots with sample art, a pre-selected pop-out and no console errors', async () => {
  const page = await openApp(browser);
  const s = await page.evaluate(() => ({ sel: st.selCount, hist: H.a.length, tool: st.tool }));
  assert.ok(s.sel > 1000, 'pop-out is pre-selected');
  assert.equal(s.tool, 'select');
  assert.deepEqual(page.errors, []);
});

test('every shape and every texture renders without errors', async () => {
  const page = await openApp(browser);
  const shapes = await page.evaluate(() => PAT_ORDER);
  for (const id of shapes) {
    await page.evaluate((id) => { setPattern(id, true); syncUI(); draw(); }, id);
    await page.waitForTimeout(40);
  }
  for (const [id] of await page.evaluate(() => TEX)) {
    await page.evaluate((id) => { st.tex = id; syncUI(); draw(); }, id);
    await settle(page, 60);
  }
  assert.deepEqual(page.errors, []);
});

test('every built-in look applies and produces a ring', async () => {
  const page = await openApp(browser);
  const n = await page.evaluate(() => LOOKS.length);
  for (let i = 0; i < n; i++) {
    await page.evaluate((i) => applyLook(LOOKS[i]), i);
    await settle(page, 80);
  }
  assert.deepEqual(page.errors, []);
});

test('toolbar zoom moves in 5% steps in Move and in the workspace in Select', async () => {
  const page = await openApp(browser);
  await page.evaluate(() => setTool('move'));
  const z0 = await page.evaluate(() => st.zoom);
  await page.click('#bZoomIn');
  const z1 = await page.evaluate(() => st.zoom);
  assert.ok(Math.abs(z1 - z0 - 0.05) < 1e-9 || Math.abs(z1 - Math.round(z0 / 0.05 + 1) * 0.05) < 1e-9);
  await page.evaluate(() => setTool('select'));
  await page.click('#bZoomIn');
  assert.ok(await page.evaluate(() => st.vz > 1));
});

test('live wand: sensitivity re-runs the selection and keeps a single undo step', async () => {
  const page = await openApp(browser);
  await page.click('#bClear');
  const box = await page.locator('#cv').boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.62);
  const a = await page.evaluate(() => [st.selCount, H.a.length]);
  await page.evaluate(() => { const r = document.querySelector('#r_tol'); r.value = 60; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(200);
  const b = await page.evaluate(() => [st.selCount, H.a.length]);
  assert.ok(b[0] > a[0], 'higher sensitivity selects more');
  assert.equal(b[1], a[1], 'the tweak replaced the history entry');
  await page.click('#bUndo');
  assert.equal(await page.evaluate(() => st.selCount), 0);
});

test('export embeds the project and re-importing restores selection and ring', async () => {
  const page = await openApp(browser);
  await page.evaluate(() => { applyLook(LOOKS.find((l) => l.name === 'Royal Braid')); });
  await page.click('#t-export');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bDownload')]);
  const path = join(mkdtempSync(join(tmpdir(), 'tw-')), 'token.png');
  await dl.saveAs(path);
  const sel = await page.evaluate(() => st.selCount);
  await page.evaluate(() => applyLook(LOOKS[0]));
  await page.setInputFiles('#file', path);
  await page.waitForFunction(() => document.querySelector('#importDlg').open);
  await page.click('#impProject');
  await page.waitForFunction(() => st.formula === 'braid');
  assert.equal(await page.evaluate(() => st.selCount), sel);
  assert.deepEqual(page.errors, []);
});

test('ring layer is cached: panning and selecting do not redraw it, ring edits do', async () => {
  const page = await openApp(browser);
  await page.evaluate(() => { window.__n = 0; const f = drawRing; drawRing = function (...a) { window.__n++; return f.apply(this, a); }; });
  const count = () => page.evaluate(() => window.__n);
  await page.evaluate(() => { st.autoFit = false; st.pad = st.padCur; syncUI(); st.ix += .05; viewChanged(); });
  await page.waitForTimeout(150);
  const base = await count();
  await page.evaluate(() => { st.ix += .02; viewChanged(); });
  await page.waitForTimeout(150);
  await page.evaluate(() => { st.hover = { x: 10, y: 10 }; draw(); });
  await page.waitForTimeout(100);
  assert.equal(await count(), base, 'no ring redraw while moving');
  await page.evaluate(() => { st.width = .2; draw(); });
  await page.waitForTimeout(150);
  assert.ok(await count() > base, 'ring redraws after a ring change');
});
