# Design system

For engineers working on the LIMS interface. The tokens live in [`src/index.css`](../src/index.css), the components in [`src/components/ui/primitives.tsx`](../src/components/ui/primitives.tsx). Build screens from these components. Don't add one-off colours, shadows or animations.

## Principles

- **Calm and dense.** Lab staff work through long lists all day. Keep text at 13–14 px, use tight but even spacing, and give every action a clear label.
- **The lab's brand, not ours.** Colours come from each lab's branding in Admin → Branding. Components use tokens, so any palette works in light and dark themes.
- **Motion explains, never decorates.** Every animation gives feedback, shows what changed, or makes waiting feel shorter. If you can't say which, leave it out.

## Colour tokens

Use Tailwind utilities with these names. They resolve to CSS variables that switch with the theme.

| Token | Utility examples | Use |
| --- | --- | --- |
| Page | `bg-page` | The page behind cards (the `body` already uses it) |
| Surface | `bg-surface` | Cards, tables, inputs, the header |
| Raised surface | `bg-surface-raised` | Dialogs, menus, popovers |
| Greys `gray-50`…`gray-950` | `text-gray-900` (main text), `text-gray-600` (secondary), `border-gray-200`, `bg-gray-50` (table headers, hover) | Everything neutral. Light greys are tinted by the lab's surface colour. |
| Brand | `bg-brand text-brand-fg`, `text-brand`, `border-brand` | Primary actions, the selected nav item, the active tab |
| Focus | `ring-brand-focus`, or `:focus-visible` automatically | Keyboard focus (at least 3:1 against the page) |
| Nav | `bg-nav text-nav-fg` | The side menu |
| Danger | `bg-danger text-white hover:bg-danger-hover` | Destructive buttons. The same deep red in both themes. |
| Status tints | `bg-red-50 text-red-800`, `bg-amber-50 text-amber-900`, `bg-green-50 text-green-900`, `bg-blue-50 text-blue-900` | Alerts, badges, inline notices |

Rules:

- **Never use `bg-white`.** Use `bg-surface`. White text on a coloured fill (`text-white`) is fine.
- **Don't hard-code hex values in components.** Charts read `var(--brand-primary)` and the grey variables.
- **Status is never shown by colour alone.** Always add a label, an icon, or both.

### Dark theme

People choose Light, Dark or "Same as this device" in the user menu. The choice is kept in `localStorage` under `lims.theme`; it's a display preference, never session data. [`src/lib/theme.ts`](../src/lib/theme.ts) applies it to `<html data-theme>` before the first render.

`index.css` re-maps the grey scale and the status tints under `:root[data-theme='dark']`. As a result, existing `text-gray-*`, `bg-red-50` and similar utilities read correctly without changes.

`applyBranding` (in `providers.tsx`) works out dark variants of the lab's colours:

- `--brand-primary-dark`: the primary colour lightened to 4.5:1 against the dark surface.
- `--brand-focus-dark`: the focus colour at 3:1.
- `--brand-nav-dark`: a menu colour that stays dark.

The e2e test `a11y.spec.ts › dark theme` runs axe (WCAG 2.1 AA) on every main screen in dark mode.

## Type, spacing, shape

- **Font:** Inter, falling back to system fonts. Body 14 px, tables and secondary text 13 px, captions 12 px (`text-xs`). Page titles use `text-xl font-semibold` and card titles `text-sm font-semibold`.
- **Numbers:** tabular figures everywhere (set on `body`), so columns of amounts line up.
- **Spacing:** the 4 px Tailwind scale. Cards use `px-4 py-3` headers and `p-4` bodies; pages use `p-4 lg:p-5`; form fields have `space-y-3` between them.
- **Radius:** `rounded-md` for controls and `rounded-lg` for cards and dialogs.
- **Elevation:** `shadow-sm` for cards (light theme only; borders carry it in dark), `shadow-lg` for menus and `shadow-xl` for dialogs.
- **Stacking:** `--z-sticky` 10 (table headers), `--z-nav-backdrop` 30, `--z-nav` 40, `--z-overlay` 40, `--z-modal` and `--z-popover` 50. Use `z-(--z-modal)` and similar rather than new numbers.
- **Touch:** on touch screens (`pointer: coarse`), buttons, inputs, tabs and menu items grow to at least 44 px.

## Components

All of these come from `primitives.tsx` unless noted.

| Component | Notes |
| --- | --- |
| `Button` | Variants `primary`, `secondary`, `ghost`, `danger`; sizes `sm`, `md`, `icon`. Pass `loading` for a spinner plus `aria-busy`; the button is disabled while it shows. Every icon-only button needs an `aria-label`. |
| `Input`, `Textarea`, `Select` | Native controls with hover and focus border states. `aria-invalid` turns the border red. `Select` is native on purpose: it's fast with long lists and works with scanners. |
| `Field` | Label, control, hint and error. It wires `aria-describedby`, `aria-invalid` and `aria-required` to its single child. |
| `Checkbox` | Radix checkbox; the tick pops in. |
| `Dialog`, `ConfirmDialog` | Radix dialogs: they trap focus, close on Esc and return focus to the trigger. Use `ConfirmDialog` with `danger` for destructive actions, and name what will happen: "Cancel invoice", "Delete 3 rates". |
| `Tabs`, `TabsList`, `TabsTrigger` | Keep the tab in the URL (`?tab=`); `useListState` keeps it out of API calls. The underline slides. |
| `DropdownMenu`, `DropdownItem`, `DropdownRadioItem`, `DropdownLabel`, `DropdownSeparator` | Radix menus. |
| `Card`, `CardHeader` | Card sections with a title, an optional description and actions. |
| `Badge` | Tones `gray`, `blue`, `amber`, `green`, `red`, `purple`; always with text. |
| `Spinner` | A loading message. It appears only after 180 ms, so fast loads don't flash. |
| `Skeleton`, `TableSkeleton` | Placeholders shaped like the content. `DataTable` uses `TableSkeleton` while it loads. |
| `EmptyState` | Icon, title, hint and an optional `action` (the button that fixes the emptiness). |
| `ErrorState` | What went wrong, plus Try again. |
| `PageHeader`, `BackButton` | Title, description, breadcrumb, actions. The header sets the tab title and moves focus to the heading on navigation. |
| `DataTable` (`components/DataTable.tsx`) | Server-driven sorting and pagination, virtualised rows, selection and bulk actions, sticky header. Below 640 px each row becomes a card of label and value pairs. |

Every interactive component has default, hover, `focus-visible`, active (pressed), disabled, loading (where it applies) and error (fields) states.

## Motion

### Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--motion-fast` | 140 ms | Hover and press, colour changes, menus closing |
| `--motion-base` | 200 ms | Things appearing: dialogs, menus, messages, the tab underline |
| `--motion-slow` | 320 ms | The upper limit for anything larger. Nothing longer, except the 1.6 s highlight fade. |
| `--ease-enter` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entering (fast start, soft landing) |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Leaving |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Moving between two states |
| `--ease-spring` | `cubic-bezier(0.34, 1.4, 0.64, 1)` | Small pressables only (the checkbox tick) |

### Utilities

`animate-enter`, `animate-fade-in`/`-out`, `animate-dialog-in`/`-out`, `animate-pop-in`/`-out`, `animate-check`, `animate-shake`, `animate-skeleton`, and the `.flash-new` class.

From script: `useCountUp` in [`src/lib/motion.ts`](../src/lib/motion.ts), and `prefersReducedMotion()`.

### Rules

1. **Animate only `transform` and `opacity`.** The one exception is the highlight fade, which animates a background colour.
2. **Keep movement small:** 2–4 px of travel, scaling from 0.96 to 1.
3. **Never block.** Nothing waits for an animation to finish: data and clicks go through at once.
4. **Respect `prefers-reduced-motion`.** All animations and transitions collapse to nothing, except spinners, which keep turning slowly because they show progress.
5. **Use the same motion for the same kind of change everywhere.** Use the utilities; don't write new keyframes in a component.
6. **No bouncing, flashing or loops,** except loading indicators.

## Keyboard

- Ctrl+K or Cmd+K (or `/` when not typing) jumps to the global search.
- Arrow keys move through search results; Enter opens one.
- Esc closes dialogs, menus and the mobile side menu.
- Barcode scanners work from any screen.

## Responsive layout

### Breakpoints

These are Tailwind's defaults; don't add others.

| Name | Width | Layout |
| --- | --- | --- |
| phone | below 768 px (`max-md:`) | Bottom bar plus a drawer menu, cards instead of tables, dialogs as bottom sheets, filters in a sheet, page actions in a bar above the bottom bar |
| tablet | `md` 768 px and up | The full app with the icon menu; controls grow to 44 px on touch screens (`pointer-coarse:`) |
| laptop and up | `lg` 1024, `xl` 1280, `2xl` 1536 | The full app; the menu can stay open beside the page |

### Deciding what a phone shows

That decision lives in one place, [`src/app/device.ts`](../src/app/device.ts). Use `useIsPhone()` for things that should not load on a phone; use `max-md:` classes for layout. Each route is one of:

- **Full:** works as on a computer: the dashboard, My Tests and test detail, Approvals and report detail, Account.
- **Simplified** (the default): key fields as cards, filters in a sheet, the main actions in the action bar.
- **Desktop-only:** booking, the quotation editor, planning, Masters, Admin, lab setup, Analytics, MIS reports. A phone shows "Best on a larger screen" with Email me the link, Copy link and Continue anyway, so nothing is blocked.

To add a desktop-only route, add it to `MOBILE_RULES` with a one-line summary.

Hiding is for layout only: the API enforces permissions the same on every device.

### Phone patterns

| Pattern | Where |
| --- | --- |
| Bottom bar (the person's four most useful places, then More) | `Layout.tsx`, ordered by `BOTTOM_NAV_PRIORITY` |
| Drawer menu with desktop-only items marked | `Layout.tsx` |
| Search as an icon that opens a full-width bar | `Layout.tsx`, `GlobalSearch.tsx` (it stays mounted, so barcode scanners keep working) |
| Cards instead of tables: the first four named columns, buttons and ticks, then More details | `DataTable.tsx` |
| Filters behind a Filters button with a count, in a sheet with Clear filters and Show results | `MobileFilters` in `components/shared.tsx` |
| Bottom-sheet dialogs: full width, a grab handle, swipe down to close | `Dialog`, `ConfirmDialog` |
| Page actions in a sticky bar above the bottom bar | `PageHeader` (`data-page-actions`) |
| Share button on record pages (Web Share API) | `PageHeader` |
| Quick actions and Scan a label (camera, where the browser can read codes) | `DashboardPage.tsx`, `components/CameraScan.tsx` |
| Tap to call or email a contact | Customer detail |
| Scroll position kept when going back | `Layout.tsx` |

### Rules

- **No horizontal page scroll at any width.** A grid that only sets columns from `md:` up needs `grid-cols-[minmax(0,1fr)]` below that, or long content widens it. A wide table must sit in its own `overflow-x-auto` box.
- **Use `dvh`, not `vh`,** so the phone's browser bars don't hide content.
- **Respect safe areas:** the header and bottom bar pad with `env(safe-area-inset-*)`.
- **Inputs are 16 px on phones,** so iOS doesn't zoom in when one is tapped.
- **Use the right keyboard:** `type="tel"`, `type="email"` or `inputMode` on every phone, email and number field.
- **Size components to their own space when they appear in different places:** container queries such as `@container` on the dashboard tiles.

### Installed app (PWA)

- `public/manifest.webmanifest` and `public/icons/*` are a neutral icon and name. The UI container's entrypoint writes the lab's name from `APP_NAME`, which the deploy sets from `BRAND_NAME`. The theme colour follows the lab's menu colour at runtime.
- `public/sw.js` only serves an offline page (`public/offline.html`) when the network is down. It never caches pages, scripts or API responses, so no lab data stays on the device and every release is picked up at once. It is registered in production builds only.
- The CSP allows `manifest-src 'self'` and `worker-src 'self'`.
