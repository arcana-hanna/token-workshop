/* Replaces the backdrop on synthetic scenes with known truth and measures how clean the hair edges are.
   Pop-out = the upper half of the subject; the lower half is the main picture where the backdrop layer works.  npm run backdrop */
import { launch, openApp } from '../tests/helpers.mjs';
import { SCENE_SRC } from '../tests/scene.mjs';
const b = await launch();
const cases = [['paper', {}], ['paper-jpeg', { jpeg: .88 }], ['grey-flat', { bg: '#c9c9cf', flat: true }], ['white-flat', { bg: '#ffffff', flat: true }]];
const colours = ['#1b2a5c', '#c9ad7b'];
const SRC = `((col) => {
  const { fg, W, H } = window.__scene, N = W * H, fd = fg.getContext('2d').getImageData(0, 0, W, H).data;
  const subj = (window.__subj = window.__subj || st.mask.slice());                       /* what Auto found */
  const pop = subj.slice(); for (let i = 0; i < N; i++) if (((i / W) | 0) < 400) { /* upper half stays pop-out */ } else pop[i] = 0;
  st.bgM = invMask(subj); st.mask = pop; st.act = 'pop'; maskChanged(); st.bgV++; st.popV++;
  st.bgMode = 'colour'; st.bgCol = col; st.bgEdge = 0;
  const art = artSrc(false).getContext('2d').getImageData(0, 0, W, H).data, A = bgAlpha(), base = picSrc(false).getContext('2d').getImageData(0, 0, W, H).data;
  const C = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
  const stats = k => ({ n: 0, e: 0, bad: 0 }), S = { soft: stats(), bg: stats(), all: stats() }, T = { soft: stats(), bg: stats(), all: stats() };
  const cvs = document.createElement('canvas'); cvs.width = W; cvs.height = H; const cx = cvs.getContext('2d'); cx.fillStyle = col; cx.fillRect(0, 0, W, H); cx.drawImage(fg, 0, 0);
  const truth = cx.getImageData(0, 0, W, H).data;
  for (let y = 400; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, ta = fd[i * 4 + 3] / 255; if (pop[i]) continue;
    const a = A[i], nv = [0, 1, 2].map(c => base[i * 4 + c] * (1 - a) + C[c] * a);
    const eo = Math.max(...[0, 1, 2].map(c => Math.abs(art[i * 4 + c] - truth[i * 4 + c]))), en = Math.max(...[0, 1, 2].map(c => Math.abs(nv[c] - truth[i * 4 + c])));
    for (const [key, ok] of [['soft', ta > .02 && ta < .98], ['bg', ta <= .02], ['all', true]]) if (ok) { S[key].n++; S[key].e += eo; if (eo > 40) S[key].bad++; T[key].n++; T[key].e += en; if (en > 40) T[key].bad++; } }
  /* oracle: the same formulas, but with the TRUE coverage instead of Auto's - shows what the compositing itself can do */
  const O = { soft: { n: 0, e: 0, bad: 0 } }; const Bc = [0, 1, 2].map(c => { const v = []; for (let i = 0; i < N; i += 37) if (fd[i * 4 + 3] === 0) v.push(base[i * 4 + c]); v.sort((p, q) => p - q); return v[v.length >> 1]; });
  for (let y = 400; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, ta = fd[i * 4 + 3] / 255; if (pop[i] || !(ta > .02 && ta < .98)) continue; const a = 1 - ta, k = a <= .8 ? 0 : (a - .8) / .2, k2 = k * k * (3 - 2 * k);
    const e = Math.max(...[0, 1, 2].map(c => { const t1 = base[i * 4 + c] + a * (C[c] - Bc[c]), r = t1 + (C[c] - t1) * k2; return Math.abs(r - truth[i * 4 + c]); })); O.soft.n++; O.soft.e += e; if (e > 40) O.soft.bad++; }
  /* blend between the naive mix (w=0) and the unmixed result (w=1), with Auto's coverage */
  const W3 = {}; for (const w of [0, .25, .5, .75, 1]) { let n = 0, e = 0, bad = 0;
    for (let y = 400; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, ta = fd[i * 4 + 3] / 255; if (pop[i] || !(ta > .02 && ta < .98)) continue; const a = A[i], k = a <= .8 ? 0 : (a - .8) / .2, k2 = k * k * (3 - 2 * k);
      const m = Math.max(...[0, 1, 2].map(c => { const nv = base[i * 4 + c] * (1 - a) + C[c] * a, t1 = base[i * 4 + c] + a * (C[c] - Bc[c]), un = t1 + (C[c] - t1) * k2, r = nv + (un - nv) * w; return Math.abs(r - truth[i * 4 + c]); })); n++; e += m; if (m > 40) bad++; }
    W3[w] = +(e / n).toFixed(1) + '/' + +(bad / n).toFixed(3); }
  const f = o => ({ n: o.n, mean: +(o.e / o.n).toFixed(2), bad40: +(o.bad / o.n).toFixed(4) });
  return { ours: { soft: f(S.soft), bg: f(S.bg), all: f(S.all) }, naive: { soft: f(T.soft), bg: f(T.bg), all: f(T.all) }, oracle: f(O.soft), W3 };
})`;
for (const [name, opts] of cases) {
  const p = await openApp(b, { width: 1280, height: 900, step: 'image' });
  await p.evaluate(SCENE_SRC + '(' + JSON.stringify({ seed: 7, ...opts }) + ')');
  for (const col of colours) {
    const r = await p.evaluate(SRC + '(' + JSON.stringify(col) + ')');
    console.log(name, col, 'OURS soft', JSON.stringify(r.ours.soft), 'bg', r.ours.bg.mean, '| NAIVE soft', JSON.stringify(r.naive.soft), 'bg', r.naive.bg.mean, '| ORACLE-COVERAGE', JSON.stringify(r.oracle), 'W', JSON.stringify(r.W3));
  }
  await p.context().close();
}
await b.close(); process.exit(0);
