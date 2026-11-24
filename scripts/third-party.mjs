#!/usr/bin/env node
/**
 * The notices the open-source licences ask for: every package shipped in the app or the help site, its licence and text.
 *   node scripts/third-party.mjs <out file> <folder with package-lock.json and node_modules>...
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [out, ...folders] = process.argv.slice(2);
const seen = new Map();
for (const folder of folders) {
  const { packages } = JSON.parse(readFileSync(join(folder, 'package-lock.json'), 'utf8'));
  for (const [path, p] of Object.entries(packages)) {
    const dir = join(folder, path);
    // Optional packages for other platforms are in the lock and not installed.
    if (!path || p.dev || !existsSync(join(dir, 'package.json'))) continue;
    const { name, version, license, homepage } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const texts = readdirSync(dir).filter((f) => /^(licen[cs]e|copying|notice)/i.test(f) && !/\.(js|ts|json)$/.test(f));
    seen.set(`${name}@${version}`, { licence: p.license ?? license ?? 'see its own files', homepage, text: texts.map((f) => readSafely(join(dir, f))).join('\n') });
  }
}
if (seen.size < 10) throw new Error(`Only ${seen.size} packages found: the folders are wrong, or not installed`);

function readSafely(file) {
  try {
    return readFileSync(file, 'utf8').trim();
  } catch {
    return ''; // a folder called "licenses"
  }
}

const parts = [...seen.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, p]) => `${id}\n${p.licence}${p.homepage ? `\n${p.homepage}` : ''}\n\n${p.text || '(no licence file in the package)'}\n`);
writeFileSync(out, `This product includes the following open-source software.\n\n${parts.join(`\n${'-'.repeat(78)}\n\n`)}`);
console.log(`${seen.size} packages listed in ${out}`);
