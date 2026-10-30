/* Auto on real pictures, shown next to the original on a chosen backdrop: node scripts/auto-real.mjs <bg> <img>... */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { launch, openApp, root } from '../tests/helpers.mjs';
import { join, basename } from 'node:path';
const [bg, ...imgs] = process.argv.slice(2); const b = await launch(); const out = join(root, 'screenshots'); mkdirSync(out, { recursive: true });
for (const img of imgs) {
  const p = await openApp(b, { width: 1280, height: 900 });
  const mime = img.endsWith('.png') ? 'png' : 'jpeg', url = 'data:image/' + mime + ';base64,' + readFileSync(img).toString('base64');
  const r = await p.evaluate(async ([u, bgc, noUni, sens, shr]) => { const im = new Image(); await new Promise(r => { im.onload = r; im.src = u; });
    const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; cv.getContext('2d').drawImage(im, 0, 0); loadCanvas(cv, 'real'); st.autoSens = sens; st.autoShrink = shr; st.popOn = true; if (noUni) { st.mask = autoSubject(); maskChanged(); fixEdges(true); } else runAuto();
    await new Promise(r => setTimeout(r, 300)); await new Promise(r => { const iv = setInterval(() => { if (!document.querySelector('#busy.on')) { clearInterval(iv); r(); } }, 50); }); await new Promise(r => setTimeout(r, 300));
    refreshSoft(); refreshPop(); const W = st.sw, H = st.sh, c = document.createElement('canvas'); c.width = W * 2; c.height = H; const x = c.getContext('2d');
    x.drawImage(st.src, 0, 0); x.fillStyle = bgc; x.fillRect(W, 0, W, H); x.drawImage(st.popCv, W, 0);
    const mc = document.createElement('canvas'); mc.width = W; mc.height = H; const mx = mc.getContext('2d'), id = mx.createImageData(W, H); for (let i = 0; i < W * H; i++) { id.data[i*4] = id.data[i*4+1] = id.data[i*4+2] = st.mask[i]; id.data[i*4+3] = 255; } mx.putImageData(id, 0, 0);
    return { mask: mc.toDataURL(), png: c.toDataURL(), sel: st.selCount, n: W * H, bgc: st.bgC, partial: st.partial }; }, [url, bg, !!process.env.NOUNI, +(process.env.SENS || 50), +(process.env.SHRINK || 0)]);
  writeFileSync(join(out, 'auto' + (process.env.SENS || '') + '-' + basename(img).replace(/\..*/, '') + '.png'), Buffer.from(r.png.split(',')[1], 'base64'));
  writeFileSync(join(out, 'mask-' + basename(img).replace(/\..*/, '') + '.png'), Buffer.from(r.mask.split(',')[1], 'base64'));
  console.log(basename(img), 'selected', (r.sel / r.n * 100).toFixed(1) + '%', 'partial', r.partial); await p.context().close();
}
await b.close();
