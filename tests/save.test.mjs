import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

/* a wide picture with detail everywhere, so any shift or crop mistake shows in the re-rendered token */
const SCENE = `(() => { const W = 1600, H = 1000, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2f6f78'); g.addColorStop(1, '#b8873a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { x.fillStyle = 'hsl(' + (i * 47 % 360) + ',60%,' + (30 + i % 40) + '%)'; x.beginPath(); x.arc((i * 263) % W, (i * 157) % H, 20 + (i * 13) % 70, 0, 7); x.fill(); }
  let z = 5; const r = () => (z = (z * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 6000; i++) { x.fillStyle = 'rgb(' + (r() * 255 | 0) + ',' + (r() * 255 | 0) + ',' + (r() * 255 | 0) + ')'; x.fillRect(r() * W, r() * H, 6 + r() * 14, 6 + r() * 14); }
  x.fillStyle = '#222'; x.font = 'bold 160px sans-serif'; x.fillText('TOKEN', 520, 560); return c; })()`;

async function roundTrip(page, setup) {
  return page.evaluate(async ([src, setupSrc]) => {
    loadCanvas(eval(src), 'scene'); const whole = (await new Promise((res) => st.full.toBlob(res, 'image/webp', .92))).size; st.sgPending = false; setTab('popout'); eval(setupSrc);
    st.mask = new Uint8Array(st.mask.length); for (let y = 300; y < 560; y++) for (let x = 650; x < 1000; x++) st.mask[y * st.sw + x] = 255; maskChanged(); st.fitDirty = true; st.snapPad = true; st.padCur = exportPad(); commit();
    const px = (S) => { const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d', { willReadFrequently: true }); render(x, S, { clean: true, hi: true, pad: exportPad() }); return x.getImageData(0, 0, S, S).data; };
    const A = px(256), r = await renderImage(undefined, 'webp', true), bytes = new Uint8Array(await r.blob.arrayBuffer());
    const pr = readWebpProject(bytes), crop = pr.meta.img.crop;
    await restoreProject(pr); st.fitDirty = true; st.padCur = exportPad(); st.snapPad = true;
    const B = px(256); let d = 0, mx = 0, n = 0; for (let i = 0; i < A.length; i += 4) { for (let c = 0; c < 3; c++) { const e = Math.abs(A[i + c] - B[i + c]); d += e; if (e > mx) mx = e; n++; } }
    return { whole, type: pr.meta.img.type, crop, embedBytes: pr.img.length, total: bytes.length, mean: d / n, max: mx, sw: st.sw, sh: st.sh, sel: st.selCount, ext: r.ext };
  }, [SCENE, setup]);
}

test('editable save keeps only the visible part (+10%) as WebP, and reopens to the same token', async () => {
  const page = await openApp(browser);
  const r = await roundTrip(page, 'st.zoom=3.2;st.ix=.15;st.iy=-.1;viewChanged();');
  assert.equal(r.type, 'image/webp'); assert.equal(r.ext, 'webp');
  assert.ok(r.crop.w < 1600 * .5 && r.crop.h < 1000 * .8, JSON.stringify(r.crop));
  assert.equal(r.sw, r.crop.w); assert.equal(r.sh, r.crop.h);
  assert.ok(r.mean < 3, 'mean difference ' + r.mean.toFixed(2) + ' max ' + r.max);
  assert.ok(r.sel > 0);
});

test('rotated and flipped pictures reopen in the same place', async () => {
  const page = await openApp(browser);
  const r = await roundTrip(page, 'st.zoom=2.4;st.ix=-.2;st.iy=.25;st.rot=.45;st.flip=-1;viewChanged();');
  assert.ok(r.mean < 3, 'mean difference ' + r.mean.toFixed(2) + ' max ' + r.max);
});

test('WebP is the default format; the saved file is far smaller than embedding the whole picture', async () => {
  const page = await openApp(browser);
  assert.equal(await page.evaluate(() => st.exportFmt), 'webp');
  const r = await roundTrip(page, 'st.zoom=3.2;viewChanged();');
  assert.ok(r.embedBytes < r.whole * .5, r.embedBytes + ' vs whole ' + r.whole);
});
