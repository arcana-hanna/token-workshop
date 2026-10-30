import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp, settle } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('autosave: a session comes back after reload with the same mask and settings', async () => {
  const page = await openApp(browser);
  await page.waitForFunction(() => autoReady);
  const before = await page.evaluate(async () => {
    setPattern('gear', true); st.width = .12; st.exportSize = 1024; $('#fname').value = 'my-hero';
    st.mask = new Uint8Array(st.mask.length); maskChanged(); commit(); syncUI();
    await autosaveNow();
    return { f: st.formula, w: st.width, sel: st.selCount };
  });
  await page.reload();
  await page.waitForFunction(() => typeof autoReady !== 'undefined' && autoReady);
  await settle(page);
  const after = await page.evaluate(() => ({ f: st.formula, w: st.width, sel: st.selCount, name: $('#fname').value, size: st.exportSize }));
  assert.equal(after.f, 'gear'); assert.equal(after.w, before.w); assert.equal(after.sel, before.sel);
  assert.equal(after.name, 'my-hero'); assert.equal(after.size, 1024);
  assert.deepEqual(page.errors, []);
});

test('autosave: a corrupt saved session is ignored and the app still boots', async () => {
  const page = await openApp(browser);
  await page.waitForFunction(() => autoReady);
  await page.evaluate(() => idbDo('readwrite', s => s.put({ meta: { app: 'x' }, img: new Uint8Array(4) }, AUTO_KEY)));
  await page.reload();
  await page.waitForFunction(() => typeof autoReady !== 'undefined' && autoReady);
  assert.ok(await page.evaluate(() => st.selCount > 1000));
  assert.deepEqual(page.errors, []);
});
