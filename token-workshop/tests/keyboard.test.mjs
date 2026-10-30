import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, settle } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('toolbar is one tab stop and arrow keys move between buttons', async () => {
  const page = await openApp(browser);
  const stops = await page.evaluate(() => [...document.querySelectorAll('.tools .tbtn')].filter(b => b.tabIndex === 0).length);
  assert.equal(stops, 1);
  await page.focus('.tools [data-tool=select]');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.tool), 'brush');
  await page.keyboard.press('Home');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.tool), 'move');
  assert.equal(await page.evaluate(() => document.activeElement.tabIndex), 0);
});

test('keyboard cursor: wand and brush work without a pointer', async () => {
  const page = await openApp(browser);
  await page.evaluate(() => { st.mask = new Uint8Array(st.mask.length); maskChanged(); commit(); setTool('select'); cv.focus(); });
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  assert.ok(await page.evaluate(() => st.selCount > 100), 'wand selected something');
  await page.evaluate(() => { st.mask = new Uint8Array(st.mask.length); maskChanged(); commit(); setTool('brush'); cv.focus(); });
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  assert.ok(await page.evaluate(() => st.selCount > 10), 'brush painted');
  await page.keyboard.press('Shift+Enter');
  assert.deepEqual(page.errors, []);
});


test('Move tool still moves the picture with the arrow keys', async () => {
  const page = await openApp(browser);
  await page.evaluate(() => { setTool('move'); cv.focus(); });
  const x0 = await page.evaluate(() => st.ix);
  await page.keyboard.press('ArrowRight');
  assert.ok(await page.evaluate((x) => st.ix > x, x0));
});
