---
title: Management
description: How management uses the LIMS to follow the lab's work and money through dashboards, analytics and MIS reports, without changing records.
sidebar:
  order: 12
---

Management follows the lab's performance: samples, turnaround, quality and money. The Management role is read-only. You can open almost every record, but you do not book, approve, invoice or change anything.

## Your day

- The **Dashboard** shows the lab at a glance: **Operations**, **Quality** and **Commercial** tiles, and **Calibrations due**.
- **Analytics** shows charts across operations, quality, people and equipment, and money.
- **Reports** holds the MIS reports, which you filter and export to Excel or PDF for meetings.
- When something stands out, you open the job, customer, invoice or report behind it.

## Screens you use

| Screen | What for |
| --- | --- |
| **Dashboard** | Summary tiles for the chosen **Period** |
| **Analytics** | Charts: **Samples by status**, **Tests by stage**, **Rejection reasons**, **Output by technician**, **Output by instrument**, **Ageing of what is outstanding**, **Top customers**, **Top tests** |
| **Reports** | MIS reports grouped as Samples, Planning, Testing, Performance, Collectors, Commercial and Quality |
| **Orders**, **Quotations**, **Samples**, **Planning**, **Approvals**, **Dispatch**, **Invoices**, **Due Invoices**, **Customers** | View records (read only) |
| **Quality**, **Files**, **Masters** | View equipment and competency, the file library, and the catalogue and rates |

The Management role holds the view permissions for customers, orders, quotations, jobs, planning, tests, reports, dispatch, invoices, masters and rates, plus all four analytics permissions and `mis.view` and `mis.commercial`. New installations also give it `files.view` and `quality.view`.

:::note
**Analytics** and **Reports** are wide screens. On a phone they first say **Best on a larger screen**. The **Dashboard** works fully on a phone.
:::

## How to read the dashboard

**Goal**: See the lab's numbers for a period.

**Who can do it**: Everyone; Management sees all sections.

**Steps**:

1. Select **Dashboard**.
2. Set the **Period** with the from and to dates.
3. Read the tiles. **Operations**: **Samples received today**, **Samples this month**, **TAT crossed**, **Urgent samples open**, **Jobs on hold**, **Tests on hold**, **TAT compliance**. **Quality**: **Reports awaiting review**, **Reports awaiting approval**, **Test rejection rate**, **Revisions issued**. **Commercial**: **Quotations sent**, **Conversion rate**, **Billed**, **Collected**, **Outstanding**.
4. Select a tile to open the report or list behind it.

**Result**: The tiles show the figures for your period. The period is kept in the page address, so you can bookmark or share it.

<!-- screenshot: dashboard-management-tiles -->

**Related**: [Dashboard and analytics](/help/features/dashboard-analytics/)

## How to open the analytics charts

**Goal**: See trends and breakdowns as charts.

**Who can do it**: Management (`analytics.operations`, `analytics.quality`, `analytics.people`, `analytics.commercial`).

**Steps**:

1. Select **Analytics**, or **Open analytics** on the dashboard.
2. Set the **Period**.
3. Scroll through **Operations**, **Quality**, **People and equipment** and **Commercial**.
4. Select a bar to open the records behind it, where a link is offered.

**Result**: The charts show the chosen period.

**Related**: [Dashboard and analytics](/help/features/dashboard-analytics/)

## How to run an MIS report and export it

**Goal**: Produce a report table for a meeting or for records.

**Who can do it**: Management (`mis.view`, `mis.commercial`).

**Steps**:

1. Select **Reports**.
2. Open a report, for example **Pending Sample Report**, **TAT Crossed Sample Report**, **Quotation Register**, **Invoice Register with GST Summary** or **Outstanding and Ageing Report**.
3. Set the filters the report offers: dates, department, technician or status.
4. Select **Excel** or **PDF**.

**Result**: The file is prepared and opens in a new tab or downloads.

**Related**: [MIS reports](/help/features/mis-reports/)

## How to see what is outstanding

**Goal**: Know how much customers owe and how old it is.

**Who can do it**: Management (`invoices.view`).

**Steps**:

1. Select **Due Invoices**.
2. Read the ageing chips: **All outstanding**, **Not Due**, **0-30**, **31-60**, **61-90** and **90+**.
3. Read **Outstanding by customer** to see who owes the most.
4. Select a customer's name to see only their invoices.

**Result**: You see the unpaid invoices with their balance, days overdue and ageing.

**Related**: [Due invoices](/help/features/due-invoices/)

## How to check a customer's history

**Goal**: See everything a customer has done with the lab.

**Who can do it**: Management (`customers.view` and the view permissions for each tab).

**Steps**:

1. Select **Customers** and open the customer.
2. Read the **Overview**: quotations, jobs, tests booked, reports issued, invoiced and outstanding amounts, and the most booked tests.
3. Open the **Quotations**, **Jobs**, **Tests booked**, **Reports** or **Invoices and payments** tab for the detail.

**Result**: You see the customer's work and money in one place.

**Related**: [Customers](/help/features/customers/)

## How to follow a job

**Goal**: Find out where a job is and what has happened to it.

**Who can do it**: Management (`jobs.view`).

**Steps**:

1. Search for the job number with **Ctrl+K**, or select **Samples** and open the job.
2. Read its status and the status of each test on the **Samples** tab.
3. Select the **Timeline** tab for what happened and when.

**Result**: You see the job's progress from receipt to report.

**Related**: [Jobs and samples](/help/features/jobs-samples/), [Search and scanning](/help/features/search-scanning/)
