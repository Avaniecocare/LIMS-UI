#!/usr/bin/env node
// Checks every internal link in the built site: the page exists and, when the link has #anchor, the heading does.
// Exits with an error listing the broken links. External links are not fetched.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
if (!existsSync(dist)) {
  console.error('No dist/ folder: run `npm run build` first.');
  process.exit(1);
}
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const pages = walk(dist).filter((f) => f.endsWith('.html'));

const idsOf = new Map();
const ids = (file) => {
  if (!idsOf.has(file)) idsOf.set(file, new Set([...readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return idsOf.get(file);
};
const fileFor = (path) => {
  const p = decodeURIComponent(path.replace(/^\/help\/?/, ''));
  const candidates = [join(dist, p, 'index.html'), join(dist, p), join(dist, `${p.replace(/\/$/, '')}.html`)];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile());
};

const broken = [];
let checked = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const from = '/' + relative(dist, page).replace(/\\/g, '/');
  for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|javascript:|data:)/.test(href)) continue;
    let target;
    try {
      target = new URL(href, `https://docs.local/help${from.replace(/index\.html$/, '')}`);
    } catch {
      broken.push(`${from}: unparsable link ${href}`);
      continue;
    }
    if (!target.pathname.startsWith('/help')) continue;
    checked++;
    const file = target.pathname === '/help/' || target.pathname === '/help' ? join(dist, 'index.html') : fileFor(target.pathname);
    if (!file) {
      broken.push(`${from}: no page for ${href}`);
      continue;
    }
    const anchor = decodeURIComponent(target.hash.slice(1));
    if (anchor && file.endsWith('.html') && !ids(file).has(anchor)) broken.push(`${from}: no heading #${anchor} on ${target.pathname}`);
  }
}
const unique = [...new Set(broken)];
if (unique.length) {
  console.error(`${unique.length} broken links (of ${checked} checked):\n${unique.join('\n')}`);
  process.exit(1);
}
console.log(`Links: ${checked} internal links on ${pages.length} pages, none broken.`);
