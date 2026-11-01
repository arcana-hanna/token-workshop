import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

const px = (page, u, v) => page.evaluate(([u, v]) => { const c = artSrc(false), d = c.getContext('2d').getImageData(u, v, 1, 1).data; return [...d]; }, [u, v]);

test('backdrop colour replaces the background but never touches the pop-out', async () => {
  const page = await openApp(browser, { step: 'bg' });
  const before = await px(page, 420, 250);   // inside the hat (pop-out)
  const sky0 = await px(page, 30, 30);
  await page.evaluate(() => { st.bgMode = 'colour'; st.bgCol = '#ff0000'; draw(); });
  const sky = await px(page, 30, 30), hat = await px(page, 420, 250);
  assert.ok(sky[0] > 240 && sky[1] < 15 && sky[2] < 15, 'sky is red: ' + sky);
  assert.deepEqual(hat, before);
  assert.notDeepEqual(sky, sky0);
});

test('the pop-out wins: growing it takes pixels from the backdrop, shrinking gives them back', async () => {
  const page = await openApp(browser, { step: 'popout' });
  await page.evaluate(() => { st.bgMode = 'colour'; st.bgCol = '#ff0000'; draw(); });
  const p = [100, 100];
  assert.ok((await px(page, ...p))[0] > 240);                          // backdrop at first
  await page.evaluate(([u, v]) => { const m = st.mask.slice(); for (let y = v - 5; y <= v + 5; y++) for (let x = u - 5; x <= u + 5; x++) m[y * st.sw + x] = 255; st.mask = m; maskChanged(); }, p);
  const inPop = await px(page, ...p);
  assert.ok(!(inPop[0] > 240 && inPop[1] < 15), 'pop-out pixel is not backdrop: ' + inPop);
  await page.evaluate(([u, v]) => { const m = st.mask.slice(); for (let y = v - 5; y <= v + 5; y++) for (let x = u - 5; x <= u + 5; x++) m[y * st.sw + x] = 0; st.mask = m; maskChanged(); }, p);
  assert.ok((await px(page, ...p))[0] > 240);                          // given back, nothing was lost
});

test('Backdrop step edits its own mask; the pop-out mask is kept and restored', async () => {
  const page = await openApp(browser, { step: 'popout' });
  const n0 = await page.evaluate(() => st.selCount);
  await page.click('#t-bg');
  const r = await page.evaluate(() => [st.act, st.selCount, st.popN]);
  assert.equal(r[0], 'bg'); assert.equal(r[2], n0); assert.notEqual(r[1], n0);
  await page.click('#bClear');
  assert.equal(await page.evaluate(() => st.selCount), 0);
  await page.click('#t-popout');
  assert.equal(await page.evaluate(() => [st.act, st.selCount].join()), 'pop,' + n0);
  await page.click('#t-bg');
  assert.equal(await page.evaluate(() => st.selCount), 0);               // the cleared backdrop is still cleared
});

test('Undo in the Backdrop step reverts the backdrop edit only', async () => {
  const page = await openApp(browser, { step: 'bg' });
  const [n0, p0] = await page.evaluate(() => [st.selCount, st.popN]);
  await page.click('#bClear');
  assert.equal(await page.evaluate(() => st.selCount), 0);
  await page.keyboard.press('Control+z');
  assert.equal(await page.evaluate(() => [st.selCount, st.popN].join()), n0 + ',' + p0);
});

test('Clear removes the backdrop (transparent); Auto backdrop and All-but-pop-out work', async () => {
  const page = await openApp(browser, { step: 'bg' });
  await page.evaluate(() => { st.bgMode = 'clear'; draw(); });
  assert.equal((await px(page, 30, 30))[3], 0);
  const hat = await px(page, 420, 250);
  assert.equal(hat[3], 255);
  await page.click('#bBgRest');
  assert.ok(await page.evaluate(() => st.selCount > st.sw * st.sh * .8));
});

test('exporting from the Backdrop step equals exporting from the Ring step', async () => {
  const page = await openApp(browser, { step: 'bg' });
  await page.evaluate(() => { st.bgMode = 'gradient'; syncUI(); draw(); });
  const shot = () => page.evaluate(() => { const c = mk(); c.width = c.height = 300; st.exportSize = 300; withPop(() => render(c.getContext('2d'), 300, { clean: true, hi: true, pad: exportPad() })); return c.toDataURL(); });
  const a = await shot();
  await page.click('#t-ring');
  const b = await shot();
  assert.equal(a, b);
});

test('project data carries the backdrop mask and look', async () => {
  const page = await openApp(browser, { step: 'bg' });
  const r = await page.evaluate(() => { st.bgMode = 'blur'; const m = projectMeta({ type: 'image/png' }); return [m.settings.bgMode, !!m.bgMask.rle8, m.mask.rle8 !== m.bgMask.rle8]; });
  assert.equal(r[0], 'blur'); assert.ok(r[1]); assert.ok(r[2]);
});

test('five steps; tab bar fits and Backdrop sits between Pop-out and Ring', async () => {
  const page = await openApp(browser, { step: 'image' });
  const r = await page.evaluate(() => { const t = [...document.querySelectorAll('.tab')], box = document.querySelector('.tabs').getBoundingClientRect(); return { names: t.map(b => b.dataset.tab), fits: t.every(b => b.getBoundingClientRect().right <= box.right + 1) }; });
  assert.deepEqual(r.names, ['image', 'popout', 'bg', 'ring', 'export']); assert.ok(r.fits);
});
