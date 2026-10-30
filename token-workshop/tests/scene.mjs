/* A synthetic portrait where the truth is known: a foreground drawn on a transparent canvas (true colour + true opacity),
   composited onto a paper-like background. Challenges: thin tapered strands, translucent strands, golden light glow with
   gradient opacity, pockets between curls, a semi-transparent veil, tiny enclosed whites (eyes), pale low-contrast strands,
   paper specks and noise. runScene() runs Auto exactly like a user dropping the picture, then measures against the truth. */
export const SCENE_SRC = `(async (opts) => {
  const W = 800, H = 800; let seed = opts.seed || 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();
  const mkc = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const fg = mkc(), f = fg.getContext('2d'), tmp = mkc(), t = tmp.getContext('2d');
  /* a tapered, curling strand drawn at full opacity on tmp, then composited with its own alpha so joints do not double up */
  const strand = (x, y, ang, len, curl, w0, col, alpha) => {
    t.clearRect(0, 0, W, H); t.strokeStyle = col; t.lineCap = 'round'; const n = Math.max(8, Math.round(len / 6)); let a = ang, px = x, py = y, ph = rnd() * 6;
    for (let i = 0; i < n; i++) { const k = i / n; a += curl * Math.sin(ph + k * 5) * .22; const nx = px + Math.cos(a) * len / n, ny = py + Math.sin(a) * len / n;
      t.lineWidth = Math.max(.8, w0 * (1 - k * .65)); t.beginPath(); t.moveTo(px, py); t.lineTo(nx, ny); t.stroke(); px = nx; py = ny; }
    f.globalAlpha = alpha; f.drawImage(tmp, 0, 0); f.globalAlpha = 1; };
  const HAIR = ['#5d7ea6', '#7f98b5', '#9bb3cc', '#2f4768', '#41608a'], GOLD = ['#e8b04a', '#d99a2b', '#f2c56b'], PALE = ['#f5e6c8', '#efe0c0'];
  const cx = 400, cy = 400;
  /* far hair: a big mass of thick wavy locks, and long translucent golden strands behind */
  for (let i = 0; i < 70; i++) { const a = rr(0, 6.283), r0 = rr(90, 170); strand(cx + Math.cos(a) * r0, cy - 30 + Math.sin(a) * r0 * .9, a + rr(-.5, .5), rr(120, 230), rr(-1.4, 1.4), rr(10, 24), HAIR[(rnd() * 5) | 0], 1); }
  /* pockets: curls with transparent centres, some with a gap */
  for (let i = 0; i < 14; i++) { const a = rr(0, 6.283), R = rr(255, 330), px = cx + Math.cos(a) * R, py = cy - 20 + Math.sin(a) * R * .85, r = rr(26, 52);
    t.clearRect(0, 0, W, H); t.strokeStyle = i % 2 ? GOLD[i % 3] : HAIR[i % 5]; t.lineWidth = rr(6, 11); t.lineCap = 'round'; t.beginPath(); t.arc(px, py, r, rr(0, 6), rr(0, 6) + (i % 3 ? 5.6 : 6.4)); t.stroke(); f.drawImage(tmp, 0, 0); }
  /* flying strands: many thin ones, mixed colours */
  for (let i = 0; i < 260; i++) { const a = rr(0, 6.283), r0 = rr(150, 250), col = rnd() < .45 ? GOLD[(rnd() * 3) | 0] : rnd() < .3 ? PALE[(rnd() * 2) | 0] : HAIR[(rnd() * 5) | 0];
    strand(cx + Math.cos(a) * r0, cy - 20 + Math.sin(a) * r0 * .9, a + rr(-.7, .7), rr(70, 190), rr(-2, 2), rr(1.1, 2.8), col, rnd() < .25 ? .45 : 1); }
  /* light shining through: soft golden glows with gradient opacity */
  for (const [gx, gy, gr] of [[190, 330, 95], [140, 520, 80], [250, 190, 70], [640, 260, 60]]) {
    const g = f.createRadialGradient(gx, gy, 0, gx, gy, gr); g.addColorStop(0, 'rgba(255,214,120,.7)'); g.addColorStop(.6, 'rgba(255,214,120,.3)'); g.addColorStop(1, 'rgba(255,214,120,0)'); f.fillStyle = g; f.fillRect(gx - gr, gy - gr, gr * 2, gr * 2); }
  /* body: shoulders, a semi-transparent veil, neck, face with tiny enclosed eye whites, a thin gold chain */
  f.fillStyle = '#8fa3b8'; f.beginPath(); f.ellipse(cx, 840, 290, 175, 0, 0, 7); f.fill();
  f.globalAlpha = .45; f.fillStyle = '#cdbfe6'; f.beginPath(); f.ellipse(600, 700, 120, 60, -.4, 0, 7); f.fill(); f.globalAlpha = 1;
  f.fillStyle = '#e3ac82'; f.fillRect(cx - 45, cy + 90, 90, 130);
  f.fillStyle = '#e8b894'; f.beginPath(); f.ellipse(cx, cy, 125, 158, 0, 0, 7); f.fill();
  for (const ex of [-52, 52]) { f.fillStyle = '#ffffff'; f.beginPath(); f.ellipse(cx + ex, cy - 20, 17, 9, 0, 0, 7); f.fill(); f.fillStyle = '#243a8a'; f.beginPath(); f.arc(cx + ex, cy - 20, 6, 0, 7); f.fill(); }
  f.strokeStyle = '#d99a2b'; f.lineWidth = 2.2; f.beginPath(); f.arc(cx, cy + 150, 120, .35, 2.8); f.stroke();
  /* front locks over the forehead, thick, plus a few pale low-contrast strands */
  for (let i = 0; i < 24; i++) { const a = -2.6 + i * .08; strand(cx + Math.cos(a) * 120, cy - 60 + Math.sin(a) * 140, a + 1.5 * (i % 2 ? 1 : -1) * .4, rr(100, 160), rr(-1, 1), rr(12, 20), HAIR[(rnd() * 5) | 0], 1); }
  for (let i = 0; i < 14; i++) { const a = rr(3.4, 5.9); strand(cx + Math.cos(a) * 200, cy - 10 + Math.sin(a) * 190, a + rr(-.4, .4), rr(60, 120), rr(-1.5, 1.5), rr(1.2, 2.2), '#f1e9d8', .8); }
  /* paper background: warm white with vignette, grain, and a few dark specks */
  const bgc = mkc(), b = bgc.getContext('2d'); const bgCol = opts.bg || '#fbfbf8'; b.fillStyle = bgCol; b.fillRect(0, 0, W, H);
  if (!opts.flat) { const vg = b.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 600); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(120,100,60,.10)'); b.fillStyle = vg; b.fillRect(0, 0, W, H);
    const id = b.getImageData(0, 0, W, H), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * 6; d[i] += n; d[i + 1] += n; d[i + 2] += n; } b.putImageData(id, 0, 0);
    for (let i = 0; i < 50; i++) { b.fillStyle = 'rgba(80,70,60,.25)'; b.beginPath(); b.arc(rr(0, W), rr(0, H), rr(.6, 1.4), 0, 7); b.fill(); } }
  const comp = mkc(), c = comp.getContext('2d'); c.drawImage(bgc, 0, 0); c.drawImage(fg, 0, 0);
  let src = comp;
  if (opts.jpeg) { const url = comp.toDataURL('image/jpeg', opts.jpeg), im = new Image(); await new Promise(r => { im.onload = r; im.src = url; }); src = mkc(); src.getContext('2d').drawImage(im, 0, 0); }
  window.__scene = { fg, W, H };
  loadCanvas(src, 'scene'); st.popOn = true; runAuto();
  await new Promise(r => setTimeout(r, 40)); await new Promise(r => { const iv = setInterval(() => { if (!document.querySelector('#busy.on')) { clearInterval(iv); r(); } }, 50); });
  await new Promise(r => setTimeout(r, 200));
  return true; })`;

/* measures the current mask and pop-out against the known truth */
export const MEASURE_SRC = `((newBgs) => {
  const { fg, W, H } = window.__scene, N = W * H, fd = fg.getContext('2d').getImageData(0, 0, W, H).data;
  refreshSoft(); refreshPop();
  const sd = st.softCv.getContext('2d').getImageData(0, 0, W, H).data;
  let aErr = 0, pErr = 0, pN = 0, inter = 0, uni = 0, fp = 0, fn = 0, cov = 0, tot = 0, prec = 0, ptot = 0;
  for (let i = 0; i < N; i++) { const ta = fd[i * 4 + 3] / 255, pa = sd[i * 4 + 3] / 255; aErr += Math.abs(ta - pa);
    if (ta > .02 && ta < .98) { pErr += Math.abs(ta - pa); pN++; }
    const tb = ta >= .5, pb = pa >= .5; if (tb && pb) inter++; if (tb || pb) uni++; if (pa >= .5 && ta < .1) fp++; if (ta >= .5 && pa < .2) fn++;
    cov += Math.min(ta, pa); tot += ta; ptot += pa; }
  const res = { alphaMAE: aErr / N, partialMAE: pN ? pErr / pN : 0, iou: inter / uni, falsePos: fp / N, falseNeg: fn / N, coverage: cov / tot, precision: cov / ptot, comps: {} };
  const pc = st.popCv;
  for (const col of newBgs) {
    const mkc = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const A = mkc(), B = mkc(), a = A.getContext('2d'), b = B.getContext('2d'); a.fillStyle = b.fillStyle = col; a.fillRect(0, 0, W, H); b.fillRect(0, 0, W, H);
    a.drawImage(fg, 0, 0); b.drawImage(pc, 0, 0);
    const da = a.getImageData(0, 0, W, H).data, db = b.getImageData(0, 0, W, H).data; let s = 0, z = 0, bad = 0, worse = 0, bo = 0, bp = 0, be = 0, no = 0, np = 0, ne = 0;
    for (let i = 0; i < N; i++) { const ta = fd[i * 4 + 3], pa = sd[i * 4 + 3]; if (ta < 3 && pa < 3) continue; z++;
      const d = Math.max(Math.abs(da[i * 4] - db[i * 4]), Math.abs(da[i * 4 + 1] - db[i * 4 + 1]), Math.abs(da[i * 4 + 2] - db[i * 4 + 2])); s += d; if (d > 40) bad++; if (d > 90) worse++; if (ta >= 242) { no++; if (d > 40) bo++; } else if (ta >= 3) { np++; if (d > 40) bp++; } else { ne++; if (d > 40) be++; } }
    res.comps[col] = { mean: s / z, bad40: bad / z, bad90: worse / z, zone: z, opaque: [no, bo], partial: [np, bp], empty: [ne, be] };
  }
  return res; })`;

/* the manual workflow to beat: magic wand on the background, invert, shrink once, hard edge, no unmixing */
export const BASELINE_SRC = `((tol) => {
  st.contig = true; st.tol = 100 * Math.sqrt((tol * 2.55 - 2) / 150); const w = st.sw, h = st.sh, sel = wandSel(2, 2), m = new Uint8Array(w * h), d = st.sdata;
  for (let i = 0; i < m.length; i++) m[i] = (!sel[i] && d[i * 4 + 3] > 8) ? 255 : 0;
  const o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; let k = 255;
    for (let dy = -1; dy <= 1 && k; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h || !m[yy * w + xx]) { k = 0; break; } } o[i] = k; }
  st.mask = o; st.bgC = null; st.bgAuto = false; st.defr = 0; st.feather = 0; maskChanged(); return true; })`;
