import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('Ridge is the default ring and Plain has a Grooves count from 0 to 5', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(() => { const d = st.formula; setPattern('plain', true); const lab = SLI.count.label.textContent, mn = +SLI.count.range.min, mx = +SLI.count.range.max, vis = !$('#rowCount').hidden; return { d, lab, mn, mx, vis, hero: LOOKS.find(l => l.name === 'Hero').formula, enemy: LOOKS.find(l => l.name === 'Enemy').formula }; });
  assert.equal(r.d, 'ridge'); assert.equal(r.lab, 'Grooves'); assert.equal(r.mn, 0); assert.equal(r.mx, 5); assert.ok(r.vis);
  assert.equal(r.hero, 'ridge'); assert.equal(r.enemy, 'ridge');
  assert.deepEqual(page.errors, []);
});

test('Preview hides outlines and overlays in one tap; Refine and the region slider are gone', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(() => ({ refine: !!document.querySelector('#bRefine'), region: !!document.querySelector('#regAdv'), prev: !!document.querySelector('#bPrev'), sensitivity: !!document.querySelector('#r_tol') }));
  assert.equal(r.refine, false); assert.equal(r.region, false); assert.ok(r.prev);
  const s = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#ddd'; x.fillRect(0, 0, 300, 300); x.fillStyle = '#222'; x.fillRect(100, 100, 100, 100);
    loadCanvas(c, 't'); st.tol = 40; wandStart(10, 10, 'add'); wandDone(); invertSel(); const sel = st.selCount > 0; togglePrev(); const on = st.prev, pressed = $('#bPrev').getAttribute('aria-pressed'); togglePrev(); return { sel, on, pressed, off: st.prev }; });
  assert.ok(s.sel); assert.equal(s.on, true); assert.equal(s.pressed, 'true'); assert.equal(s.off, false);
});

test('Wand Sensitivity: each part of the slider matters', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d');
    /* a vertical gradient: the more sensitive, the further down the selection reaches */
    const g = x.createLinearGradient(0, 0, 0, 400); g.addColorStop(0, '#808080'); g.addColorStop(1, '#e0e0e0'); x.fillStyle = g; x.fillRect(0, 0, 400, 400);
    loadCanvas(c, 't'); st.contig = true; const out = []; for (const s of [10, 20, 30, 40, 50, 60, 70]) { st.tol = s; let n = 0; for (const v of wandSel(200, 5)) n += v ? 1 : 0; out.push(n); } return out; });
  for (let i = 1; i < r.length; i++) assert.ok(r[i] > r[i - 1], 'strictly growing: ' + r.join(','));
  assert.ok(r[r.length - 1] > r[0] * 5, r.join(','));
});

test('Preview grid cells are square pixels, a tenth of the board width', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(async () => { setPreviewBg('map'); setStrip(true); await new Promise(r => setTimeout(r, 300)); const col = $('.canvas-col'); return { cell: parseFloat(col.style.getPropertyValue('--cell')), w: $('#board').clientWidth }; });
  assert.ok(r.cell > 10 && Math.abs(r.cell - r.w / 10) < .5, 'cell ' + r.cell + ' board ' + r.w);
});
