---
title: Documents
description: Every PDF and Excel file the system produces, where to find its button, and who may produce it.
sidebar:
  order: 18
---

The LIMS produces its letters, labels, reports, invoices and exports as files. This page lists each one, where its button is, and the permission it needs.

## How documents are produced

1. **Goal**: get a PDF or Excel file.
2. **Who can do it**: depends on the document (see the table below).
3. **Steps**:
   1. Click the document's button.
   2. A new tab opens straight away, saying *Preparing the document…*.
4. **Result**: when the file is ready, usually within seconds, the tab shows it. The file is also kept with its record (for example under **Generated files** on a job's **Documents** tab) and in [Files](/help/features/files/).
5. **Related**: [Files](/help/features/files/).

If your browser blocks the new tab, a message *… is ready* appears with an **Open** button instead.

:::note
- If a document takes more than two minutes, you see *This is taking longer than expected. Please try again shortly.*
- Each person can request up to 30 documents a minute. Beyond that: *Too many documents requested in the last minute. Wait a moment and try again.*
- A document that belongs to a module your lab has turned off (Admin → Modules) is refused.
:::

## Every document

### Booking and samples

| Document | What it contains | Button and place | Who can produce it |
| --- | --- | --- | --- |
| **Sample request form** (SRF) | Job header (job number, received, priority, customer, contacts, letter, PO, receipt mode, report issue details), the samples with their tests, deviations, and signature lines for *Received by* and *Customer representative*. | **Sample request form** on the job's **Documents** tab | `customers.view` |
| **Sample Acknowledgement** | A letter to the customer: the job number and date received, the samples and tests, deviations, and optional photos of the samples as received (up to 12). | **Acknowledgement** on the job's **Documents** tab; **Preview letter** in **Email the acknowledgement** | `customers.view` (sending also needs `jobs.create` or `jobs.edit`) |
| **Sample labels** | One 70 × 40 mm label per page: QR code of the sample number, sample and job numbers, description, date received, **URGENT** / **RETURNABLE**. No customer name. | **Label** on a sample card; **All labels** on the **Documents** tab | `jobs.view` |
| **Customer letter** | The captured page images combined into one PDF, in order. | **Combine pages into PDF** on the **Documents** tab | `jobs.create` or `jobs.edit` |

See [Jobs and samples](/help/features/jobs-samples/).

### Planning and testing

| Document | What it contains | Button and place | Who can produce it |
| --- | --- | --- | --- |
| **Job Card** | One box per planned test: test, due date, urgency, sample, method, analyst, instrument, analysis mode, instructions, technical data, parameters, and blank stage boxes. The customer's name only when [`controls.impartiality`](/help/admin/settings/#controls.impartiality) is off. | **Job card** on [Planning](/help/features/planning/) or the job's **Documents** tab | `planning.view` or `tests.viewAll` |
| **Test Data Sheet** | One test's stages (completed, by whom), results with unit and working, observations, remarks and notes. | **Print test data** on the test page | `tests.viewAll`, or `tests.work` for a test assigned to you |

See [Testing](/help/features/testing/).

### Reports

| Document | What it contains | Button and place | Who can produce it |
| --- | --- | --- | --- |
| **Test Report** (final PDF) | The signed report. Produced automatically after approval; never by hand. | **Download revision** *n* on the report page | `reports.view` |

Before approval, the report is shown as an in-page **Preview** headed *Test Report — DRAFT, NOT FOR ISSUE*. After signing, the final PDF is prepared in the background; if it is late, people with `reports.approve` or `reports.issue` can prepare it again. See [Reports](/help/features/reports/) and [Approvals](/help/features/approvals/).

### Quotations

| Document | What it contains | Button and place | Who can produce it |
| --- | --- | --- | --- |
| **Quotation** or **Proforma Invoice** | One version of a quotation: tests and rates, totals, and terms. The title is the version's document title; new quotations start from [`quotation.defaultTitle`](/help/admin/settings/#quotation.defaultTitle). | **PDF** on each version card of the quotation | `quotations.view` (Orders and quotations module) |

A sent version's PDF is produced from what was frozen when it was sent, so it does not change later. See [Orders and quotations](/help/features/orders-quotations/).

### Dispatch

| Document | What it contains | Button and place | Who can produce it |
| --- | --- | --- | --- |
| **Dispatch Challan** | The dispatch number, job, customer, address and the items sent. | **Challan** on a dispatch row | `dispatch.view` (Dispatch module) |

See [Dispatch](/help/features/dispatch/).

### Billing

| Document | What it contains | Button and place | Who can produce it |
| --- | --- | --- | --- |
| **Tax Invoice** | The invoice with its lines, GST and terms. A draft prints as *Tax Invoice — DRAFT*. | **PDF** on the invoice page | `invoices.view` (Billing module) |
| **Credit Note** | The credit note, the invoice it corrects, and the reason. | **PDF** on a credit note row of the invoice | `invoices.view` (Billing module) |
| **Statement of Account** | One customer's transactions for a period (date, type, reference, debit, credit, running balance), the closing balance, ageing of outstanding invoices, and your bank details. | **Produce statement** on [Due invoices](/help/features/due-invoices/) | `invoices.view` (Billing module) |

See [Invoices and payments](/help/features/invoices-payments/).

### Excel and PDF exports

| Export | What it contains | Button and place | Who can produce it |
| --- | --- | --- | --- |
| **Customers** (Excel) | Every customer: CRN, name, GSTIN, PAN, state, state code, credit days, active. | **Export Excel** on [Customers](/help/features/customers/) | `customers.view`, and your password |
| **Due invoices** (Excel) | Every unpaid invoice under the current filters: customer, CRN, invoice number and date, due date, amount, paid, credited, balance, days overdue, ageing. | **Excel** on [Due invoices](/help/features/due-invoices/) | `invoices.view`, and your password (Billing module) |
| **Master lists** (Excel) | One master list, such as tests, specifications or rates. | **Export Excel** on each Masters list | The master's view permission (`masters.view`, or `rates.view` for rates) |
| **MIS reports** (Excel or PDF) | One MIS report under its filters. PDF is landscape and limited to 5,000 rows; Excel to 200,000. | **Excel** and **PDF** on the report | The report's permission (`mis.view` or `mis.commercial`) (Analytics and MIS reports module) |

See [MIS reports](/help/features/mis-reports/).

:::caution
The customer and due-invoice exports put personal or money data for everyone in one file. You are asked to **Confirm your password** first (not again for ten minutes), and administrators are told the export happened.
:::

People without `customers.view` get MIS exports without the customer columns.

## Documents sent to customers

Some documents also go out by email or WhatsApp, with the PDF attached:

| Document | Sent from | Permission |
| --- | --- | --- |
| Sample Acknowledgement | Job page, **Email acknowledgement**; or at booking | `jobs.create` or `jobs.edit` |
| Quotation | Quotation page | `quotations.send` |
| Test Report | Report page, when issued or emailed again | `reports.issue` |
| Tax Invoice | Invoice page, **Email** | `invoices.edit` |
| Payment reminder | Invoice page or Due invoices | `reminders.send` |

See [Email](/help/features/email/) and [WhatsApp](/help/features/whatsapp/).

## What every PDF shares

- Your lab's letterhead from Admin → Lab profile and Branding, and your logo as a faint watermark (labels have none, so their QR code scans easily).
- A footer with page numbers (*Page n of m*), except on labels.
- Dates and amounts in Indian formats, on Indian time.

<!-- screenshot: documents-pdf-letterhead -->

## On a phone

Document buttons work the same way on a phone: the file opens in a new tab. MIS reports and Masters are desktop-only screens, so their exports are best done on a computer. See [Using the LIMS on a phone](/help/guides/on-a-phone/).

## Tips

- Need the same file again? Open it from **Generated files** on the record or from [Files](/help/features/files/) instead of producing it again.
- Labels are sized for label printers; print at 100% scale.

## Limitations

- Only the person who requested a document sees it open as it finishes. Others find the stored file in Files, where the record's permissions apply.
- Exports that belong to no record (customer list, MIS reports, master lists, due invoices) are visible in Files only to the person who made them.
- The final test report PDF cannot be produced by hand; it comes from approval.

## Related

- [Jobs and samples](/help/features/jobs-samples/)
- [Planning](/help/features/planning/)
- [Reports](/help/features/reports/)
- [Files](/help/features/files/)
- [Email](/help/features/email/)
