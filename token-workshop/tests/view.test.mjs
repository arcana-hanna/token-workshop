import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, settle, canvasStats } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('preview background is display-only and persists', async () => {
  const page = await openApp(browser);
  await page.evaluate(() => { document.querySelector('#bMore').click(); document.querySelector('#moreMenu [data-bg=map]').click(); });
  assert.equal(await page.evaluate(() => document.querySelector('#board').dataset.bg), 'map');
  assert.equal(await page.evaluate(() => document.querySelector('#moreMenu [data-bg=map]').getAttribute('aria-checked')), 'true');
  await page.reload();
  await page.waitForFunction(() => typeof st !== 'undefined' && st.src);
  assert.equal(await page.evaluate(() => document.querySelector('#board').dataset.bg), 'map');
  assert.deepEqual(page.errors, []);
});

test('isolate shows only the pop-out; export is unaffected', async () => {
  const page = await openApp(browser);
  await settle(page);
  const [full] = await canvasStats(page);
  await page.keyboard.press('i');
  await settle(page, 100);
  const [iso] = await canvasStats(page);
  assert.ok(iso > 0 && iso < full, `isolate draws less (${iso} < ${full})`);
  const same = await page.evaluate(() => {
    const a = document.createElement('canvas'); a.width = a.height = 200;
    const was = st.iso; st.iso = false; render(a.getContext('2d'), 200, { clean: true });
    const d1 = a.getContext('2d').getImageData(0, 0, 200, 200).data.join();
    st.iso = true; a.getContext('2d').clearRect(0, 0, 200, 200); render(a.getContext('2d'), 200, { clean: true });
    const d2 = a.getContext('2d').getImageData(0, 0, 200, 200).data.join(); st.iso = was;
    return d1 === d2;
  });
  assert.ok(same, 'clean export render ignores isolate');
  await page.keyboard.press('i');
  assert.equal(await page.evaluate(() => st.iso), false);
});

test('pop-out turns see-through in Move only', async () => {
  const page = await openApp(browser);
  await settle(page);
  const sel = await page.evaluate(() => { setTool('select'); draw(); return 1; });
  const a = await canvasStats(page);
  await page.evaluate(() => { setTool('move'); draw(); });
  await settle(page, 100);
  const b = await canvasStats(page);
  assert.notDeepEqual(a, b);
  assert.deepEqual(page.errors, []);
});
