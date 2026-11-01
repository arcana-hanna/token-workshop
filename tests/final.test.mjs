import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openApp } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('four steps with visible numbers, no backdrop feature left', async () => {
  const page = await openApp(browser, { step: 'image', width: 1280 });
  const r = await page.evaluate(() => ({
    tabs: [...document.querySelectorAll('.tab')].map(t => t.dataset.tab + ':' + (t.querySelector('.n').offsetParent ? 'n' : '-')),
    bgTab: !!document.querySelector('#t-bg,#p-bg'), keys: SETTINGS.filter(k => /^bg(Mode|Col|G1|G2|GAng|GMid|Blur|Bri|Sat|Edge)$/.test(k)),
    meta: Object.keys(projectMeta({ type: 'image/png' })), fits: [...document.querySelectorAll('.tab')].every(b => b.getBoundingClientRect().right <= document.querySelector('.tabs').getBoundingClientRect().right + 1) }));
  assert.deepEqual(r.tabs, ['image:n', 'popout:n', 'ring:n', 'export:n']);
  assert.ok(!r.bgTab); assert.deepEqual(r.keys, []); assert.ok(!r.meta.includes('bgMask')); assert.ok(r.fits);
});

test('picture colour and fill live in the Image step; Match lives in the Ring step and jumps back', async () => {
  const page = await openApp(browser, { step: 'image' });
  assert.ok(await page.evaluate(() => !!document.querySelector('#p-image #r_bri') && !!document.querySelector('#p-image #r_sat') && !!document.querySelector('#p-image #bgOn')));
  assert.ok(await page.evaluate(() => !document.querySelector('#p-popout #r_bri') && !!document.querySelector('#p-ring #bMatch')));
  await page.click('#t-ring');
  await page.evaluate(() => { st.color = '#1b1b1b'; st.gradOn = false; });
  await page.click('#bMatch');
  assert.equal(await page.evaluate(() => tab), 'image');
  assert.ok(await page.evaluate(() => document.querySelector('#p-image').hidden === false));
});

test('Auto from anywhere returns to the Pop-out step; the Pop-out panel is slim', async () => {
  const page = await openApp(browser, { step: 'ring' });
  await page.evaluate(() => $('#bAuto').onclick());
  assert.equal(await page.evaluate(() => tab), 'popout');
  const r = await page.evaluate(() => ({ adv: $('#lookAdv').open, inside: ['popOn', 'autoFit', 'r_shadow'].every(id => $('#lookAdv').contains($('#' + id))) }));
  assert.ok(!r.adv); assert.ok(r.inside);
});

test('small things: stale toast is cleared on a step change; no tool badge in Ring or Export', async () => {
  const page = await openApp(browser, { step: 'image' });
  await page.evaluate(() => toast('hello'));
  await page.click('#t-popout');
  assert.ok(await page.evaluate(() => !$('#toast').classList.contains('on')));
  await page.click('#t-export');
  assert.ok(await page.evaluate(() => getComputedStyle($('#badge')).display === 'none'));
});
