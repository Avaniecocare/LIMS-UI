# LIMS help site

The product documentation and its **Ask AI** assistant, built with [Astro Starlight](https://starlight.astro.build). It is served at `/help/` on the same address as the app, from the UI container. Writing rules are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Run it locally

```bash
cd docs-site
npm install
npm run dev          # http://localhost:4321/help/ (edits reload)
```

To see it on the app's address with a working **Ask AI**, build it and let the dev stack serve it:

```bash
npm run build        # dist/ plus dist/help-index.json
npm run preview      # port 4321; the UI's dev server proxies /help to it
```

With the API's `.env` set to `ENABLE_AI_ASSISTANT=true`, `AI_PROVIDER=mock` and `HELP_INDEX_PATH=../LIMS-UI/docs-site/dist/help-index.json`, the assistant answers offline from the docs at no cost.

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Generates the API reference from `../openapi/openapi.json`, builds the site, moves inline scripts into files (so the strict Content-Security-Policy holds), wraps wide tables in keyboard-reachable scroll regions, and builds the assistant's search index `dist/help-index.json`. |
| `npm run check:links` | Checks every internal link and `#anchor` in `dist/`. |
| `npm run index` | Rebuilds only `dist/help-index.json` from the Markdown. |
| `npm test` | Tests the answer renderer (no HTML or off-site links can get through). |

## Branding

Set at build time: `DOCS_PRODUCT_NAME`, `DOCS_PRIMARY_COLOR` (`#rrggbb`), `DOCS_LOGO` (a file path), `DOCS_SITE_URL`, `DOCS_INDEXABLE` (`true` lets search engines in; otherwise every page is `noindex`), `DOCS_LAST_UPDATED` (`false` when there is no git history). The UI's `Dockerfile` passes them as build arguments.

## Deploy and re-index

The UI image builds this site in its own stage (`npm run build && npm run check:links`, so a broken link fails the image) and nginx serves it from `/help/`. Releasing the UI image therefore publishes the docs **and** the new search index; the API re-reads `HELP_INDEX_URL` (by default `<FRONTEND_ORIGIN>/help/help-index.json`) every 10 minutes. CI builds the site on every change to `docs-site/` or `openapi/`.

Optional vector search: set `EMBEDDING_PROVIDER=voyage` and `EMBEDDING_API_KEY` for the build, and the same two on the API.

## Layout

```
src/content/docs/       the pages (Markdown), one folder per sidebar section
  developers/api/       generated from OpenAPI on every build (not committed)
src/components/         Footer (page feedback, Ask AI, diagrams), Head (noindex for staff pages)
src/lib/                ask.ts (the Ask AI panel), markdown.ts (safe answer rendering), api.ts
scripts/                gen-api-reference, build-index, postbuild, check-links
```

The assistant's server side is in the API: `LIMS/src/modules/help/`.
