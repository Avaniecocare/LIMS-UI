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
| `npm run test:e2e` | Playwright, against a running stack at `E2E_BASE_URL`; see below |
| `npm run lint`, `npm run typecheck` | Static checks |

## End-to-end tests

Playwright drives the real UI against a running backend, one worker at a time. Start the stack, then:

```sh
npx playwright install chromium       # once
npx playwright test                   # everything
npx playwright test e2e/a11y.spec.ts  # one spec, kinder on a small machine
```

| Spec | Covers |
|---|---|
| `e2e/smoke.spec.ts`, `booking.spec.ts`, `testing.spec.ts` | Admin and masters, orders to booking and planning, result entry to issued reports |
| `e2e/commercial.spec.ts` | Dispatch, invoices, payments, due invoices, reports and dashboards |
| `e2e/full-cycle.spec.ts` | One test through every role: customer to dispatch, invoice, payment, revision, and dashboard numbers against their reports |
| `e2e/a11y.spec.ts` | axe (`wcag2a`, `wcag2aa`, `wcag21aa`) on every main screen, with dialogs and result entry |

`E2E_BASE_URL` and `E2E_API_URL` point at another stack; `E2E_PASSWORD` overrides the demo password. Tests create their own data and pass on a clean or a used database, as long as the demo seed is loaded.

CI's `e2e` job starts the pinned backend (`LIMS_IMAGE`) from `e2e/docker-compose.ci.yml` with PostgreSQL, Redis and an S3 store, loads the seed, serves the built UI and runs everything, uploading the report on failure. Its company values and `e2e/branding/` are fictional.

## Error tracking

Nothing is sent by default. To connect a service, call `setErrorReporter` from `src/lib/error-reporting.ts` in `src/main.tsx`. It receives a report with the error's name, message and stack and the path, with emails, ids, query strings and secrets removed.

## Updating the API contract

Copy the `openapi.json` published by `LIMS` CI to `openapi/openapi.json`, run `npm run api:generate`, and commit both. Never hand-write API types.

Git hooks: `git config core.hooksPath .githooks` (needs gitleaks).
