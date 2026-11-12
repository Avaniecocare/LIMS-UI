---
title: White-label and branding
description: How one set of images serves every laboratory under its own name, where branding is stored, how BRAND_NAME is used, and how the help site is branded.
sidebar:
  order: 7
---

The LIMS is white-label: the same images run every laboratory, and each one shows only its own name, logo and colours. No lab's name or details exist in the code, in an image, or at build time.

## Where branding lives

| What | Where it is set | Stored in |
| --- | --- | --- |
| Lab profile: legal and trading names, addresses, GSTIN, PAN, bank account, accreditation, document prefix, support and legal links, privacy contact | Admin, **Lab profile** | The database |
| Branding: app name, colours, logo, browser icon, sign-in picture and line, "Powered by" | Admin, **Branding** | The database (images in file storage) |
| Customer email wording | Admin, **Email templates** | The database |
| The product's own name, before the lab sets one | `BRAND_NAME` on the server | Environment |
| The app's name on a phone's home screen | `APP_NAME` on the UI container (the deployment sets it from `BRAND_NAME`) | Environment |

The lab's administrator sets all of this in the setup wizard after the first sign-in, then in **Admin**. Changes apply at once in every process, with no restart: each process keeps the profile in memory and reloads it when any process saves. Upgrades never overwrite it. See [Lab profile](/help/admin/lab-profile/) and [Branding](/help/admin/branding/).

Editing the lab profile needs the password confirmed, because it prints on every invoice and report, and every change is audited with the previous values.

## `BRAND_NAME`

`BRAND_NAME` is the only branding value outside the app. It is:

- the name shown on a new install, before the administrator sets the lab's own name and app name;
- the name used in the "Powered by" line;
- in the deployment, also the default for the UI container's `APP_NAME`.

A fresh install starts from `BRAND_NAME` with neutral colours and the lab's initials as its logo.

## How the app gets its branding

The web app loads with no branding of its own. On start it calls:

```http
GET /api/v1/public/branding HTTP/1.1
Host: api.lims.example.com
```

```json
{
  "productName": "…",
  "companyName": "…",
  "logoUrl": "https://api.lims.example.com/api/v1/public/branding/logo?v=3",
  "faviconUrl": "https://api.lims.example.com/api/v1/public/branding/favicon?v=2",
  "loginImageUrl": null,
  "loginTagline": "…",
  "poweredBy": true,
  "poweredByName": "LIMS",
  "primaryColor": "#0f4c81",
  "accentColor": "#0e9f6e",
  "surfaceColor": "#f5f6f8",
  "navColor": "#f5f6f8",
  "supportEmail": "lab@example.com",
  "supportPhone": "…",
  "termsUrl": null,
  "privacyUrl": null,
  "privacyContactEmail": "privacy@example.com"
}
```

This endpoint needs no sign-in, so it carries **no private details**: no GSTIN, PAN or bank account. Images are served from `/api/v1/public/branding/logo`, `/favicon` and `/login`, with a version in the address so browsers fetch a new picture as soon as it changes.

The app then applies the colours. Text on brand-coloured surfaces is worked out from the colour's brightness, so any colour stays readable. In dark mode the lab's colours are lightened. Chart colours are fixed and do not follow the brand, so charts keep their contrast for colour-blind readers.

## Documents and emails

PDFs (quotations, reports, invoices, challans) and emails use the lab profile and branding as they are when produced. Issued documents keep the details stored when they were issued: changing the lab's address later does not change an issued invoice.

## One image, many laboratories

The deployment's white-label check starts the same images as two fictional laboratories and confirms that each answers only with its own name, never the other's, and that its public branding carries no private fields:

```bash
LIMS_VERSION=<version> LIMS_UI_VERSION=<version> /opt/lims-deploy/scripts/white-label-check.sh
```

## Older installs

Before the admin panel, branding came from `COMPANY_*` variables and a `branding/` folder. If those are present when the lab profile is still empty, they are checked and imported once, images included. After that the app is the only place to change them.

## The help site

The help site (these pages) is built with its own branding, from environment variables at build time, so each lab's copy can carry its own name and colour:

| Variable | Default | What it does |
| --- | --- | --- |
| `DOCS_PRODUCT_NAME` | `LIMS` | Name in the site title, for example "LIMS help". |
| `DOCS_PRIMARY_COLOR` | `#1f4e79` | Accent colour, as `#rrggbb`, used in light and dark themes. Any other value falls back to the default. |
| `DOCS_LOGO` | A neutral logo | Path to the logo file. |
| `DOCS_SITE_URL` | `https://lims.example.com` | The site's public address. |
| `DOCS_INDEXABLE` | `false` | `true` lets search engines index the site. Otherwise every page asks not to be indexed. |

The site is served at `/help/` on the app address. Its **Ask AI** panel reads the API address from the same runtime `config.js` the app uses.

To build a lab's own copy, pass the `DOCS_*` values as build arguments to the UI image (`docker build --build-arg DOCS_PRODUCT_NAME="Acme LIMS" --build-arg DOCS_PRIMARY_COLOR="#0f4c81" …`). The image builds the site, checks its links, and serves it at `/help/`.

## Related

- [Environment variables](/help/install/environment/)
- [Branding](/help/admin/branding/)
- [Setup wizard](/help/admin/setup-wizard/)
