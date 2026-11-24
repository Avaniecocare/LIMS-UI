---
title: Release notes
description: What changed in each stage of the LIMS, in plain language, for lab staff, administrators and IT.
sidebar:
  order: 1
---

The LIMS is made of three parts that are released together: the server (API and worker), the web app, and the deployment scripts. These notes summarise their changes by milestone, newest first. The current version of the server and the web app is **0.1.0**.

## Looking after the system (November 2026)

- **Admin** has three new tabs: **System status** (is each part working), **Emails** (every email sent and failed, with **Try again**) and **Data export** (a copy of all records and files, for seven days).
- When an email fails for good, whoever sent it and the administrators are notified.
- The audit log can be searched by person, record or reason, and exported to Excel.

## Quality pass (12 November 2026)

No change to how the app works. Behind the scenes:

- Code formatting and checks for unused code now run automatically on every change.
- A small fix to the way the app escapes text in emails and PDFs, so every place does it the same way. Documents look the same.
- A dependency used for Excel files was updated to a version with no known security advisories.
- Problems in background tasks that were previously ignored silently, such as a failed notice to other servers that the lab profile changed, are now written to the log. The request still succeeds.

## Administration, quality and integrations (November 2026)

### The lab's details move into the app

- The lab's name, legal details, GSTIN, PAN, bank account, accreditation, document prefix, support and legal links are now entered in **Admin**, **Lab profile**, not in server files. Logo, colours, browser icon, sign-in picture and "Powered by" are in **Admin**, **Branding**.
- Changes apply at once, with no restart, and upgrades never overwrite them.
- A new install takes the first administrator through **Set up your laboratory**: lab profile, branding, a starting test catalogue for the lab's type, the team, a test email and a review.
- Starting catalogues are built from public standards for water and wastewater, ambient air and stack, soil, noise, and materials and metals. They add only what is missing and carry no prices.
- Older installs have their settings imported once, logo included.

### Email templates and modules

- Customer emails (samples received, quotation, test report, tax invoice, payment reminder, password reset) can be reworded in **Admin**, **Email templates**, with a live preview.
- Parts of the system can be turned off in **Admin**, **Modules**: orders and quotations, dispatch, billing, the file library, photos from a phone, analytics and MIS reports, quality management and WhatsApp. Nothing is deleted when a module is off.

### Quality management (ISO/IEC 17025)

- A new **Quality** section with an equipment log (calibrations, checks, maintenance, repairs, breakdowns) and due dates, staff competency and training, and non-conformance and CAPA.
- Labs can block overdue instruments and require analysts to be authorised for a test.
- Anyone at the bench can **Report a problem** from a test or job and follow its progress on their account page.

### Privacy (DPDP Act 2023)

- **Admin**, **Privacy** keeps a register of data requests with deadlines, finds where an email address appears, erases a contact's personal details, and logs breaches with the 72-hour deadline.

### WhatsApp

- Reports, invoices, samples-received letters and payment reminders can be sent on WhatsApp through the lab's own WhatsApp Business number, using its approved templates.
- The sender confirms the customer agreed to WhatsApp messages.
- Delivered and read ticks appear when the server is set up for them.

### Files and customer history

- A **Files** screen for the lab's own documents in folders, with drag-and-drop upload, and a read-only view of every file the system made.
- The customer page becomes the customer's history: quotations, jobs, tests, reports, invoices and payments, files and activity, each shown only to people allowed to see it.
- Forms fill themselves where possible: a GSTIN fills state, GST code and PAN; a PIN code fills city and state.

### Photos

- **Use phone**: show a QR code on the computer and send photos from a phone, without signing in on the phone. Links last 15 minutes.
- Sample photos can be printed on reports, in their own section, and on the samples-received acknowledgement.
- Photos are shrunk on the device before upload.

### Security and access

- People can ask for access to a page they cannot open; administrators answer from **Admin**, **Access requests**.
- Sensitive changes need the password confirmed.
- A list of where you are signed in, with sign-out for each session, and your recent sign-ins.
- One answer for every failed sign-in, limits per network, and sessions that end 12 hours after sign-in.

### The web app

- Dark mode, with **Light**, **Dark** or **Same as this device**.
- A phone layout: lists become cards, and screens built for a computer say so with **Continue anyway**.
- An offline page instead of the browser's error when the connection drops. No lab data is kept on the device.

### Deployment

- Nightly backups are installed with every new laboratory, and can be encrypted and copied off-site, with an alert when a backup does not arrive.
- Restores never touch the live database until the backup has been checked.
- Each container has a memory cap, and container logs can no longer fill the disk.
- The running app no longer holds the database owner's password.

## Fixes after integration (4 and 5 November 2026)

- Dashboard numbers now match the reports they link to.
- A result that cannot be accepted is refused with a message on its input, instead of being blanked.
- Report lists filter on the newest revision.
- Documents that name a customer need customer access; Sample Reception converts quotations without seeing prices; a temporary password allows nothing but changing it.
- Signatories can upload a signature image.
- The background worker stops cleanly and recovers if the PDF renderer crashes.
- PDF wording tidied after review.

## Milestone 11: Deployment

- Every laboratory runs as its own set of containers, with its own database, cache, file storage and passwords, behind one reverse proxy with automatic TLS certificates.
- Scripts to provision, deploy, back up, restore, upgrade and roll back a laboratory.
- An automatic check runs the whole life of two fictional laboratories, from first setup to rollback, against real images.
- Administrator and role-by-role user guides.

## Milestones 8 to 10: Dispatch, cancellation, invoices and dashboards

- Dispatch records and challans, returnable samples and sample retention.
- Cancellation of samples and tests with a preview of what it affects.
- Tax invoices with GST, payments, advances, credit notes, due invoices with ageing, and payment reminders.
- 24 MIS reports, dashboards built on the same report definitions, and notifications.
- In the web app: the Dispatch, Invoices, Payments, Due invoices, Reports and Dashboard screens, with charts on a separate Analytics page. Every chart also has a table view.
- Accessibility checks on every main screen.

## Milestones 6 and 7: Result entry, approvals and reports

- A technician's worklist, stages completed in order, and calculations done on the server with versioned formulas.
- Pass or fail against single and dual grades.
- Approval by the Head of Department with separation of duties.
- Report drafts made automatically, review, sign-off with an electronic signature, ULR numbers, revisions, withholding until payment, and the report PDF.
- In the web app: My tests with automatic saving, approvals with a live report preview, signing, issue and revision, cancellation, the notification bell and the forced password change.

## Milestones 3 to 5: Orders, quotations, booking and planning

- Enquiries and quotations with versions.
- Job and sample booking, the sample request form, the acknowledgement and QR labels.
- Global search and barcode scanning.
- Planning, assignment with workload, due dates and job cards.
- GST calculation and the letterhead used on every PDF.
- In the web app: webcam capture at booking and letters attached to jobs.

## Milestone 2: Masters and customers

- Masters (tests, parameters, methods, specifications, instruments and more) with history and Excel import and export.
- A safe formula engine with versions.
- Rates, customers, attachments, and PDF and Excel files made in the background.
- Demo data that can be removed in one step.

## Milestone 1: Foundation

- Sign-in, roles and permissions, settings, the append-only audit log, document numbering, file storage and email.
- The web app's runtime branding, a layout that follows each person's role, the first-run screen and the Admin screens.
- The published API description and automatic checks on every change.

## Related

- [Upgrades and rollback](/help/install/upgrades/)
- [API overview](/help/developers/)
