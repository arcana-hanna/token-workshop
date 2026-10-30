import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('Auto drops isolated paper stains but keeps the subject', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d');
    x.fillStyle = '#efe3b4'; x.fillRect(0, 0, 400, 400); x.fillStyle = '#e6d28c'; x.beginPath(); x.ellipse(60, 70, 22, 14, .4, 0, 7); x.fill();
    x.fillStyle = '#2a2a24'; x.beginPath(); x.ellipse(220, 230, 110, 130, 0, 0, 7); x.fill();
    loadCanvas(c, 't'); const u = autoUniform(); return u ? { stain: u.mask[70 * 400 + 60], body: u.mask[230 * 400 + 220], out: u.mask[390 * 400 + 390] } : null; });
  assert.ok(r, 'plain background accepted');
  assert.equal(r.stain, 0, 'stain removed'); assert.equal(r.body, 255); assert.equal(r.out, 0);
});

test('Auto on a dark backdrop keeps subject parts that are as dark as the backdrop', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d');
    x.fillStyle = '#1e1812'; x.fillRect(0, 0, 400, 400); for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(' + (30 + i % 14) + ',' + (22 + i % 9) + ',16,.6)'; x.fillRect((i * 37) % 400, (i * 91) % 400, 12, 5); }
    x.fillStyle = '#d9b08c'; x.beginPath(); x.ellipse(200, 200, 110, 140, 0, 0, 7); x.fill();
    x.fillStyle = '#211710'; x.beginPath(); x.ellipse(150, 230, 40, 70, 0, 0, 7); x.fill();      /* shadow, the same colour as the backdrop */
    loadCanvas(c, 't'); const u = autoUniform(); return u ? { shadow: u.mask[230 * 400 + 150], face: u.mask[150 * 400 + 220], out: u.mask[20 * 400 + 20] } : null; });
  assert.ok(r, 'backdrop accepted');
  assert.equal(r.shadow, 255, 'shadow is part of the head'); assert.equal(r.face, 255); assert.equal(r.out, 0);
});

test('Auto sensitivity and Shrink/grow sliders re-run Auto with the new values', async () => {
  const page = await openApp(browser);
  const r = await page.evaluate(async () => { const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d');
    x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, 400, 400); x.fillStyle = '#2a2a2a'; x.beginPath(); x.arc(200, 200, 100, 0, 7); x.fill();
    x.fillStyle = '#c8c8c8'; x.beginPath(); x.arc(330, 80, 30, 0, 7); x.fill();                           /* a faint patch: only the sensitive setting keeps it */
    loadCanvas(c, 't'); const n = () => { let k = 0; for (const v of st.mask) k += v >= 128 ? 1 : 0; return k; };
    st.autoSens = 50; autoLive(); const base = n(); st.autoSens = 15; autoLive(); const low = n(); st.autoSens = 90; autoLive(); const high = n();
    st.autoSens = 50; st.autoShrink = 6; autoLive(); const shrunk = n(); st.autoShrink = -6; autoLive(); const grown = n(); return { base, low, high, shrunk, grown }; });
  assert.ok(r.high >= r.base && r.base >= r.low, JSON.stringify(r));
  assert.ok(r.high > r.low, 'sensitivity changes the result ' + JSON.stringify(r));
  assert.ok(r.shrunk < r.base * .95 && r.grown > r.base * 1.05, 'shrink and grow ' + JSON.stringify(r));
});
