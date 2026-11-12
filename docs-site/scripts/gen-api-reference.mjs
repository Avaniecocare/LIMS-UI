#!/usr/bin/env node
// Generates the API reference pages (developers/api/*.md) from the pinned OpenAPI document the UI is built
// against (../openapi/openapi.json). Run before every build; the output is not committed.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(readFileSync(join(here, '..', '..', 'openapi', 'openapi.json'), 'utf8'));
const out = join(here, '..', 'src', 'content', 'docs', 'developers', 'api');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const TITLES = {
  'reports-module': 'MIS reports',
  me: 'Current user',
  public: 'Public (no sign-in)',
  admin: 'Administration',
};
const title = (tag) => TITLES[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, ' ');
const slug = (tag) => tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const esc = (s) =>
  String(s ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n+/g, ' ');
const refName = (ref) => ref.split('/').pop();

function typeOf(schema) {
  if (!schema) return '';
  if (schema.$ref) return `\`${refName(schema.$ref)}\``;
  if (schema.type === 'array') return `${typeOf(schema.items)}[]`;
  if (schema.enum) return schema.enum.map((v) => `\`${v}\``).join(' \\| ');
  if (schema.oneOf || schema.anyOf) return (schema.oneOf ?? schema.anyOf).map(typeOf).join(' \\| ');
  return `\`${schema.type ?? 'object'}\``;
}

/** A small example body from a schema, so each endpoint shows what to send. */
function example(schema, depth = 0) {
  if (!schema || depth > 3) return null;
  if (schema.$ref) return example(spec.components?.schemas?.[refName(schema.$ref)], depth + 1);
  if (schema.example !== undefined) return schema.example;
  if (schema.enum) return schema.enum[0];
  switch (schema.type) {
    case 'string':
      return schema.format === 'uuid' ? '00000000-0000-0000-0000-000000000000' : schema.format === 'date-time' ? '2026-11-12T10:00:00.000Z' : schema.format === 'email' ? 'name@example.com' : 'string';
    case 'integer':
    case 'number':
      return schema.minimum ?? 1;
    case 'boolean':
      return true;
    case 'array': {
      const item = example(schema.items, depth + 1);
      return item === null ? [] : [item];
    }
    default: {
      const props = schema.properties ?? {};
      const required = new Set(schema.required ?? []);
      const obj = {};
      for (const [k, v] of Object.entries(props)) if (required.has(k) || depth === 0) obj[k] = example(v, depth + 1);
      return obj;
    }
  }
}

const byTag = new Map();
for (const [path, ops] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(ops)) {
    const tag = op.tags?.[0] ?? 'other';
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag).push({ path, method: method.toUpperCase(), op });
  }
}
const tags = [...byTag.keys()].sort((a, b) => title(a).localeCompare(title(b)));

for (const [i, tag] of tags.entries()) {
  const lines = [
    '---',
    `title: ${JSON.stringify(title(tag))}`,
    `description: ${JSON.stringify(`API endpoints for ${title(tag).toLowerCase()}, generated from the OpenAPI document.`)}`,
    'sidebar:',
    `  order: ${i + 1}`,
    '---',
    '',
    `Generated from the OpenAPI document (\`openapi/openapi.json\`). Paths are relative to \`/api/v1\` unless they start with \`/health\`. Sign-in, the CSRF header and the error format are on [Authentication](/help/developers/authentication/) and [Errors](/help/developers/errors/).`,
    '',
  ];
  for (const { path, method, op } of byTag.get(tag).sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))) {
    const shown = path.replace(/^\/api\/v1/, '');
    lines.push(`## ${method} ${shown}`, '');
    if (op.summary) lines.push(op.summary, '');
    if (op.description) lines.push(op.description, '');
    const params = op.parameters ?? [];
    if (params.length) {
      lines.push('| Parameter | In | Type | Required | Description |', '| --- | --- | --- | --- | --- |');
      for (const p of params) lines.push(`| \`${p.name}\` | ${p.in} | ${typeOf(p.schema)} | ${p.required ? 'Yes' : 'No'} | ${esc(p.description)} |`);
      lines.push('');
    }
    const body = op.requestBody?.content?.['application/json']?.schema;
    const multipart = op.requestBody?.content?.['multipart/form-data'];
    if (body) {
      lines.push(`**Request body:** ${typeOf(body)}`, '', '```json', JSON.stringify(example(body), null, 2), '```', '');
    } else if (multipart) {
      lines.push('**Request body:** `multipart/form-data` (a file upload).', '');
    }
    const ok = Object.entries(op.responses ?? {}).find(([code]) => code.startsWith('2'));
    if (ok) {
      const schema = ok[1].content?.['application/json']?.schema;
      lines.push(`**Response ${ok[0]}:** ${schema ? typeOf(schema) : 'no body'}`, '');
    }
  }
  writeFileSync(join(out, `${slug(tag)}.md`), lines.join('\n'));
}

// Shared schemas, so `TypeName` references have somewhere to point.
const schemaLines = [
  '---',
  'title: "Data types"',
  'description: "Request and response shapes used across the API, generated from the OpenAPI document."',
  'sidebar:',
  `  order: ${tags.length + 1}`,
  '---',
  '',
];
for (const [name, s] of Object.entries(spec.components?.schemas ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
  schemaLines.push(`## ${name}`, '');
  const props = Object.entries(s.properties ?? {});
  if (!props.length) {
    schemaLines.push(`${typeOf(s)}`, '');
    continue;
  }
  const required = new Set(s.required ?? []);
  schemaLines.push('| Field | Type | Required | Description |', '| --- | --- | --- | --- |');
  for (const [k, v] of props) schemaLines.push(`| \`${k}\` | ${typeOf(v)}${v.nullable ? ' or `null`' : ''} | ${required.has(k) ? 'Yes' : 'No'} | ${esc(v.description)} |`);
  schemaLines.push('');
}
writeFileSync(join(out, 'data-types.md'), schemaLines.join('\n'));

writeFileSync(
  join(out, 'index.md'),
  [
    '---',
    'title: "API reference"',
    'description: "Every API endpoint, by area, generated from the OpenAPI document."',
    'sidebar:',
    '  order: 0',
    '---',
    '',
    `${Object.keys(spec.paths).length} paths. The document itself is \`openapi.json\`, produced from the API's code on every build; this reference is generated from the copy the UI is built against.`,
    '',
    '| Area | Endpoints |',
    '| --- | --- |',
    ...tags.map((t) => `| [${title(t)}](/help/developers/api/${slug(t)}/) | ${byTag.get(t).length} |`),
    '',
    '[Data types](/help/developers/api/data-types/) lists every request and response shape.',
    '',
  ].join('\n'),
);
console.log(`API reference: ${tags.length} areas, ${Object.keys(spec.paths).length} paths`);
