/* Runs Auto on synthetic ground-truth scenes and prints how close the result is. npm run quality */
import { writeFileSync, mkdirSync } from 'node:fs';
import { launch, openApp, root } from '../tests/helpers.mjs';
import { SCENE_SRC, MEASURE_SRC, BASELINE_SRC } from '../tests/scene.mjs';
import { join } from 'node:path';

const out = join(root, 'screenshots'); mkdirSync(out, { recursive: true });
const b = await launch();
const cases = [['paper', {}], ['paper-jpeg', { jpeg: .88 }], ['grey-flat', { bg: '#c9c9cf', flat: true }]];
for (const [name, opts] of cases) {
  const p = await openApp(b, { width: 1280, height: 900 });
  await p.evaluate(SCENE_SRC + '(' + JSON.stringify({ seed: 7, ...opts }) + ')');
  const bgs = JSON.stringify(['#1b1c20', '#c9ad7b', '#ffffff']);
  const t0 = Date.now(); const m = await p.evaluate(MEASURE_SRC + '(' + JSON.stringify(['#1b1c20', '#c9ad7b', '#ffffff']) + ')');
  const sum = r => name + ' ' + JSON.stringify({ iou: r.iou, fp: r.falsePos, cov: r.coverage, dark: r.comps['#1b1c20'].mean, gold: r.comps['#c9ad7b'].mean, white: r.comps['#ffffff'].mean, bad40: r.comps['#1b1c20'].bad40 }, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v);
  console.log('AUTO    ', sum(m));
  console.log(name, JSON.stringify(m, (k, v) => typeof v === 'number' ? +v.toFixed(4) : v));
  const png = await p.evaluate(() => { const { fg, W, H } = window.__scene, c = document.createElement('canvas'); c.width = W * 2; c.height = H; const x = c.getContext('2d');
    for (let k = 0; k < 2; k++) { x.save(); x.translate(k * W, 0); x.fillStyle = '#1b1c20'; x.fillRect(0, 0, W, H); x.drawImage(k ? st.popCv : fg, 0, 0); x.restore(); } return c.toDataURL(); });
  writeFileSync(join(out, 'quality-' + name + '.png'), Buffer.from(png.split(',')[1], 'base64'));
  const detail = await p.evaluate(() => { const { fg } = window.__scene, regions = [[300, 350, 200, 60, 4], [20, 150, 330, 330, 1.6], [520, 600, 260, 130, 2.4]];
    const rows = regions.map(([x, y, w, h, k]) => { const c = document.createElement('canvas'); c.width = w * k * 3 + 20; c.height = h * k; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      for (let j = 0; j < 3; j++) { g.save(); g.translate(j * (w * k + 10), 0); g.fillStyle = '#1b1c20'; g.fillRect(0, 0, w * k, h * k); if (j < 2) g.drawImage(j ? st.popCv : fg, x, y, w, h, 0, 0, w * k, h * k); else { g.drawImage(fg, x, y, w, h, 0, 0, w * k, h * k); g.globalCompositeOperation = 'difference'; g.drawImage(st.popCv, x, y, w, h, 0, 0, w * k, h * k); } g.restore(); } return c; });
    const H = rows.reduce((a, c) => a + c.height + 10, 0), W = Math.max(...rows.map(c => c.width)), o = document.createElement('canvas'); o.width = W; o.height = H; const g = o.getContext('2d'); let yy = 0; for (const c of rows) { g.drawImage(c, 0, yy); yy += c.height + 10; } return o.toDataURL(); });
  writeFileSync(join(out, 'quality-' + name + '-detail.png'), Buffer.from(detail.split(',')[1], 'base64'));
  if (process.env.BASE !== '0') { for (const tol of [8, 14, 20, 28]) { await p.evaluate(BASELINE_SRC + '(' + tol + ')'); const r = await p.evaluate(MEASURE_SRC + '(' + bgs + ')'); console.log('WAND tol' + tol, sum(r).slice(name.length)); } }
  await p.context().close();
}
await b.close();
