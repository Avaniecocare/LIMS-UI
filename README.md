# LIMS-UI

React single-page app for the white-label LIMS. It owns screens and interaction only; every business rule and calculation is on the backend (`LIMS`).

## Run

Start the backend first (see the `LIMS` README), then:

```sh
npm ci
npm run dev      # http://localhost:5173
```

The API address comes from `public/config.js` in development. In the image, `docker/entrypoint.sh` generates `config.js` from `API_URL` when the container starts, so one image serves every company. No company value exists in this repo or at build time: branding is fetched from `GET /api/v1/public/branding` on load.

## Commands

| Command | Purpose |
|---|---|
| `npm run api:generate` | Regenerate `src/api/schema.d.ts` from the pinned `openapi/openapi.json` |
| `npm run api:check` | Fail if the generated client does not match the pinned file |
| `npm run size:check` | Fail if initial JS is over 300 KB gzipped (after `npm run build`) |
| `npm test` | Vitest and React Testing Library |
| `npm run test:e2e` | Playwright, against a running stack at `E2E_BASE_URL` |
| `npm run lint`, `npm run typecheck` | Static checks |

## Updating the API contract

Copy the `openapi.json` published by `LIMS` CI to `openapi/openapi.json`, run `npm run api:generate`, and commit both. Never hand-write API types.

Git hooks: `git config core.hooksPath .githooks` (needs gitleaks).
