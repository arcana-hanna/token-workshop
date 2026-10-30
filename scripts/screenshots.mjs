/* Renders a few reference screenshots into ./screenshots (desktop + phone). Run: npm run shots */
import { mkdirSync } from 'node:fs';
import { launch, openApp, settle, root } from '../tests/helpers.mjs';
import { join } from 'node:path';

const out = join(root, 'screenshots'); mkdirSync(out, { recursive: true });
const b = await launch();
for (const [name, opts] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 844, touch: true }]]) {
  const p = await openApp(b, opts);
  await p.evaluate(() => { applyLook(LOOKS[0]); }); await settle(p, 400);
  await p.screenshot({ path: join(out, name + '.png') });
}
await b.close();
console.log('screenshots written to', out);
