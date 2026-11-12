#!/usr/bin/env node
// Builds the user guide: a searchable HTML site (MkDocs Material) and one combined PDF.
//
//   node docs/build.mjs [--product-name "Acme LIMS"] [--company-name "Acme Labs"] [--logo path/to/logo.png]
//                       [--color "#0f4c81"] [--out docs/dist] [--no-pdf]
//
// Without options it builds the neutral edition ("LIMS", "your company"). The source Markdown in
// docs/user-guide is never changed: placeholders are filled in a temporary copy. DOCS_GAPS.md and
// COVERAGE.md sit outside docs/user-guide and are never part of either build.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const productVersion = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')).version;
const docsVersion = readFileSync(join(here, 'VERSION'), 'utf8').trim();
const values = {
  PRODUCT_NAME: opt('product-name', 'LIMS'),
  COMPANY_NAME: opt('company-name', 'your company'),
  PRODUCT_VERSION: productVersion,
  DOCS_VERSION: docsVersion,
  PRIMARY_COLOR: opt('color', '#1f4e79'),
};
const logo = resolve(opt('logo', join(here, 'user-guide', 'assets', 'logo.png')));
const out = resolve(opt('out', join(here, 'dist')));
const slug = values.PRODUCT_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lims';

// Chapter order drives both the site navigation and the PDF.
const NAV = [
  ["What's new", 'index.md'],
  ['1. Getting started', '01-getting-started.md'],
  ['2. Customer to payment', '02-end-to-end-process.md'],
  ['3. Role guides', '03-role-guides.md'],
  ['4. Module reference', '04-module-reference.md'],
  ['5. Administration and settings', '05-administration.md'],
  ['6. Go-live setup', '06-go-live.md'],
  ['7. Documents produced', '07-documents.md'],
  ['8. Reports and dashboard', '08-reports-dashboard.md'],
  ['9. Troubleshooting and FAQ', '09-troubleshooting.md'],
  ['10. IT appendix', '10-it-appendix.md'],
  ['11. Glossary and quick reference', '11-glossary.md'],
];

const fill = (text) => text.replace(/\{\{(PRODUCT_NAME|COMPANY_NAME|PRODUCT_VERSION|DOCS_VERSION|PRIMARY_COLOR)\}\}/g, (_, k) => values[k]);
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

function mkdocsBin() {
  if (process.env.MKDOCS) return process.env.MKDOCS;
  const venv = join(here, '.venv');
  const bin = join(venv, 'bin', 'mkdocs');
  if (!existsSync(bin)) {
    console.log('Creating docs/.venv with MkDocs Material…');
    run('python3', ['-m', 'venv', venv]);
    run(join(venv, 'bin', 'pip'), ['install', '-q', '-r', join(here, 'requirements.txt')]);
  }
  return bin;
}
function run(cmd, argv, cwd) {
  const r = spawnSync(cmd, argv, { cwd, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${argv.join(' ')} failed`);
}

// 1. A filled-in copy of the sources.
const work = join(out, '.work');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
cpSync(join(here, 'user-guide'), join(work, 'user-guide'), { recursive: true });
cpSync(join(here, 'overrides'), join(work, 'overrides'), { recursive: true });
for (const f of [...walk(join(work, 'user-guide')), ...walk(join(work, 'overrides'))]) {
  if (['.md', '.css', '.html', '.tpl'].includes(extname(f))) writeFileSync(f, fill(readFileSync(f, 'utf8')));
}
cpSync(logo, join(work, 'user-guide', 'assets', 'logo.png'));
for (const [, file] of NAV) if (!existsSync(join(work, 'user-guide', file))) throw new Error(`Missing chapter ${file}`);
const leftovers = walk(join(work, 'user-guide')).filter((f) => f.endsWith('.md') && /\{\{[A-Z_]+\}\}/.test(readFileSync(f, 'utf8')));
if (leftovers.length) throw new Error(`Unfilled placeholders in ${leftovers.join(', ')}`);
const nav = `\n${NAV.map(([title, file]) => `  - "${title}": ${file}`).join('\n')}`;
writeFileSync(join(work, 'mkdocs.yml'), fill(readFileSync(join(here, 'mkdocs.yml'), 'utf8')).replace('{{NAV}}', nav).replace('site_dir: ../dist/site', `site_dir: ${join(out, 'site')}`));

// 2. The site. --strict turns broken links and missing pages into errors.
rmSync(join(out, 'site'), { recursive: true, force: true });
run(mkdocsBin(), ['build', '--strict', '--quiet', '-f', join(work, 'mkdocs.yml')], work);
console.log(`Site: ${join(out, 'site', 'index.html')}`);

// 3. The PDF, printed by Chromium from the single-page print view, so diagrams are drawn first.
if (!flag('no-pdf')) {
  const { chromium } = await import('@playwright/test');
  const root = join(out, 'site');
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
  const server = createServer((req, res) => {
    const path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const file = existsSync(path) && statSync(path).isDirectory() ? join(path, 'index.html') : path;
    if (!file.startsWith(root) || !existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/print_page.html`, { waitUntil: 'networkidle' });
    // Wait until every Mermaid diagram has been drawn.
    await page.waitForFunction(() => [...document.querySelectorAll('.mermaid')].every((el) => el.querySelector('svg')), null, { timeout: 60_000 });
    const footer = `<div style="width:100%;font:8px Arial,sans-serif;color:#555;padding:0 14mm;display:flex;justify-content:space-between"><span>${values.PRODUCT_NAME} user guide ${docsVersion} · product version ${productVersion}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
    const pdf = join(out, `${slug}-user-guide-${docsVersion}.pdf`);
    await page.pdf({ path: pdf, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer, margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' } });
    console.log(`PDF: ${pdf}`);
  } finally {
    await browser.close();
    server.close();
  }
}
rmSync(work, { recursive: true, force: true });
