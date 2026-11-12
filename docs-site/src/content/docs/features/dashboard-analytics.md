---
title: Dashboard and Analytics
description: See what is waiting on you, read the lab's key numbers for a period, and open the charts behind them.
sidebar:
  order: 12
---

The **Dashboard** is the first page after you sign in. It lists what is waiting on you (**My work**) and a few summary tiles. **Analytics** shows the same tiles with charts for operations, quality, people and equipment, and money. Every number links to the list or report it was counted from, so you can see the records behind it.

## Who can use it

| Part | Who sees it | Permission |
| --- | --- | --- |
| **Dashboard** page and **My work** | Everyone who is signed in | none |
| **Operations** tiles and charts | Lab Manager / Planner, Management, Admin | `analytics.operations` |
| **Quality** tiles and charts | Head of Department, Report Reviewer, Authorised Signatory, Management, Admin | `analytics.quality` |
| **People and equipment** charts and **Calibrations due** | Lab Manager / Planner, Head of Department, Management, Admin | `analytics.people` |
| **Commercial** tiles and charts | Accounts, Management, Admin | `analytics.commercial` |
| **Analytics** page | Anyone with at least one of the four `analytics.*` permissions | any `analytics.*` |

These are the default roles. An administrator can change which roles hold which permission. The server decides which sections you receive, so two people looking at the same dashboard can see different tiles.

The **Analytics** page belongs to the **Analytics and MIS reports** module. If your lab has turned that module off (Admin → Modules), **Analytics** disappears from the menu and the page shows **This part of the system is turned off**. The **Dashboard** itself is always on.

## Where to find it

- **Dashboard**: the first item in the menu, or select the product name at the top left.
- **Analytics**: the **Analytics** menu item, or **Open analytics** at the top of the Dashboard. **Open analytics** keeps the period you chose on the Dashboard.

## Read the Dashboard

**Goal**: see what needs your attention and how the lab is doing this period.

**Who can do it**: everyone who is signed in.

**Steps**

1. Open **Dashboard**.
2. Read **My work**. Each line is a count of records waiting on you. Select a line to open the list it counts.
3. Read the tile sections below it: **Operations**, **Quality**, **Commercial**, and **Calibrations due**, depending on your permissions.
4. Select a tile to open the records behind the number.

**Result**: you land on the list or report the number was counted from.

<!-- screenshot: dashboard-analytics-my-work -->

### My work

**My work** lists only what applies to you, and only lines with a count above zero. When nothing is waiting, it says **Nothing is waiting on you right now.**

| Line | Shown to | Counts | Opens |
| --- | --- | --- | --- |
| **Tests assigned to me** | `tests.work` | Your tests that are Assigned or In Progress | **My Tests** |
| **My tests past due** | `tests.work` | Those of your tests whose due date has passed | **My Tests** |
| **Sent back to me** | `tests.work` | Your tests that an approver sent back for rework | **My Tests** |
| **Results to approve** | `tests.approve` | Tests with Results Submitted | **Approvals**, **Results** tab |
| **Reports to review** | `reports.review` | Reports in Draft or In Review | **Approvals**, **Review** tab |
| **Reports to sign** | `reports.approve` | Reports Pending Approval | **Approvals**, **Sign** tab |
| **Reports to issue** | `reports.issue` | Approved reports not yet issued | **Approvals**, **Issue** tab |
| **Tests to plan** | `planning.edit` | Requested tests not yet planned | **Planning**, **Unplanned** |
| **Tests to assign** | `planning.edit` | Planned tests with nobody assigned | **Planning**, **Unassigned** |
| **Draft quotations** | `quotations.edit` | Quotations in Draft | **Quotations**, filtered to Draft |
| **Jobs ready to invoice** | `invoices.edit` | Jobs waiting for an invoice | **Invoices**, **Ready to invoice** tab |
| **Overdue invoices** | `invoices.view` | Issued or partly paid invoices past their due date | **Due Invoices**, overdue only |

The counts in **My work** do not depend on the period. They are always "right now".

### Tiles

The tiles count over the **Period** you choose, unless the tile says otherwise (for example "today").

**Operations** (`analytics.operations`)

| Tile | What it counts |
| --- | --- |
| **Samples received today** | Samples received today (Indian time) |
| **Samples this month** | Samples received since the first of this month |
| **TAT crossed** | Open tests past their due date |
| **Urgent samples open** | Urgent samples not yet finished |
| **Jobs on hold** | Jobs with status On Hold |
| **Tests on hold** | Tests with status On Hold |
| **TAT compliance** | Of the tests approved in the period, the share approved on or before their due date |

**Quality** (`analytics.quality`)

| Tile | What it counts |
| --- | --- |
| **Reports awaiting review** | Reports in Draft or In Review |
| **Reports awaiting approval** | Reports Pending Approval |
| **Test rejection rate** | Of the submitted results decided in the period, the share sent back |
| **Revisions issued** | Report revisions issued in the period |

**Commercial** (`analytics.commercial`)

| Tile | What it counts |
| --- | --- |
| **Quotations sent** | Quotations sent in the period |
| **Conversion rate** | Of those, the share now Accepted |
| **Billed** | Total of invoices issued in the period |
| **Collected** | Total of payments received in the period |
| **Outstanding** | Everything still unpaid on issued invoices, whatever the period |

**Calibrations due** (`analytics.people`) lists active instruments whose calibration falls due within the next 30 days, and any that are overdue, marked **Overdue**. When none are due it says **No calibrations are due.**

:::note
A tile you cannot follow shows as a plain number, not a link. For example, a reviewer without `mis.view` sees **Test rejection rate** but cannot open the report behind it.
:::

:::note
A few counts cannot match the list they open exactly, because that list has no matching filter. **Jobs on hold** opens the Samples list filtered to On Hold. **Revisions issued** counts only the period's revisions. Reports opened from a tile always show what the tile counted.
:::

## Change the period

**Goal**: see the tiles and charts for a different range of dates.

**Who can do it**: everyone who sees tiles.

**Steps**

1. At the top of **Dashboard** or **Analytics**, find **Period**.
2. Enter the first date in the first box and the last date in the second.

**Result**: the tiles and charts reload for that range. The range stays in the page address, so a reload or a shared link keeps it. With no dates chosen, the period runs from the first of this month to today.

## Read the charts on Analytics

**Goal**: see how numbers split by status, stage, person, instrument, customer or test.

**Who can do it**: anyone with an `analytics.*` permission. Each section needs its own permission (see the table above).

**Steps**

1. Open **Analytics**.
2. Set the **Period** if you need another range.
3. Hover over a bar to see its value.
4. Select a bar to open the records it counts, where that is allowed for you.
5. Select **Table** on a chart to see the same numbers as a table, with each value as a link. Select **Chart** to switch back.

**Result**: you see the breakdown, and can open the records behind any value.

<!-- screenshot: dashboard-analytics-charts -->

| Section | Charts |
| --- | --- |
| **Operations** | **Samples by status** (all samples now, cancelled excluded), **Tests by stage** (open tests by their current stage) |
| **Quality** | **Rejection reasons** (the ten most common reasons for sending back results and reports in the period) |
| **People and equipment** | **Output by technician**, **Output by instrument**, plus **Calibrations due** |
| **Commercial** | **Billed against collected** (month by month), **Ageing of what is outstanding**, **Top customers**, **Top tests** (by taxable value of issued invoices in the period) |

A chart with no data says **No data for this period.**

:::tip
The **Table** view is the keyboard and screen reader route to every chart: each value is a real link.
:::

## On a phone

- The **Dashboard** works fully on a phone. At the top you get **Scan a label** (where the phone's browser can read codes) and quick links to the places you use: **My tests**, **To approve**, **Dispatch** and **Due invoices**, each only if you may open it. The **Period** and **Open analytics** are under **Date range**.
- **Analytics** is a "Best on a larger screen" page on a phone. Select **Continue anyway** to open it, or **Email me the link** or **Copy link** to open it later on a computer.

See [Using the LIMS on a phone](/help/guides/on-a-phone/).

## Settings that affect it

- [`notifications.tatWarningDays`](/help/admin/settings/#notifications.tatWarningDays) does not change the tiles, but the same due dates drive **TAT crossed** and the TAT notifications.
- [`calendar.workingDays`](/help/admin/settings/#calendar.workingDays) decides due dates, and so what counts as late in **TAT crossed** and **TAT compliance**.

## Tips

- Use **My work** as your to-do list. When a line disappears, nothing of that kind is waiting.
- Numbers on the Dashboard are counted by the same rules as the matching MIS report, so a tile and the report it opens agree.

## Limitations

- The Dashboard has no charts. Charts are only on **Analytics**.
- If the **Analytics and MIS reports** module is turned off, tiles still appear on the Dashboard, but tiles that link to a report open the **This part of the system is turned off** page.
- The charts use fixed colours, not your lab's brand colour, so they stay readable for colour-blind readers.

## Related

- [MIS reports](/help/features/mis-reports/)
- [Approvals](/help/features/approvals/)
- [Planning](/help/features/planning/)
- [Due invoices](/help/features/due-invoices/)
- [Quality](/help/features/quality/)
