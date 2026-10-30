# Token Workshop

A round-token maker for tabletop games. Pick the part of a picture that should pop out of a ring, style the ring (shape, metal, texture, lighting, energy), and export a PNG.
The exported PNG carries its own project data, so you can import it later and keep editing.

The app is **one self-contained HTML file** (`dist/index.html`) with no runtime dependencies. No AI features, no network calls.

## Features

- Select / Brush / magic wand with live sensitivity, Auto subject detection, grow, shrink, invert
- **Soft selection**: the selection holds partial opacity, so hair and fur keep their fine, see-through strands
- **Fix edges automatically** (one tap, also part of Auto on every new picture): soft matte against the local background colour, halo removal (defringe), speck and hole clean-up. Fine-tune section: edge reach, background match, hair softness, edge shift, background colour (auto or picked), speck size, brush softness
- Hair-aware brush (adds only what differs from the background), soft brush, mask view (black and white)
- Picture adjustments: brightness, contrast, saturation, and Match to ring
- Table-size preview (40 / 80 / 120 px) on the chosen preview background
- Export: token, ring only, pop-out only, or all layers as a .zip; PNG or WebP (both keep the editable project)
- Isolate view (pop-out only), see-through pop-out while moving, preview backgrounds (checkerboard, table map, dark)
- Ring shapes, metals, textures, lighting, energy lightning, looks
- Autosave in the browser (IndexedDB), restored on the next visit
- Keyboard access: roving toolbar, arrow-key cursor with Enter for Select / Brush
- Project data embedded in exported PNGs (`tkWs` chunk), validated on import

## Develop

```
npm install
npm run build      # src/ -> dist/index.html (and dist/app.js for linting)
npm run lint
npm test           # builds, then runs the Playwright tests
npm run shots      # reference screenshots into ./screenshots
```

Tests use Playwright. If your browsers are not installed yet: `npx playwright install chromium`.

## Layout

```
src/index.html      markup template
src/styles.css      styles
src/js/NN-*.js      classic scripts, concatenated in filename order into one scope
build.mjs           inlines styles + scripts into dist/index.html
tests/              node:test + Playwright (smoke, hardening, view, autosave, keyboard, edges, adjust, export)
.github/workflows/  ci.yml (lint + tests), pages.yml (deploy to GitHub Pages)
```

Source files, in order: core helpers, ring shapes, ring textures, state, masks, edge tools, adjustments and halo removal, history, render, pointer, image load, project file (PNG chunk, validation), UI controls, looks, tabs/export, autosave, table-size preview, keyboard + boot.
There are no ES modules on purpose: every file shares the same globals (`st` is the app state), which keeps the output a single plain script.

## Publish on GitHub Pages

1. Create a repository and push this folder (`git init && git add . && git commit -m "Token Workshop" && git branch -M main && git remote add origin <url> && git push -u origin main`).
2. In the repository: **Settings → Pages → Source: GitHub Actions**.
3. Every push to `main` builds and deploys `dist/index.html` as the site's `index.html`.

Or skip the pipeline: upload `dist/index.html` as `index.html` yourself.

## Later (ideas on the list, not built yet)

- **Use ring from this token**: drop an exported token and take only its ring settings for the current picture
- **Installable and offline** (PWA): web manifest and service worker, so it can be installed on phone and desktop

## Quality harness

`npm run quality` builds a synthetic portrait whose true opacity is known (strands, glows, a veil, eyes, paper grain, JPEG noise, a flat grey backdrop), runs Auto on it and prints IoU, false positives and the error when the cut-out is placed on dark, gold and white backgrounds. It also measures the manual workflow (magic wand on the background, invert, shrink once) as a baseline. `tests/quality.test.mjs` fails if Auto drops below set limits or stops beating that baseline clearly. `node scripts/compare-real.mjs <image>` writes Auto and wand results for a real picture to `screenshots/`.

## Manual gap and feather tools

- **Close small gaps** (Edges): removes background-coloured pockets up to the chosen width, such as the paper between curls. Wider openings are left for the Remove brush.
- **Feather** (Edges): fades the outer edge of hard selections inward. Soft hair pixels are untouched. Show mask displays the feathered result.
- **Region size** (Select options): the wand can skip small bits or big areas, so it can pick only the small gaps.

## Auto on dark and textured backdrops

Two extra steps in Auto: isolated weak patches (paper stains, wood highlights) that never touch solid subject are dropped, and on dark backdrops the solid core is closed into one silhouette and filled, because shadows and dark hair cannot be told from a dark background by colour alone. Limits: black hair on a black or dark-brown backdrop (about the same colour) is still lost; select it with the wand or the Brush instead. `node scripts/auto-real.mjs <backdrop colour> <image>...` shows Auto on real pictures.

## Tweaking Auto

The Edges panel has **Auto sensitivity** and **Shrink / grow**. They run Auto again with your values (and replace the current selection): low sensitivity needs a clear difference from the background, high keeps even faint or same-coloured parts such as black hair on a dark backdrop. Shrink / grow moves the whole outline in or out in whole pixels, like shrinking a wand selection. They work when the picture has a fairly plain background.

## Simplified controls

Pop-out tab: Fix edges automatically, Auto sensitivity, Shrink / grow and Feather are always visible; Halo removal, Close small gaps and Remove specks & holes sit under More. Refine, the wand's region size and the fine-tune edge sliders were removed. Brush softness lives in the Brush options. Preview (P) shows the finished token without outlines. Wand Sensitivity now maps non-linearly so the whole slider is useful.

Auto is a little more sensitive by default on dark backdrops, where dark hair and shadows are close to the background colour. Wet black hair on a dark shelf now comes out whole; shrink the outline a few pixels to trim leftover backdrop.
