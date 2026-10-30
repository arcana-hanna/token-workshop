import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, settle } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

/* A dark head on a light grey studio background, with thin anti-aliased hairs and a blurry light halo. */
const loadHair = (page) => page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d');
  x.fillStyle = '#d6d6d6'; x.fillRect(0, 0, 400, 400);
  x.strokeStyle = '#2a1a10'; x.lineWidth = 1.2; x.lineCap = 'round';
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; x.beginPath(); x.moveTo(200 + Math.cos(a) * 80, 200 + Math.sin(a) * 80); x.lineTo(200 + Math.cos(a + .1) * 112, 200 + Math.sin(a + .1) * 112); x.stroke(); }
  x.fillStyle = '#2a1a10'; x.beginPath(); x.arc(200, 200, 82, 0, 7); x.fill();
  loadCanvas(c, 'test'); st.tol = 43; wandStart(200, 200, 'add'); wandDone();
  return { sel: st.selCount };
});

test('soft matte keeps hair strands as partial opacity and sets the background colour', async () => {
  const page = await openApp(browser);
  const before = await loadHair(page);
  const r = await page.evaluate(() => { const r = fixEdges(true); return { matte: r.matte, sel: st.selCount, partial: st.partial, defr: st.defr, bg: st.bgC }; });
  assert.ok(r.matte, 'matte ran');
  assert.ok(r.partial > 50, 'soft pixels exist: ' + r.partial);
  assert.ok(r.sel > before.sel, 'hair added to the selection');
  assert.equal(r.defr, 1);
  assert.ok(/^#[c-e][0-9a-f][c-e][0-9a-f][c-e][0-9a-f]$/.test(r.bg), 'background estimated as light grey: ' + r.bg);
  assert.deepEqual(page.errors, []);
});

test('fix edges is one undoable step and the live sliders re-run from the original mask', async () => {
  const page = await openApp(browser);
  await loadHair(page);
  const r = await page.evaluate(() => {
    const start = st.mask, h0 = H.i; fixEdges(false); const afterFix = st.mask, h1 = H.i;
    st.eTol = 5; edgeLive({ matte: true, clean: true, shift: true }); edgeCommit();
    const sameStep = H.i === h1;   /* a tweak replaces the entry, it does not stack */
    undo(); const undone = st.mask === start;
    return { stepped: h1 === h0 + 1, changed: afterFix !== start, sameStep, undone };
  });
  assert.deepEqual(r, { stepped: true, changed: true, sameStep: true, undone: true });
});

test('clean-up removes specks and fills holes, and leaves the main subject alone', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 200; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 200, 200); loadCanvas(c, 't');
    const m = new Uint8Array(200 * 200);
    for (let y = 40; y < 160; y++) for (let xx = 40; xx < 160; xx++) m[y * 200 + xx] = 255;
    m[10 * 200 + 10] = 255; m[11 * 200 + 10] = 255;                       /* speck */
    for (let y = 90; y < 93; y++) for (let xx = 90; xx < 93; xx++) m[y * 200 + xx] = 0;   /* hole */
    st.mask = m; maskChanged(); const before = st.selCount;
    const res = cleanMask(st.mask, bounds(), 20, true);
    return { specks: res.specks, filled: res.filled, speck: res.mask[10 * 200 + 10], hole: res.mask[91 * 200 + 91], main: res.mask[100 * 200 + 50], before };
  });
  assert.equal(r.specks, 1); assert.equal(r.filled, 1);
  assert.equal(r.speck, 0); assert.equal(r.hole, 255); assert.equal(r.main, 255);
});

test('hair-aware brush adds only pixels that differ from the background', async () => {
  const page = await openApp(browser);
  await loadHair(page);
  const r = await page.evaluate(() => {
    st.eReach = 6; st.strand = true; st.mask = st.mask.slice();
    const before = st.selCount; startPaint(); dab(200 + 100, 200, 22, 255); endPaint();   /* over a stretch of hairs and background */
    const grew = st.selCount > before;
    /* background-only spot: nothing should be added */
    const n0 = st.selCount; startPaint(); dab(30, 30, 20, 255); endPaint();
    return { grew, bgAdds: st.selCount - n0 };
  });
  assert.ok(r.grew, 'strands added');
  assert.ok(r.bgAdds < 5, 'plain background not added: ' + r.bgAdds);
  assert.deepEqual(page.errors, []);
});

test('soft brush fades the stroke edge and edge shift grows and shrinks', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 200; c.getContext('2d').fillRect(0, 0, 200, 200); loadCanvas(c, 't');
    st.bsoft = .8; st.mask = new Uint8Array(200 * 200); startPaint(); dab(100, 100, 40, 255); endPaint();
    const centre = st.mask[100 * 200 + 100], rim = st.mask[100 * 200 + 135];
    st.bsoft = 0; st.mask = new Uint8Array(200 * 200); startPaint(); dab(100, 100, 40, 255); endPaint();
    const base = st.selCount, B = bounds();
    const grown = shiftEdge(st.mask, B, 100), shrunk = shiftEdge(st.mask, B, -100);
    let g = 0, s = 0; for (const v of grown) if (v > 127) g++; for (const v of shrunk) if (v > 127) s++;
    return { centre, rim, base, g, s };
  });
  assert.equal(r.centre, 255); assert.ok(r.rim > 0 && r.rim < 255, 'rim is partial: ' + r.rim);
  assert.ok(r.g > r.base && r.s < r.base, JSON.stringify(r));
});

test('the soft mask survives export and import', async () => {
  const page = await openApp(browser);
  await loadHair(page);
  const r = await page.evaluate(async () => {
    fixEdges(true); const before = st.mask.slice(), p0 = st.partial;
    const enc = rle8Enc(before), back = rle8Dec(enc, before.length);
    let maxd = 0; for (let i = 0; i < before.length; i++) maxd = Math.max(maxd, Math.abs(before[i] - back[i]));
    return { p0, maxd, size: enc.length };
  });
  assert.ok(r.p0 > 0); assert.ok(r.maxd <= 8, 'quantisation error ' + r.maxd); assert.ok(r.size < 20000, 'compact: ' + r.size);
});

test('Auto runs the edge chain after finding the subject, and can be switched off', async () => {
  const page = await openApp(browser);
  const on = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d');
    x.fillStyle = '#d6d6d6'; x.fillRect(0, 0, 400, 400); x.fillStyle = '#2a1a10'; x.beginPath(); x.arc(200, 200, 90, 0, 7); x.fill();
    x.strokeStyle = '#2a1a10'; x.lineWidth = 1.2; for (let i = 0; i < 20; i++) { const a = i / 20 * 6.28; x.beginPath(); x.moveTo(200 + Math.cos(a) * 85, 200 + Math.sin(a) * 85); x.lineTo(200 + Math.cos(a) * 118, 200 + Math.sin(a) * 118); x.stroke(); }
    loadCanvas(c, 't'); runAuto(); await new Promise(r => setTimeout(r, 900));
    return { sel: st.selCount, partial: st.partial };
  });
  assert.ok(on.sel > 1000);
  assert.ok(on.partial > 0, 'soft edges from Auto: ' + on.partial);
  const off = await page.evaluate(async () => {
    store.set('tw_autofix', '0'); runAuto(); await new Promise(r => setTimeout(r, 900)); return st.partial;
  });
  assert.equal(off, 0);
  assert.deepEqual(page.errors, []);
});

test('dark brown hair on a black-to-brown gradient: the matte still finds the strands', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 600; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 600, 600); g.addColorStop(0, '#050403'); g.addColorStop(1, '#2a1d14'); x.fillStyle = g; x.fillRect(0, 0, 600, 600);
    x.strokeStyle = 'rgba(70,42,24,.9)'; x.lineWidth = 1.3; x.lineCap = 'round';
    for (let i = 0; i < 90; i++) { const a = i / 90 * 6.283, r0 = 110, r1 = 140 + Math.abs(Math.sin(i * 7)) * 60; x.beginPath(); x.moveTo(300 + Math.cos(a) * r0, 300 + Math.sin(a) * r0); x.lineTo(300 + Math.cos(a + .15) * r1, 300 + Math.sin(a + .15) * r1); x.stroke(); }
    x.fillStyle = '#4a2c18'; x.beginPath(); x.arc(300, 300, 118, 0, 7); x.fill();
    loadCanvas(c, 'dark'); st.tol = 28; wandStart(300, 200, 'add'); wandDone();
    const n0 = st.selCount, res = fixEdges(true);
    return { n0, n1: st.selCount, matte: res.matte, partial: st.partial, low: res.low };
  });
  assert.ok(r.matte && !r.low, 'matte ran on low contrast: ' + JSON.stringify(r));
  assert.ok(r.partial > 200 && r.n1 > r.n0, JSON.stringify(r));
});

test('Auto on a plain background removes pockets between curls but keeps small enclosed whites', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 600; const x = c.getContext('2d');
    x.fillStyle = '#fdfdfd'; x.fillRect(0, 0, 600, 600);
    x.strokeStyle = '#3a5a80'; x.lineWidth = 14; x.beginPath(); x.arc(300, 300, 150, 0, 6.2); x.stroke();            /* a loop of hair enclosing a white pocket, with a small gap */
    x.fillStyle = '#3a5a80'; x.fillRect(150, 290, 150, 14);                                                              /* a lock crossing the loop */
    x.fillStyle = '#c08060'; x.beginPath(); x.arc(300, 300, 40, 0, 7); x.fill();                                          /* a face, which has a tiny white eye */
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(290, 295, 4, 0, 7); x.fill();
    loadCanvas(c, 't'); const r0 = autoUniform(), m = r0 && r0.mask;
    return m ? { pocket: m[200 * 600 + 300], eye: m[295 * 600 + 290], face: m[310 * 600 + 310], ring: m[150 * 600 + 300], outside: m[10 * 600 + 10] } : null;
  });
  assert.ok(r, 'a mask was found');
  assert.equal(r.outside, 0); assert.ok(r.pocket < 40, 'pocket in the loop is background'); assert.ok(r.ring > 240); assert.ok(r.face > 240); assert.ok(r.eye > 240, 'tiny eye white stays');
});
