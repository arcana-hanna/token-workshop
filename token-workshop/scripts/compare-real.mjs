/* Auto vs the manual wand+shrink workflow on a real picture: node scripts/compare-real.mjs <image> */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { launch, openApp, root } from '../tests/helpers.mjs';
import { BASELINE_SRC } from '../tests/scene.mjs';
import { join } from 'node:path';
const img = process.argv[2]; const b = await launch(); const p = await openApp(b, { width: 1280, height: 900 });
const url = 'data:image/jpeg;base64,' + readFileSync(img).toString('base64');
await p.evaluate(async u => { const im = new Image(); await new Promise(r => { im.onload = r; im.src = u; }); const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; cv.getContext('2d').drawImage(im, 0, 0); loadCanvas(cv, 'real'); st.popOn = true; runAuto();
  await new Promise(r => setTimeout(r, 300)); await new Promise(r => { const iv = setInterval(() => { if (!document.querySelector('#busy.on')) { clearInterval(iv); r(); } }, 50); }); await new Promise(r => setTimeout(r, 300)); }, url);
const snap = async (tag) => p.evaluate(tag2 => { refreshSoft(); refreshPop(); const W = st.sw, H = st.sh, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#1b1c20'; x.fillRect(0, 0, W, H); x.drawImage(st.popCv, 0, 0); return [c.toDataURL('image/png'), W, H]; }, tag);
const a = await snap('auto');
await p.evaluate(BASELINE_SRC + '(14)'); const w = await snap('wand');
const out = join(root, 'screenshots'); mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'real-auto.png'), Buffer.from(a[0].split(',')[1], 'base64')); writeFileSync(join(out, 'real-wand.png'), Buffer.from(w[0].split(',')[1], 'base64'));
console.log(a[1], a[2]); await b.close();
