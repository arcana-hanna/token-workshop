import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

/* white paper, a dark ring of hair with a thin paper gap (4 px) and a wide paper opening (24 px), plus a face with an eye white */
const SCENE = `(() => { const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d');
  x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, 400, 400); x.fillStyle = '#2a2230'; x.fillRect(60, 60, 280, 280);
  x.fillStyle = '#f2f2f2'; x.fillRect(100, 100, 4, 80); x.fillRect(200, 220, 24, 24);
  x.fillStyle = '#c08060'; x.fillRect(240, 100, 60, 60); x.fillStyle = '#ffffff'; x.fillRect(260, 120, 16, 16);
  loadCanvas(c, 't'); st.mask = new Uint8Array(400 * 400); for (let y = 60; y < 340; y++) for (let k = 60; k < 340; k++) st.mask[y * 400 + k] = 255; maskChanged(); })()`;

test('Close small gaps removes thin background pockets and keeps wide ones and eye whites', async () => {
  const page = await openApp(browser);
  await page.evaluate(SCENE);
  const r = await page.evaluate(() => { const at = (x, y) => st.mask[y * 400 + x]; const before = [at(102, 140), at(212, 232), at(268, 128), at(80, 80)];
    st.gap = 8; edgeLive({ gap: true }); const after = [at(102, 140), at(212, 232), at(268, 128), at(80, 80)];
    st.gap = 0; edgeLive({ gap: true }); const back = [at(102, 140)]; return { before, after, back }; });
  assert.deepEqual(r.before, [255, 255, 255, 255]);
  assert.equal(r.after[0], 0, 'thin gap closed');
  assert.equal(r.after[1], 255, 'wide opening is left for the brush');
  assert.equal(r.after[2], 255, 'eye white stays (wider than the slider)');
  assert.equal(r.after[3], 255, 'subject stays');
  assert.equal(r.back[0], 255, 'back to 0 restores');
});

test('Feather fades only the outer hard edge and the Mask view shows it', async () => {
  const page = await openApp(browser);
  await page.evaluate(SCENE);
  const r = await page.evaluate(() => { st.feather = 6; st.softDirty = true; refreshSoft();
    const a = x => st.softCv.getContext('2d').getImageData(x, 200, 1, 1).data[3]; return { edge: a(61), mid: a(63), inner: a(200), out: a(30) }; });
  assert.ok(r.edge < 180, 'edge pixel faded ' + r.edge);
  assert.ok(r.mid > r.edge && r.mid < 255, 'gradient inward ' + r.mid);
  assert.equal(r.inner, 255); assert.equal(r.out, 0);
});

test('Feather keeps thin parts solid inside; Nudge edge moves 1 px per press; history is read-only text in the file', async () => {
  const page = await openApp(browser);
  await page.evaluate(SCENE);
  const r = await page.evaluate(() => { const w = st.sw, m = new Uint8Array(st.mask.length);
    for (let y = 100; y < 160; y++) for (let x = 40; x < 48; x++) m[y * w + x] = 255;   /* a thin strip, 8 px wide */
    st.mask = m; maskChanged(); st.feather = 6; st.softDirty = true; refreshSoft();
    const a = x => st.softCv.getContext('2d').getImageData(x, 130, 1, 1).data[3]; return { edge: a(40), core: a(43), core2: a(44) }; });
  assert.ok(r.edge < 200 && r.edge > 40, 'outer pixel fades ' + r.edge);
  assert.ok(r.core >= 250 && r.core2 >= 250, 'centre stays solid ' + r.core + ',' + r.core2);
  await page.evaluate(SCENE);
  const n1 = await page.evaluate(() => { const c = st.selCount; $('#nudgeN').value = 1; $('#nudgeN').dispatchEvent(new Event('input')); $('#bNudgeIn').click(); return { c, d: st.selCount }; });
  assert.ok(n1.d < n1.c);
  const n3 = await page.evaluate(() => { const b = st.selCount; $('#nudgeN').value = 3; $('#nudgeN').dispatchEvent(new Event('input')); $('#bNudgeIn').click(); return { b, d: st.selCount, nudge: st.nudge }; });
  assert.equal(n3.nudge, 3); assert.ok(n3.d < n3.b - (n1.c - n1.d) * 2);
  const meta = await page.evaluate(() => projectMeta({ type: 'image/png', crop: { x: 0, y: 0, w: st.sw, h: st.sh } }));
  assert.ok(Array.isArray(meta.history) && meta.history.some(x => /Shrank the edge by 3 px/.test(x)), JSON.stringify(meta.history));
  assert.ok(JSON.stringify(meta.history).length < 3000);
});
