import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { launch, openApp, settle } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

async function download(page, file) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bDownload')]);
  const path = join(mkdtempSync(join(tmpdir(), 'tw-')), file); await dl.saveAs(path); return { path, name: dl.suggestedFilename() };
}
const alphaCount = (page, layer) => page.evaluate((layer) => {
  const c = document.createElement('canvas'); c.width = c.height = 200; render(c.getContext('2d'), 200, { clean: true, hi: true, pad: exportPad(), layer });
  const d = c.getContext('2d').getImageData(0, 0, 200, 200).data; let n = 0, centre = d[(100 * 200 + 100) * 4 + 3]; for (let i = 3; i < d.length; i += 4) if (d[i] > 128) n++; return { n, centre };
}, layer);

test('layers: ring is transparent in the middle, pop-out is smaller than the token, art has no ring', async () => {
  const page = await openApp(browser);
  await settle(page);
  const all = await alphaCount(page, undefined), ring = await alphaCount(page, 'ring'), pop = await alphaCount(page, 'pop'), art = await alphaCount(page, 'art');
  assert.ok(ring.n > 500 && ring.n < all.n, 'ring only: ' + JSON.stringify({ ring, all }));
  assert.ok(ring.centre === 0, 'ring is hollow');
  assert.ok(pop.n > 200 && pop.n < all.n, 'pop only');
  assert.ok(art.n > 500 && art.centre > 200, 'art fills the middle');
  assert.deepEqual(page.errors, []);
});

test('All layers downloads a valid zip with four transparent images', async () => {
  const page = await openApp(browser);
  await page.click('#t-export'); await page.click('#whatSeg [data-v=layers]');
  await page.fill('#fname', 'hero');
  const { path, name } = await download(page, 'x.zip');
  assert.equal(name, 'hero-layers.zip');
  const listing = execFileSync('python3', ['-I', '-c', 'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print("\\n".join(sorted(z.namelist())))', path]).toString().trim().split('\n');
  assert.deepEqual(listing, ['hero-picture.png', 'hero-popout.png', 'hero-ring.png', 'hero-token.png']);
});

test('WebP export keeps the editable project and imports again', async () => {
  const page = await openApp(browser);
  await page.evaluate(() => { applyLook(LOOKS.find((l) => l.name === 'Royal Braid')); });
  await page.click('#t-export'); await page.click('#fmtSeg [data-v=webp]');
  const { path, name } = await download(page, 'token.webp');
  assert.equal(name, 'token.webp');
  const bytes = readFileSync(path);
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF'); assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
  assert.equal(bytes.readUInt32LE(4), bytes.length - 8, 'RIFF size is consistent');
  const sel = await page.evaluate(() => st.selCount);
  await page.evaluate(() => applyLook(LOOKS[0]));
  await page.setInputFiles('#file', path);
  await page.waitForFunction(() => document.querySelector('#importDlg').open);
  await page.click('#impProject');
  await page.waitForFunction(() => st.formula === 'braid');
  assert.equal(await page.evaluate(() => st.selCount), sel);
  assert.deepEqual(page.errors, []);
});

test('ring-only export is a PNG without project data', async () => {
  const page = await openApp(browser);
  await page.click('#t-export'); await page.click('#whatSeg [data-v=ring]');
  const { path, name } = await download(page, 'r.png');
  assert.equal(name, 'token-ring.png');
  assert.ok(!readFileSync(path).includes('tkWs'));
});

test('a damaged WebP project chunk is rejected without breaking the app', async () => {
  const page = await openApp(browser);
  const ok = await page.evaluate(() => {
    const riff = (chunk) => { const b = new Uint8Array(12 + chunk.length); b.set([82, 73, 70, 70], 0); new DataView(b.buffer).setUint32(4, b.length - 8, true); b.set([87, 69, 66, 80], 8); b.set(chunk, 12); return b; };
    const bad = new Uint8Array(8 + 6); bad.set([84, 75, 87, 83], 0); new DataView(bad.buffer).setUint32(4, 6, true);
    const huge = new Uint8Array(8 + 8); huge.set([84, 75, 87, 83], 0); new DataView(huge.buffer).setUint32(4, 0x7fffffff, true);
    return [readWebpProject(riff(bad)), readWebpProject(riff(huge)), readWebpProject(new Uint8Array(30))].every((v) => v === null);
  });
  assert.ok(ok);
});
