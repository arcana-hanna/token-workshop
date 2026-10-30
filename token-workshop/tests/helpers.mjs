import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const pageUrl = pathToFileURL(join(root, 'dist/index.html')).href;

export async function launch() {
  return chromium.launch();
}

/** Opens the built app in a fresh page. Collects console errors in page.errors. */
export async function openApp(browser, { width = 1280, height = 800, touch = false, keepCoach = false, storageState } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, storageState, acceptDownloads: true });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.goto(pageUrl);
  await page.waitForFunction(() => typeof st !== 'undefined' && st.src);
  if (!keepCoach) await page.evaluate(() => dismissCoach(true));
  return page;
}

/** Wait until no texture is being generated and the next frame is drawn. */
export async function settle(page, ms = 250) {
  await page.waitForFunction(() => !document.querySelector('#busy.on'), null, { timeout: 15000 });
  await page.waitForTimeout(ms);
}

/** Canvas pixel stats of the on-screen token: [opaque pixel count, mean red] */
export function canvasStats(page) {
  return page.evaluate(() => {
    const c = document.querySelector('#cv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0, r = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { n++; r += d[i]; }
    return [n, n ? r / n : 0];
  });
}
