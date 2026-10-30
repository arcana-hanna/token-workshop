// Builds dist/index.html (one self-contained file) from src/. No dependencies.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = (p) => join(root, 'src', p);
const files = readdirSync(src('js')).filter((f) => f.endsWith('.js')).sort();
const script = files.map((f) => `/* ===== ${f} ===== */\n` + readFileSync(src('js/' + f), 'utf8')).join('\n');
const css = readFileSync(src('styles.css'), 'utf8');
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const html = readFileSync(src('index.html'), 'utf8')
  .replace('/*__STYLES__*/', () => css)
  .replace('/*__SCRIPT__*/', () => script)
  .replaceAll('__VERSION__', version);
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/index.html'), html);
writeFileSync(join(root, 'dist/app.js'), script); // concatenated script, used by the linter
console.log(`built dist/index.html (${(html.length / 1024).toFixed(0)} KB, ${files.length} source files)`);
