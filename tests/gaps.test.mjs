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
    const a = x => st.softCv.getContext('2d').getImageData(x, 200, 1, 1).data[3]; return { edge: a(61), mid: a(66), inner: a(200), out: a(30) }; });
  assert.ok(r.edge < 180, 'edge pixel faded ' + r.edge);
  assert.ok(r.mid > r.edge && r.mid < 255, 'gradient inward ' + r.mid);
  assert.equal(r.inner, 255); assert.equal(r.out, 0);
});
