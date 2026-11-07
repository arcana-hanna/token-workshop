import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

const ext = () => { const b = popBounds(), L = 1 / (1 - 2 * exportPad()); return { b, L, m: b ? Math.max(-b.x0, b.x1, -b.y0, b.y1) : 0 }; };

test('auto-fit: ring or pop-out touches the frame, never a gap, ring centred (incl. rotated/shifted)', async () => {
  const page = await openApp(browser, { step: 'image' });
  const out = await page.evaluate((src) => {
    const f = eval(src), res = [];
    for (const [ix, iy, rot, zoom] of [[0, 0, 0, 1], [.3, -.2, .6, 1], [-.5, .4, 2.2, 1.4], [0, 0, 0, .5], [.9, .9, .785, 1.1]]) {
      st.autoFit = true; st.ix = ix; st.iy = iy; st.rot = rot; st.zoom = zoom; st.fitDirty = true; const e = f(); res.push({ L: e.L, m: e.m, pad: exportPad() });
    }
    return res;
  }, `(${ext.toString()})`);
  for (const r of out) { const need = Math.max(1, r.m); assert.ok(Math.abs(r.L - need) < .01, JSON.stringify(r)); }
});

test('fit buttons: scale down and push bring the pop-out inside a ring-sized frame', async () => {
  const page = await openApp(browser, { step: 'image' });
  const r = await page.evaluate(() => {
    st.zoom = 1.6; st.ix = .4; st.iy = -.3; viewChanged();
    document.querySelector('#bFitScale').click();
    const o = overflow(st.pad);
    return { auto: st.autoFit, pad: st.pad, over: Math.max(o.l, o.r, o.t, o.b), zoom: st.zoom };
  });
  assert.equal(r.auto, false); assert.equal(r.pad, 0); assert.ok(r.over <= .003, JSON.stringify(r));
  const r2 = await page.evaluate(() => {
    st.ix += .3; document.querySelector('#bPushL').click(); const o = overflow(st.pad); return { right: o.r, ix: st.ix };
  });
  assert.ok(r2.right <= .003, JSON.stringify(r2));
});

test('image frame: drawn only when zoomed out, toggle in More menu, red when exceeded', async () => {
  const page = await openApp(browser, { step: 'popout' });
  const r = await page.evaluate(async () => {
    const edge = () => { const S = cv.width, x = cx.getImageData(0, 0, S, S).data, px = Math.round(st.vx * S), py = Math.round(S * .5), i = (py * S + px) * 4; return [x[i], x[i + 1], x[i + 2]]; };
    st.vz = .5; clampView(); st.showFrame = true; frame(); const on = edge();
    document.querySelector('#bMore').click(); const item = document.querySelector('#mFrame'); const label = item.textContent, was = item.getAttribute('aria-checked');
    item.click(); const off = st.showFrame; frame(); return { on, off, label, was };
  });
  assert.match(r.label, /image frame/i); assert.equal(r.was, 'true'); assert.equal(r.off, false);
});

test('ring edge: nothing stronger than a faint pixel past the outer radius for non-protruding rings', async () => {
  const page = await openApp(browser, { step: 'ring' });
  const bad = await page.evaluate(() => {
    const S = 128, R = S * .46, c = S / 2, out = [];
    for (const f of ['gear', 'scallop', 'facet', 'segments', 'thorns', 'ridge']) {
      st.formula = f; st.count = PAT[f].n; ringVer++;
      const L = ringLayer(S, R, c), d = L.getContext('2d').getImageData(0, 0, S, S).data; let n = 0;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { if (Math.hypot(x + .5 - c, y + .5 - c) > R + 1.05 && d[(y * S + x) * 4 + 3] > 0) n++; }
      out.push(f + ':' + n);
    }
    return out.filter(s => !s.endsWith(':0'));
  });
  assert.deepEqual(bad, []);
});
