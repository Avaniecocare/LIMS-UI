#!/usr/bin/env node
// After `astro build`:
//  1. Inline <script> blocks become same-origin files, so the site works under the app's strict
//     Content-Security-Policy (script-src 'self'; no inline scripts). Each distinct script is written once.
//  2. The help assistant's index (dist/help-index.json) is rebuilt from the Markdown sources.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const base = '/help';
const scriptsDir = join(dist, '_inline');
mkdirSync(scriptsDir, { recursive: true });

let pages = 0;
let moved = 0;
const written = new Set();
for (const file of walk(dist).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  const next = html.replace(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g, (whole, attrs = '', body) => {
    if (/\ssrc=/.test(attrs) || !body.trim()) return whole;
    // JSON data blocks are not executed, so they are allowed inline.
    if (/type="application\/(ld\+)?json"/.test(attrs)) return whole;
    const hash = createHash('sha256').update(body).digest('hex').slice(0, 16);
    const name = `${hash}.js`;
    if (!written.has(name)) {
      writeFileSync(join(scriptsDir, name), body);
      written.add(name);
    }
    moved++;
    return `<script${attrs} src="${base}/_inline/${name}"></script>`;
  });
  // Wide tables scroll sideways inside a labelled region that the keyboard can reach (WCAG 2.1.1).
  const wrapped = next.replace(/<table>/g, '<div class="table-scroll" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table>').replace(/<\/table>/g, '</table></div>');
  if (wrapped !== html) writeFileSync(file, wrapped);
  pages++;
}
console.log(`CSP: ${moved} inline scripts in ${pages} pages moved to ${written.size} files`);

const index = spawnSync(process.execPath, [join(here, 'build-index.mjs'), dist], { stdio: 'inherit' });
if (index.status !== 0) process.exit(index.status ?? 1);
