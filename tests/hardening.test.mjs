import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('settings from a file are validated and clamped', async () => {
  const page = await openApp(browser);
  const out = await page.evaluate(() => sanitizeSettings({
    formula: '__proto__', color: 'red', accent: '#ABCDEF', zoom: 1e99, count: 'x', flip: 5, rot: NaN, tex: 'marble', seed: 1.5, colorKey: 'x'.repeat(500),
    constructor: 1, __proto__: { polluted: true }, popOn: 'yes', feather: -5, eAmt: 999,
  }));
  assert.deepEqual(Object.keys(out).sort(), ['accent', 'colorKey', 'eAmt', 'feather', 'tex', 'zoom'].sort());
  assert.equal(out.accent, '#abcdef');
  assert.equal(out.zoom, 8);
  assert.equal(out.tex, 'stone', 'old marble textures map to stone');
  assert.equal(out.feather, 0);
  assert.equal(out.eAmt, 24);
  assert.equal(out.colorKey.length, 40);
  assert.equal(await page.evaluate(() => ({}).polluted), undefined);
});

test('project data with a wrong CRC, absurd sizes or bad JSON is rejected', async () => {
  const page = await openApp(browser);
  const res = await page.evaluate(async () => {
    const png = new Uint8Array(await (await new Promise((r) => cv.toBlob(r, 'image/png'))).arrayBuffer());
    const img = (await embedImage()).bytes;
    const good = (m) => injectChunk(png, buildChunk({ app: 'token-workshop', img: { type: 'image/png' }, settings: {}, mask: { w: 4, h: 4, rle: 'AA==' }, ...m }, img));
    const bad = good({}); bad[bad.length - 12 - 5] ^= 0xff;          // corrupt the chunk CRC
    const rawJson = (txt) => { const j = new TextEncoder().encode(txt), d = new Uint8Array(4 + j.length); new DataView(d.buffer).setUint32(0, j.length); d.set(j, 4);
      const o = new Uint8Array(12 + d.length), dv = new DataView(o.buffer); dv.setUint32(0, d.length); o.set([0x74, 0x6b, 0x57, 0x73], 4); o.set(d, 8); dv.setUint32(8 + d.length, crc32(o.subarray(4, 8 + d.length))); return injectChunk(png, o); };
    return {
      ok: !!readProject(good({})),
      crc: readProject(bad),
      huge: readProject(good({ mask: { w: 1e6, h: 1e6, rle: 'AA==' } })),
      neg: readProject(good({ mask: { w: -1, h: 4, rle: 'AA==' } })),
      type: readProject(good({ img: { type: 'text/html' } })),
      json: readProject(rawJson('{not json')),
      app: readProject(good({ app: 'other' })),
      truncated: readProject(good({}).subarray(0, 200)),
    };
  });
  assert.equal(res.ok, true);
  for (const k of ['crc', 'huge', 'neg', 'type', 'json', 'app', 'truncated']) assert.equal(res[k], null, k + ' must be rejected');
});

test('a hostile run-length mask cannot hang or overflow the decoder', async () => {
  const page = await openApp(browser);
  const ms = await page.evaluate(() => {
    const t = performance.now();
    const m = rleDec(new Uint8Array(1000).fill(0xff), 1000 * 1000);
    return [performance.now() - t, m.length];
  });
  assert.ok(ms[0] < 500);
  assert.equal(ms[1], 1e6);
});

test('opening a non-image or an oversized picture shows a message instead of breaking', async () => {
  const page = await openApp(browser);
  await page.evaluate(() => openFile(new File(['hello'], 'notes.txt', { type: 'text/plain' })));
  assert.match(await page.locator('#toast').textContent(), /not an image/i);
  assert.deepEqual(page.errors, []);
});
