import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('Preview keeps the brush circle', async () => {
  const page = await openApp(browser);
  const frame = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.evaluate(() => { setTool('brush'); st.prev = true; st.hover = null; draw(); });
  await frame();
  const a = await page.evaluate(() => cv.toDataURL());
  await page.evaluate(() => { st.hover = { x: cv.width / 2, y: cv.height / 2 }; draw(); });
  await frame();
  assert.notEqual(a, await page.evaluate(() => cv.toDataURL()));
});

test('lasso: drag selects the enclosed area, Shift removes it, one undo step each', async () => {
  const page = await openApp(browser);
  await page.click('#bClear');
  await page.click('[data-tool=lasso]');
  const b = await page.locator('#cv').boundingBox();
  const ring = async (shift) => {
    if (shift) await page.keyboard.down('Shift');
    await page.mouse.move(b.x + b.width * .35, b.y + b.height * .35);
    await page.mouse.down();
    for (const [x, y] of [[.65, .35], [.65, .65], [.35, .65], [.35, .36]]) await page.mouse.move(b.x + b.width * x, b.y + b.height * y, { steps: 6 });
    await page.mouse.up();
    if (shift) await page.keyboard.up('Shift');
  };
  const h0 = await page.evaluate(() => H.a.length);
  await ring(false);
  const s1 = await page.evaluate(() => [st.selCount, H.a.length]);
  assert.ok(s1[0] > 1000); assert.equal(s1[1], h0 + 1);
  await ring(true);
  assert.ok(await page.evaluate(n => st.selCount < n * 0.02, s1[0]));   // a re-drawn loop removes (almost) the same area
  await page.keyboard.press('Control+z');
  assert.ok(await page.evaluate(() => st.selCount > 1000));
});

test('Match colour to ring never changes brightness or contrast', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(() => { st.color = '#1b1b1b'; st.colorKey = 'Custom'; st.gradOn = false; st.bri = 0; st.con = 0; matchToRing(); return [st.bri, st.con, st.sat]; });
  assert.equal(r[0], 0); assert.equal(r[1], 0);
});

test('Ring tab: collapsible sections, Colour first and open, gradient balance slider', async () => {
  const page = await openApp(browser);
  await page.click('#t-ring');
  const r = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('#p-ring > details.sec')].map(d => d.id);
    const open = $('#secColour').open, shape = $('#secShape').open;
    const mid0 = $('#rowGradMid').hidden;
    st.gradOn = true; syncUI();
    const mid1 = $('#rowGradMid').hidden;
    return { ids, open, shape, mid0, mid1 };
  });
  assert.equal(r.ids[0], 'secColour'); assert.ok(r.ids.length >= 5);
  assert.ok(r.open); assert.ok(!r.shape); assert.ok(r.mid0); assert.ok(!r.mid1);
});

test('gradient balance moves the colour split', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(() => {
    const px = (m) => { const c = mk(); c.width = c.height = 200; const x = c.getContext('2d'); const p = { ...RING_DEFAULT, gradOn: true, g1: '#ffff00', g2: '#ff0000', gAng: 0, gMid: m, tex: 'none' };
      drawRing(x, 100, 90, p); return [...x.getImageData(100, 15, 1, 1).data]; };
    return [px(.15), px(.85)];
  });
  assert.ok(r[0][1] !== r[1][1], JSON.stringify(r));
});

test('dropping a picture names the export after its file', async () => {
  const page = await openApp(browser);
  await page.evaluate(async () => {
    const c = mk(); c.width = c.height = 64; c.getContext('2d').fillRect(0, 0, 64, 64);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    loadFile(new File([blob], 'Orc Chief.png', { type: 'image/png' }));
  });
  await page.waitForFunction(() => $('#fname').value.startsWith('Orc Chief'));
  assert.equal(await page.inputValue('#fname'), 'Orc Chief-token');
});

test('steps: toolbar shows only the tools of the current step', async () => {
  const page = await openApp(browser, { step: 'image' });
  const vis = () => page.evaluate(() => [...document.querySelectorAll('.tools .tbtn')].filter(b => b.offsetParent).map(b => b.id || b.dataset.tool));
  let v = await vis();
  assert.ok(v.includes('move') && !v.includes('select') && !v.includes('bAuto'));
  assert.equal(await page.evaluate(() => st.tool), 'move');
  await page.click('#t-popout');
  v = await vis();
  assert.ok(v.includes('select') && v.includes('lasso') && v.includes('bAuto') && !v.includes('move'));
  assert.notEqual(await page.evaluate(() => st.tool), 'move');
  for (const t of ['ring', 'export']) {
    await page.click('#t-' + t);
    v = await vis();
    assert.ok(!v.includes('select') && !v.includes('move') && v.includes('bPrev') && v.includes('bUndo'));
    assert.equal(await page.evaluate(() => st.tool), 'move');   // dragging the canvas still moves the picture
  }
});

test('shortcut keys jump to the step that owns the tool', async () => {
  const page = await openApp(browser, { step: 'ring' });
  await page.keyboard.press('b');
  assert.equal(await page.evaluate(() => [tab, st.tool].join()), 'popout,brush');
  await page.keyboard.press('v');
  assert.equal(await page.evaluate(() => [tab, st.tool].join()), 'image,move');
});

test('a loaded picture stays on Place and shows the pop-out see-through', async () => {
  const page = await openApp(browser, { step: 'image' });
  assert.equal(await page.evaluate(() => tab), 'image');
  assert.ok(await page.evaluate(() => st.selCount > 0));
});
