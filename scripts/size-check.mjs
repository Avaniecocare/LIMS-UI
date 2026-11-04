// Enforces the initial JavaScript budget: everything index.html loads before any route chunk.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT = 300 * 1024;
const html = readFileSync('dist/index.html', 'utf8');
const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
let total = 0;
for (const ref of refs) {
  const size = gzipSync(readFileSync(join('dist', ref))).length;
  total += size;
  console.log(`${(size / 1024).toFixed(1).padStart(8)} KB  ${ref}`);
}
console.log(`${(total / 1024).toFixed(1).padStart(8)} KB  initial JS (limit ${LIMIT / 1024} KB)`);
if (total > LIMIT) process.exit(1);
