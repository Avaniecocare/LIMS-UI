#!/usr/bin/env node
// Builds the help assistant's search index from the published Markdown pages:
//   dist/help-index.json  { version, builtAt, embeddingModel, chunks: [{ id, title, url, heading, description, access, text, vector? }] }
// Only pages under src/content/docs are read: never source code, .env files or anything else.
// Pages marked `access: staff` are left out unless DOCS_INCLUDE_STAFF_INDEX=true (for a private deployment
// whose index is not published on a public address).
//
// Optional embeddings: with EMBEDDING_PROVIDER=voyage and EMBEDDING_API_KEY set, each chunk also gets a vector
// (EMBEDDING_MODEL, default voyage-3.5-lite). Without them the API uses keyword (BM25) search only.
import GithubSlugger from 'github-slugger';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'src', 'content', 'docs');
const outDir = process.argv[2] ? process.argv[2] : join(here, '..', 'dist');
const includeStaff = process.env.DOCS_INCLUDE_STAFF_INDEX === 'true';
const TARGET = 2400; // characters, about 600 tokens
const MIN = 400;

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

function urlOf(file) {
  const rel = relative(root, file)
    .replace(/\\/g, '/')
    .replace(/\.mdx?$/, '');
  const path = rel === 'index' ? '' : rel.replace(/(^|\/)index$/, '') + '/';
  return `/help/${path}`;
}

/** Markdown to the plain text the assistant reads: no comments, diagrams, images or markup noise. */
function clean(md) {
  return md
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```mermaid[\s\S]*?```/g, '')
    .replace(/^:::(note|tip|caution|danger)(\[[^\]]*\])?\s*$/gm, (_, kind) => `${kind[0].toUpperCase()}${kind.slice(1)}:`)
    .replace(/^:::\s*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitLong(text) {
  if (text.length <= TARGET * 1.3) return [text];
  const parts = [];
  let cur = '';
  for (const para of text.split(/\n\n/)) {
    if (cur && cur.length + para.length > TARGET) {
      parts.push(cur);
      cur = '';
    }
    cur = cur ? `${cur}\n\n${para}` : para;
  }
  if (cur) parts.push(cur);
  return parts;
}

const chunks = [];
for (const file of walk(root)
  .filter((f) => /\.mdx?$/.test(f))
  .sort()) {
  const src = readFileSync(file, 'utf8');
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(src);
  const data = fm ? (parseYaml(fm[1]) ?? {}) : {};
  if (data.draft) continue;
  const access = data.access === 'staff' ? 'staff' : 'public';
  if (access === 'staff' && !includeStaff) continue;
  const title = String(data.title ?? relative(root, file));
  const description = data.description ? String(data.description) : null;
  const url = urlOf(file);
  const body = fm ? src.slice(fm[0].length) : src;
  const slugger = new GithubSlugger();
  // Sections by ## and ### headings; the text before the first heading belongs to the page itself.
  const sections = [];
  let current = { heading: null, anchor: null, lines: [] };
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^```/.test(line)) inFence = !inFence;
    const h = !inFence && /^(#{2,3})\s+(.+?)\s*#*$/.exec(line);
    if (h) {
      sections.push(current);
      const heading = h[2].replace(/[`*_]/g, '');
      current = { heading, anchor: slugger.slug(heading), lines: [] };
    } else current.lines.push(line);
  }
  sections.push(current);
  let carry = '';
  for (const [i, s] of sections.entries()) {
    const text = clean(s.lines.join('\n'));
    if (!text && !carry) continue;
    // Very short sections are joined to the next one, so each chunk carries enough to answer from.
    const combined = carry ? `${carry}\n\n${s.heading ? `${s.heading}\n` : ''}${text}` : text;
    if (combined.length < MIN && i < sections.length - 1 && !s.heading) {
      carry = combined;
      continue;
    }
    carry = '';
    for (const [n, part] of splitLong(combined).entries()) {
      chunks.push({
        id: createHash('sha1')
          .update(`${url}#${s.anchor ?? ''}#${n}`)
          .digest('hex')
          .slice(0, 16),
        title,
        url: s.anchor ? `${url}#${s.anchor}` : url,
        heading: s.heading,
        description,
        access,
        text: part,
      });
    }
  }
}

let embeddingModel = null;
if (process.env.EMBEDDING_PROVIDER === 'voyage' && process.env.EMBEDDING_API_KEY) {
  embeddingModel = process.env.EMBEDDING_MODEL || 'voyage-3.5-lite';
  for (let i = 0; i < chunks.length; i += 64) {
    const batch = chunks.slice(i, i + 64);
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.EMBEDDING_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: embeddingModel, input_type: 'document', input: batch.map((c) => `${c.title}${c.heading ? ` › ${c.heading}` : ''}\n${c.text}`) }),
    });
    if (!res.ok) throw new Error(`Embedding request failed with HTTP ${res.status}`);
    const json = await res.json();
    json.data.forEach((d, j) => (batch[j].vector = d.embedding));
  }
}

const version = createHash('sha1')
  .update(JSON.stringify([embeddingModel, chunks]))
  .digest('hex')
  .slice(0, 12);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'help-index.json'), JSON.stringify({ version, builtAt: new Date().toISOString(), embeddingModel, chunks }));
const pages = new Set(chunks.map((c) => c.url.split('#')[0])).size;
console.log(`Help index ${version}: ${chunks.length} chunks from ${pages} pages${embeddingModel ? ` with ${embeddingModel} vectors` : ' (keyword search only)'}`);
