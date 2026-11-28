import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!(e && e.offsetParent); }, sel);

test('Guided only: essentials first, tools renamed, "Show all options" opens the rest; no Find, Studio or Open buttons in the header', async () => {
  const page = await openApp(browser, { guided: true, step: 'popout' });
  assert.ok(await page.evaluate(() => document.body.classList.contains('simple')));
  assert.deepEqual(await page.evaluate(() => ['select', 'brush', 'magnet'].map(t => document.querySelector('.tbtn[data-tool=' + t + '] span').textContent)), ['Click', 'Paint', 'Trace']);
  assert.ok(!(await vis(page, '.tbtn[data-tool=lasso]')) && !(await vis(page, '#bIso')));
  assert.ok(await vis(page, '#edgeSeg') && await vis(page, '#hideSeg') && await vis(page, '#bFixEdges'));
  assert.ok(!(await vis(page, '#r_feather')), 'feather hidden until Fine-tune');
  await page.click('.fineBtn[data-fine=popout]');
  assert.ok(await vis(page, '#r_feather') && await vis(page, '#bNudgeIn'));
  await page.click('.fineBtn[data-fine=popout]');
  assert.ok(!(await vis(page, '#r_feather')));
  assert.equal(await page.textContent('.fineBtn[data-fine=popout]'), 'Show all options');
  const head = await page.evaluate(() => ({ find: !!document.querySelector('#bFind'), mode: !!document.querySelector('#bMode'), openInHeader: !!document.querySelector('.top #bOpen'), openInImage: !!document.querySelector('#p-image #bOpen'), view: [...document.querySelectorAll('#bZoomIn span,#bZoomOut span,#bViewFit span')].map(e => e.textContent), zoomLabel: SL.zoom.label }));
  assert.deepEqual(head, { find: false, mode: false, openInHeader: false, openInImage: true, view: ['View +', 'View −', 'Fit view'], zoomLabel: 'Zoom picture' });
  assert.deepEqual(page.errors, []);
});

test('Guided: a new visitor sees only essentials on every step; the ring step opens on Looks', async () => {
  const page = await openApp(browser, { guided: true, step: 'image' });
  assert.ok(!(await vis(page, '#r_zoom')) && !(await vis(page, '#r_bri')));
  await page.click('#t-ring');
  assert.ok(await vis(page, '#secLooks') && !(await vis(page, '#secShape')) && !(await vis(page, '#secTex')));
  await page.click('#t-export');
  assert.ok(await vis(page, '#sizes') && await vis(page, '#bDownload') && await vis(page, '#fname') && !(await vis(page, '#whatSeg')));
});

test('Edge styles set feather and halo removal together and highlight when they match', async () => {
  const page = await openApp(browser, { guided: true });
  await page.click('#edgeSeg [data-v=natural]');
  assert.deepEqual(await page.evaluate(() => [st.feather, st.defr]), [2, .5]);
  assert.equal(await page.evaluate(() => document.querySelector('#edgeSeg [data-v=natural]').getAttribute('aria-pressed')), 'true');
  await page.click('#edgeSeg [data-v=crisp]');
  assert.equal(await page.evaluate(() => st.feather), .5);
  await page.evaluate(() => { st.feather = 3; syncUI(); });
  assert.equal(await page.evaluate(() => document.querySelectorAll('#edgeSeg [aria-pressed=true]').length), 0);
});

test('Hide a side tucks part of the pop-out behind the ring, any side, undoable, saved with the token', async () => {
  const page = await openApp(browser, { guided: true });
  await page.evaluate(() => { st.mask.fill(255); maskChanged(); commit(); });
  const probe = () => page.evaluate(() => { refreshSoft(); const w = st.sw, h = st.sh, k = 2 / Math.min(w, h) * st.zoom, co = Math.cos(st.rot), si = Math.sin(st.rot), f = st.flip;
    const d = st.softCv.getContext('2d').getImageData(0, 0, w, h).data; let hid = 0, shown = 0, bad = 0;
    for (let y = 0; y < h; y += 7) for (let x = 0; x < w; x += 7) { const px = (x + .5 - w / 2) * k * f, py = (y + .5 - h / 2) * k, X = px * co - py * si + st.ix, Y = px * si + py * co + st.iy, a = hideAlpha(X, Y), got = d[(y * w + x) * 4 + 3];
      if (a === 0) { hid++; if (got > 3) bad++; } else if (a === 1) { shown++; if (got < 250) bad++; } }
    return { hid, shown, bad }; });
  assert.deepEqual(await probe(), (await probe()));
  assert.equal((await probe()).hid, 0);
  await page.click('#hideSeg [data-v=bottom]');
  const b = await probe();
  assert.ok(b.hid > 50 && b.shown > 50 && b.bad === 0, JSON.stringify(b));
  assert.equal(await page.evaluate(() => [hideAlpha(0, 1.05), hideAlpha(0, -1.05), hideAlpha(1.05, 0)]).then(a => a.join()), '0,1,1');
  await page.click('#hideSeg [data-v=left]');
  assert.equal(await page.evaluate(() => [hideAlpha(-1.05, 0), hideAlpha(0, 1.05)].join()), '0,1');
  const meta = await page.evaluate(() => projectMeta({ type: 'image/png', crop: { x: 0, y: 0, w: st.sw, h: st.sh } }));
  assert.equal(meta.settings.hideOn, true); assert.equal(meta.settings.hideA, 180);
  assert.ok(meta.history.some(x => /Hide a side: left/.test(x)));
  await page.click('#hideSeg [data-v=none]');
  assert.equal((await probe()).hid, 0);
  await page.evaluate(() => undo());
  assert.equal(await page.evaluate(() => st.hideOn), true);
});

test('dragging a handle on the ring turns the hidden arc; the frame ignores hidden parts', async () => {
  const page = await openApp(browser, { guided: true, width: 1100, height: 900 });
  await page.evaluate(() => { st.mask.fill(255); maskChanged(); commit(); st.vz = 1; st.vx = st.vy = 0; });
  const y1 = await page.evaluate(() => popBounds().y1);
  await page.click('#hideSeg [data-v=bottom]');
  assert.ok(await page.evaluate((y) => popBounds().y1 < y - .05, y1), 'hidden bottom no longer stretches the frame');
  const from = await page.evaluate(() => { const g = geom(cv.width, effPad()), r = cv.getBoundingClientRect(), s = r.width / cv.width, a = (st.hideA + st.hideW / 2) * Math.PI / 180;
    const pt = (A) => ({ x: r.left + (g.c + g.R * Math.cos(A)) * s, y: r.top + (g.c + g.R * Math.sin(A)) * s });
    return { e: pt(a), to: pt(Math.PI / 4), w0: st.hideW }; });
  await page.mouse.move(from.e.x, from.e.y); await page.mouse.down(); await page.mouse.move(from.to.x, from.to.y, { steps: 6 }); await page.mouse.up();
  const r = await page.evaluate(() => [st.hideW, Math.round(st.hideA)]);
  assert.ok(r[0] < from.w0 && r[0] >= 20, 'arc shrank to ' + r[0]);
  assert.ok(r[1] < 90, 'arc turned toward the right: ' + r[1]);
});

test('Find: Ctrl+K jumps to any control, opens Fine-tune and the right step', async () => {
  const page = await openApp(browser, { guided: true, step: 'image' });
  await page.keyboard.press('Control+k');
  assert.ok(await page.evaluate(() => document.querySelector('#findDlg').open));
  await page.keyboard.type('feather');
  assert.match(await page.evaluate(() => document.querySelector('#findList li').textContent), /Feather/);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => tab === 'popout' && document.querySelector('#r_feather').offsetParent);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'r_feather');
  await page.keyboard.press('Control+k'); await page.keyboard.type('trace'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => st.tool === 'magnet');
  await page.keyboard.press('Control+k'); await page.keyboard.type('zzzz');
  assert.ok(await vis(page, '#findEmpty'));
});

test('tips: one short line, gone after the first action in the step, and the Tips switch silences them', async () => {
  const page = await openApp(browser, { guided: true, step: 'image' });
  assert.ok(!(await vis(page, '#tip')));
  await page.click('#t-popout');
  assert.match(await page.evaluate(() => document.querySelector('#tipT').textContent), /Get the person out/);
  assert.ok(await vis(page, '#tip'));
  await page.evaluate(() => { st.feather = 3; commit(); });
  assert.ok(!(await vis(page, '#tip')));
  await page.click('#t-ring'); assert.ok(await vis(page, '#tip'));
  await page.evaluate(() => { const s = document.querySelector('#tipsOn'); s.checked = false; s.dispatchEvent(new Event('change')); });
  assert.ok(!(await vis(page, '#tip')));
  await page.click('#t-export'); assert.ok(!(await vis(page, '#tip')));
});

test('steps that are done show a check', async () => {
  const page = await openApp(browser, { guided: true, step: 'image' });
  await page.click('#t-popout'); await page.click('#t-ring');
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.tab')].map(t => t.classList.contains('done'))), [true, true, false, false]);
});

test('Image step: the wheel zooms the picture around the cursor; a new picture starts fully inside the ring', async () => {
  const page = await openApp(browser, { step: 'image', width: 1100, height: 900 });
  const SC = `(()=>{const c=document.createElement('canvas');c.width=800;c.height=500;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,800,0);g.addColorStop(0,'#c33');g.addColorStop(1,'#36c');x.fillStyle=g;x.fillRect(0,0,800,500);return c;})()`;
  await page.evaluate(async (src) => { const c = eval(src), blob = await new Promise((res) => c.toBlob(res, 'image/png')); loadFile(new File([blob], 'wide.png', { type: 'image/png' })); await new Promise((r) => setTimeout(r, 700)); }, SC);
  const fit = await page.evaluate(() => { const k = 2 / Math.min(st.sw, st.sh) * st.zoom, half = k * Math.hypot(st.sw, st.sh) / 2; return { half, ri: 1 - st.width }; });
  assert.ok(fit.half <= fit.ri + 1e-6 && fit.half > fit.ri * .9, 'whole picture just fits the ring ' + JSON.stringify(fit));
  const r = await page.evaluate(() => cv.getBoundingClientRect());
  const at = { x: r.left + r.width * .62, y: r.top + r.height * .4 };
  const under = () => page.evaluate(({ x, y }) => { const r = cv.getBoundingClientRect(), s = cv.width / r.width, q = toTok({ x: (x - r.left) * s, y: (y - r.top) * s }), g = geom(cv.width, effPad()), p = toImg(g, q.x, q.y); return [p.u, p.v, st.zoom, st.vz]; }, at);
  const a = await under();
  await page.mouse.move(at.x, at.y); await page.mouse.wheel(0, -300); await page.waitForTimeout(100);
  const b = await under();
  assert.ok(b[2] > a[2] * 1.2, 'zoomed in ' + a[2] + ' → ' + b[2]);
  assert.equal(b[3], a[3], 'the view is not touched');
  assert.ok(Math.abs(b[0] - a[0]) < 2 && Math.abs(b[1] - a[1]) < 2, 'point under the cursor stays put: ' + a + ' → ' + b);
});
