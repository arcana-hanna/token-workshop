import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

const geo = async (page, k) => { const bx = await page.locator('#r_' + k).boundingBox(); return { y: bx.y + bx.height / 2, X: f => bx.x + 8 + (bx.width - 16) * f }; };

test('a held slider is never moved by recalculations; on release state equals the thumb', async () => {
  const page = await openApp(browser, { step: 'popout' });
  const { y, X } = await geo(page, 'autoSens');
  await page.mouse.move(X(.3), y); await page.mouse.down(); await page.mouse.move(X(.6), y, { steps: 5 });
  const held = await page.evaluate(() => +document.querySelector('#r_autoSens').value);
  await page.evaluate(() => { st.autoSens = 10; syncUI(); syncUI(); });          // what a recalculation does: refresh every control
  assert.equal(await page.evaluate(() => +document.querySelector('#r_autoSens').value), held);
  await page.mouse.up(); await page.waitForTimeout(800);
  const r = await page.evaluate(() => [+document.querySelector('#r_autoSens').value, st.autoSens]);
  assert.equal(r[0], held); assert.equal(r[1], held);
});

test('two quick grabs do not reset a slider to its default; double-clicking the name does', async () => {
  const page = await openApp(browser, { step: 'popout' });
  const { y, X } = await geo(page, 'autoSens');
  await page.mouse.move(X(.7), y); await page.mouse.down(); await page.mouse.up();   // click on the track: moves the thumb
  await page.mouse.down(); await page.mouse.up();                                   // immediately again at the same place
  await page.waitForTimeout(300);
  assert.notEqual(await page.evaluate(() => st.autoSens), 50);
  await page.dblclick('#p-popout label[for=r_autoSens]');
  assert.equal(await page.evaluate(() => st.autoSens), 50);
});
