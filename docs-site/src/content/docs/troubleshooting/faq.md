---
title: Frequently asked questions
description: Short answers to the questions lab staff, administrators and IT ask most often, with links to the full pages.
sidebar:
  order: 3
---

## For everyone

### I forgot my password. What do I do?

Select **Forgot password** on the sign-in page and follow the link in the email. Each link works once. If no email arrives, ask your administrator to reset your password; you then choose a new one at your next sign-in.

### Why was I signed out?

Sessions end after 30 minutes without activity and always 12 hours after you signed in. Changing your password signs you out everywhere. See [Troubleshooting](/help/troubleshooting/#signing-in).

### Can I see where I am signed in?

Yes. Open **My account** from the menu under your name. **Where you're signed in** lists your sessions: select **Sign out** next to one, or **Sign out everywhere else**. **Recent sign-ins** shows your last 50 sign-ins and failed attempts.

### Why can't I see a page my colleague can see?

Pages and buttons follow your role. If you need a page for your work, open it and use **Request access**. See [Permissions](/help/admin/permissions/).

### Why does it ask for my password again?

Some changes, such as giving roles or editing the lab profile, and bulk exports, need your password confirmed. One confirmation covers 10 minutes.

### Someone changed the record while I was editing. Did I lose my work?

Your save was refused so that it did not overwrite theirs. The latest version is loaded; make your change again. See [Troubleshooting](/help/troubleshooting/#changed-by-someone-else).

### Can I use the app on my phone?

Yes. On a phone the app shows a phone layout, and lists show as cards. A few screens built for a computer show "Best on a larger screen" with **Continue anyway**. Tablets get the full app. You can also add it to your home screen.

### How do I take sample photos with my phone?

Use **Use phone** next to the photos on the computer and scan the QR code with your phone. No sign-in is needed on the phone. See [Send photos from your phone](/help/features/phone-upload/).

### Does the app keep lab data on my phone?

No. Pages and data always come from the server. When there is no connection, the app shows only a short "You are offline" page.

### Can I scan barcodes?

Yes, with a scanner in keyboard mode, from any screen. Make sure no text box has the cursor. See [Search and scanning](/help/features/search-scanning/).

### Why does my document open in a new tab that says "Preparing the document…"?

PDFs and Excel files are made on the server in the background. The tab fills in when the file is ready, usually within seconds. See [Documents](/help/features/documents/).

### Is dark mode available?

Yes. Open the menu under your name and choose **Light**, **Dark** or **Same as this device** under **Appearance**. The choice is saved in your browser, and the lab's colours are adjusted to stay readable.

### How can a customer check that a report is genuine?

Each approved report carries a QR code and a link to a verification page that needs no sign-in. The customer can also choose the PDF file there to check it is the issued copy; the file never leaves their device. See [Reports](/help/features/reports/).

## For administrators

### Where do I change the lab's name, logo or GSTIN?

In **Admin**, **Lab profile** and **Branding**. Changes apply at once, with no restart. Issued documents keep the details they were issued with. See [Lab profile](/help/admin/lab-profile/) and [Branding](/help/admin/branding/).

### Can we turn off parts of the system we do not use?

Yes. In **Admin**, **Modules** you can turn off orders and quotations, dispatch, billing, the file library, photos from a phone, analytics and MIS reports, quality management and WhatsApp. The core lab workflow cannot be turned off. Nothing is deleted. See [Modules](/help/admin/modules/).

### Can we change the wording of customer emails?

Yes, in **Admin**, **Email templates**, with a live preview. Any email you have not changed keeps the product's wording and gets improvements in upgrades.

### Why are emails not arriving?

Look at the record's emails to see whether each was sent or failed, and why. Send a test from the setup wizard's **Email** step. See [Troubleshooting](/help/troubleshooting/#emails-not-arriving).

### Why do WhatsApp messages stay at "sent"?

Delivery and read receipts need two more server settings. The messages are delivered normally without them. See [Webhooks](/help/developers/webhooks/).

### Can someone approve their own results?

No. The person who entered results cannot approve them, and a report's reviewer and signatory must be different people. See [Permissions](/help/admin/permissions/).

### Is there an audit trail?

Yes. Changes are recorded in the audit log, which is append-only at database level: even the app cannot change or delete entries. **Admin**, **Audit log** shows it.

## For IT

### What does the server need?

Linux with Docker and the Compose plugin, about 2.8 GB of memory per laboratory plus the operating system, disk for data and backups, three domain names and HTTPS. See [Server requirements](/help/install/requirements/).

### Can several laboratories share one server?

Yes. Each gets its own containers, database, cache, file storage and passwords. Only the reverse proxy is shared. See [How the system is built](/help/install/).

### Does it need the internet?

Only for email, image downloads, certificates on cloud servers, and optional services (PIN code lookup, error tracking, WhatsApp, the AI assistant). Everything else runs on the lab's own network. See [Server requirements](/help/install/requirements/#network-access).

### How are backups taken?

Automatically every night at 02:00: the database, all files and the server settings, optionally encrypted and copied off-site. See [Backup and restore](/help/install/backup-restore/).

### How do I upgrade?

Run `upgrade.sh` with the new versions. It backs up first and rolls back by itself if the new version will not start. See [Upgrades and rollback](/help/install/upgrades/).

### Is there an API?

Yes, a REST API under `/api/v1`, described by an OpenAPI document. Everything the app does goes through it. See [API overview](/help/developers/).

### How do we get the demo data out before going live?

Run `remove-demo.sh --yes`. See [First run](/help/install/first-run/#remove-demo-data-before-going-live).

## Related

- [Troubleshooting](/help/troubleshooting/)
- [Error messages](/help/troubleshooting/error-messages/)
