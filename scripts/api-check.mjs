// Fails when the committed generated client does not match the pinned openapi.json.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'api-check-')), 'schema.d.ts');
execFileSync('npx', ['openapi-typescript', 'openapi/openapi.json', '-o', out], { stdio: 'pipe' });
if (readFileSync(out, 'utf8') !== readFileSync('src/api/schema.d.ts', 'utf8')) {
  console.error('src/api/schema.d.ts does not match openapi/openapi.json. Run: npm run api:generate');
  process.exit(1);
}
console.log('Generated API client matches the pinned contract.');
