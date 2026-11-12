---
title: MIS reports
description: Open the lab's operational and commercial reports, filter them, save filters and export them to Excel or PDF.
sidebar:
  order: 13
---

**Reports** is the catalogue of MIS (management information) reports: pending samples, TAT, planning, results, performance, collectors, returnable samples, quotations, invoices with GST, payments, outstanding and ageing, and report revisions. Each report is a table you can filter and export to Excel or PDF.

:::note
This page is about MIS reports. For the test reports your lab issues to customers, see [Test reports](/help/features/reports/).
:::

## Who can use it

| Permission | Reports you see | Default roles |
| --- | --- | --- |
| `mis.view` | Operational reports (samples, planning, testing, performance, collectors, quality) | Sample Reception, Lab Manager / Planner, Head of Department, Management, Admin |
| `mis.commercial` | Commercial reports (quotations, invoices, payments, outstanding) | Accounts, Management, Admin |

The catalogue shows only the reports your permissions allow. Some parts of a report also depend on other permissions:

- The **Customer** column, and the **Customer filter**, appear only if you hold `customers.view`. Without it the column is left out of the screen and of every export.
- The **Department filter** appears only if you hold `masters.view`.
- The **Technician filter** appears only if you hold `planning.view`.

Reports belong to the **Analytics and MIS reports** module. If your lab has turned it off (Admin → Modules), **Reports** disappears from the menu and its pages show **This part of the system is turned off**.

## Where to find it

Select **Reports** in the menu. The catalogue groups reports into cards: **Samples**, **Performance**, **Planning**, **Testing**, **Collectors**, **Commercial** and **Quality**. Dashboard and Analytics tiles also open these reports with their filters already set.

<!-- screenshot: mis-reports-catalogue -->

## The reports

| No. | Report | Group | Permission | Filters |
| --- | --- | --- | --- | --- |
| 1 | **Pending Sample Report** | Samples | `mis.view` | Date, customer, department, technician, status |
| 2 | **TAT Crossed Sample Report** | Samples | `mis.view` | Customer, department, technician |
| 3 | **Performance Analysis: Machine-wise** | Performance | `mis.view` | Date, department |
| 4 | **Performance Analysis: Technician-wise** | Performance | `mis.view` | Date, department, technician |
| 5 | **Daily Sample Collection Summary** | Samples | `mis.view` | Date, customer |
| 6 | **Daily Sample Collection Full** | Samples | `mis.view` | Date, customer |
| 7 | **Daily Sample Detail** | Samples | `mis.view` | Date, customer |
| 8 | **Daily Plan Detail** | Planning | `mis.view` | Date, customer, department, technician |
| 9 | **Pending Plan Detail** | Planning | `mis.view` | Customer, department |
| 10 | **Daily Test Result Detail** | Testing | `mis.view` | Date, customer, department, technician |
| 11 | **Test Result Pending Detail** | Testing | `mis.view` | Customer, department, technician, status |
| 12 | **Pending Tests Summary** | Testing | `mis.view` | Customer, department, technician |
| 13 | **Sample Status Detail** | Samples | `mis.view` | Date, customer, department, status |
| 14 | **Daily Sample Collector: Detail** | Collectors | `mis.view` | Date, customer |
| 15 | **Daily Sample Collector: Summary** | Collectors | `mis.view` | Date, customer |
| 16 | **Monthly Sample Collector: Summary** | Collectors | `mis.view` | Date, customer |
| 17 | **Technician Analysis** | Performance | `mis.view` | Date, department, technician |
| 18 | **Pending Test Detail by Test** | Testing | `mis.view` | Customer, department, technician |
| 19 | **Complete Test Detail** | Testing | `mis.view` | Date, customer, department, technician |
| 20 | **Sample Returnable Status** | Samples | `mis.view` | Date, customer |
| 21 | **Quotation Register** | Commercial | `mis.commercial` | Date, customer, status |
| 22 | **Invoice Register with GST Summary** | Commercial | `mis.commercial` | Date, customer |
| 23 | **Payment Register** | Commercial | `mis.commercial` | Date, customer |
| 24 | **Outstanding and Ageing Report** | Commercial | `mis.commercial` | Customer |
| 25 | **Report Revisions Issued** | Quality | `mis.view` | Date, customer |

A few reports worth knowing:

- **TAT Crossed Sample Report** lists open tests past their due date, with **Days late**.
- **Technician Analysis** shows, per technician, tests **Assigned**, **Submitted**, **Approved**, **Sent back** and the **First-pass %**.
- **Invoice Register with GST Summary** shows **GSTIN**, **Place of supply**, **Taxable**, **CGST**, **SGST**, **IGST**, **Round off** and **Total** for each invoice, ready for GST returns.
- **Payment Register** shows each receipt with its **Mode**, **Reference**, **Amount** and what is still **On account** (not yet applied to an invoice).
- **Outstanding and Ageing Report** shows every unpaid issued invoice with **Balance**, **Days overdue** and its **Ageing** bucket.

## Open and filter a report

**Goal**: see the rows of one report for the records you care about.

**Who can do it**: anyone with the report's permission (`mis.view` or `mis.commercial`).

**Steps**

1. Select **Reports** in the menu.
2. Select the report's name in its group card.
3. Set the filters the report offers:
   - **Date**: the first and last date. Dates are whole days in Indian time.
   - **Customer filter**: start typing a customer's name and pick it, or leave **All customers**.
   - **Department filter**: pick a department, or leave **All departments**.
   - **Technician filter**: pick a technician, or leave **All technicians**.
   - **Status filter**: pick a status, or leave **All statuses**.
4. Use the pager under the table to move through the pages or change how many rows a page shows.

**Result**: the table shows the matching rows. When nothing matches it says **No records for these filters**. The filters are kept in the page address, so a reload or a shared link shows the same rows.

<!-- screenshot: mis-reports-report-view -->

:::note
If you open a report with a date filter from the menu, it starts with the current month (the first of the month to today). If you open it from a Dashboard tile, it shows exactly what the tile counted, which may be all dates.
:::

The **Status filter** offers:

| Report | Statuses |
| --- | --- |
| **Pending Sample Report**, **Sample Status Detail** | Received, Planned, In Testing, Reporting, Completed, Cancelled |
| **Test Result Pending Detail** | Assigned, In Progress, On Hold |
| **Quotation Register** | Draft, Sent, Accepted, Rejected, Expired |

## Save a filter

**Goal**: come back to the same filters in one click.

**Who can do it**: anyone who can open the report. Saved filters are your own; nobody else sees them.

**Steps**

1. Set the filters you want.
2. Select **Save filter**.
3. In **Save this filter**, type a **Name**.
4. Select **Save**.

**Result**: a toast says **Filter saved**, and a button with that name appears next to **Save filter**. Select it to apply the filters again. Select **×** beside it to delete it.

| Field | What it means | Required |
| --- | --- | --- |
| **Name** | The name shown on the saved filter's button | Yes |

## Export to Excel or PDF

**Goal**: take the report out of the system, for a meeting, an auditor or your accountant.

**Who can do it**: anyone who can open the report.

**Steps**

1. Open the report and set the filters.
2. Select **Excel** or **PDF** at the top right.

**Result**: a new tab opens with **Preparing the document…** and then shows or downloads the file. If your browser blocks the tab, a toast says the document is ready, with **Open**.

What the export contains:

- The same filters you set on screen: date, customer, department, technician and status.
- **All** matching rows, not only the page you are looking at.
- **Excel**: one sheet named after the report. Money columns are numbers you can add up.
- **PDF**: landscape A4, on your lab's letterhead, with the report title, the period, the time it was generated, the number of rows, and the table.

:::caution
A PDF can hold at most 5,000 rows. Above that the export is refused with **This report has more than 5,000 rows, which is too many for a PDF. Narrow the filters or export to Excel.** An Excel export holds up to 200,000 rows.
:::

Keep the file you downloaded: to get a newer copy, export again.
<!-- TODO(verify): exports are stored as files, and the file library is meant to show an export to the person who made it, but the worker stores them without a creator (no request context in worker/worker.ts), so they may not appear in Files at all. -->

## On a phone

**Reports** and each report page are "Best on a larger screen" pages on a phone. Select **Continue anyway** to open them there, or **Email me the link** or **Copy link** to open them later on a computer. If you continue, each row shows as a card with its first four columns, and the rest under **More details**.

See [Using the LIMS on a phone](/help/guides/on-a-phone/).

## Settings that affect it

- [`calendar.workingDays`](/help/admin/settings/#calendar.workingDays) decides due dates, and so **TAT Crossed Sample Report**, **Days late** and the on-time counts.

## Tips

- Start from a Dashboard tile when you want to see the records behind a number: the report opens with the matching filters.
- Export to Excel when you need to sort or total the data; report pages on screen have no search or sorting.

## Limitations

- Report pages have no search box and no column sorting. Rows come in a fixed order per report.
- You cannot add your own reports or columns.
- You may request at most 30 documents (exports, PDFs) a minute. Above that you see **Too many documents requested in the last minute. Wait a moment and try again.**

## Related

- [Dashboard and Analytics](/help/features/dashboard-analytics/)
- [Due invoices](/help/features/due-invoices/)
- [Invoices and payments](/help/features/invoices-payments/)
- [Documents the system produces](/help/features/documents/)
- [Files](/help/features/files/)
