# Decisions

- **TypeScript 5.9 here.** `openapi-typescript` does not accept TypeScript 6 yet.
- **TanStack Table v8.** Pinned to the v8 API.
- **Native `<select>` for master lists.** It is fast on long lists and works well with keyboards and tablets; Radix menus are used for action menus only.
- **List state lives in the URL,** so filters survive reloads and saved filters are just stored parameters.
- **The CSRF token is held in memory** and refetched from `/auth/me` on reload. Nothing sensitive goes in browser storage.
- **`style-src 'unsafe-inline'` in the CSP.** Radix and Recharts set inline styles. Scripts stay strict: `script-src 'self'`, with runtime config in a same-origin file.
- **Text colour on brand surfaces is computed** from the brand colour's luminance, so any company's colours keep readable contrast.
- **Document tabs open during the click.** Workers can take longer than the browser's popup allowance, so the tab is reserved first and pointed at the signed link when it is ready. If the tab is blocked, a toast offers the link instead.
- **Scanner detection uses event timestamps,** not arrival order: a burst of at least 4 characters under 30 ms apart, ending in Enter, with no field focused. Typing in a field is never intercepted.
- **Customer and job pickers search on the server** rather than loading a capped option list, since those lists have no practical upper size.
- **Autosave is a plain queue, not a hook.** `features/testing/autosave.ts` runs one save at a time and sends the version the last one returned, so it can be unit-tested with fake timers and versions cannot race.
- **Half-typed numbers are not sent.** `PUT /tests/{id}/results` stores a non-numeric value as empty without returning an error, so the field is checked for format in the browser and flagged. All arithmetic stays on the server.
- **Who may start a test is inferred from the assignee's name.** `TestDetailDto` has no assignee id or `canStart`. The server still refuses anyone else with `NOT_ASSIGNEE`.
- **A test's version on the job page is fetched when cancelling.** `SampleTestBriefDto` has no `version`, so the dialog reads `GET /tests/{id}`, and the per-test Cancel button there also needs `tests.viewAll`.
- **The Review tab is two tables.** `GET /reports` takes one status at a time, and merging two paged lists in the browser would give wrong pages.
