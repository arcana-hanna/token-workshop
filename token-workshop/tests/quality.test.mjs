import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';
import { SCENE_SRC, MEASURE_SRC, BASELINE_SRC } from './scene.mjs';

/* Auto against a synthetic portrait with known opacity (strands, glows, a veil, eyes, paper grain), and against the manual
   workflow (magic wand on the background, invert, shrink once), which Auto has to beat clearly. */
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });
const BGS = JSON.stringify(['#1b1c20', '#c9ad7b', '#ffffff']);
const cases = [
  ['paper', {}, { iou: .88, fp: .01, dark: 22 }],
  ['paper with JPEG noise', { jpeg: .88 }, { iou: .84, fp: .03, dark: 32 }],
  ['flat grey backdrop', { bg: '#c9c9cf', flat: true }, { iou: .85, fp: .01, dark: 28 }],
];
for (const [name, opts, lim] of cases) {
  test('Auto quality: ' + name, async () => {
    const page = await openApp(browser, { width: 1280, height: 900 });
    await page.evaluate(SCENE_SRC + '(' + JSON.stringify({ seed: 7, ...opts }) + ')');
    const a = await page.evaluate(MEASURE_SRC + '(' + BGS + ')');
    assert.ok(a.iou >= lim.iou, 'IoU ' + a.iou.toFixed(3));
    assert.ok(a.falsePos <= lim.fp, 'false positives ' + a.falsePos.toFixed(4));
    assert.ok(a.comps['#1b1c20'].mean <= lim.dark, 'mean error on dark ' + a.comps['#1b1c20'].mean.toFixed(1));
    let best = 1e9;
    for (const tol of [8, 14, 20]) { await page.evaluate(BASELINE_SRC + '(' + tol + ')'); const w = await page.evaluate(MEASURE_SRC + '(' + BGS + ')'); best = Math.min(best, w.comps['#1b1c20'].mean); }
    assert.ok(a.comps['#1b1c20'].mean < best * .7, 'beats wand+shrink: ' + a.comps['#1b1c20'].mean.toFixed(1) + ' vs ' + best.toFixed(1));
    await page.context().close();
  });
}
