---
title: Terms and holidays
description: Keep versions of the terms and conditions printed on documents, and set holidays and working days for due dates.
sidebar:
  order: 11
---

Two tabs in **Admin** look after things that print on, or are calculated for, every job: **Terms** (the terms and conditions on quotations, invoices and reports) and **Holidays** (days that due dates skip).

## Terms and conditions

**Admin** → **Terms** has three cards: **Quotation terms**, **Invoice terms** and **Report terms**. Each shows the current version number and the date it was saved.

Terms are versioned. Saving never overwrites: it adds a new version. Issued documents keep the version they were issued with.

<!-- screenshot: admin-terms -->

### Change the terms

**Goal**: update the terms printed on new documents.

**Who can do it**: Admin (`admin.settings`).

**Steps**:

1. Open **Admin** → **Terms**.
2. Edit the text in the card for **Quotation terms**, **Invoice terms** or **Report terms**.
3. Click **Save new version**. The button is available only when the text has changed and is not empty.

**Result**: *Quotation terms* **saved as a new version**. The card shows the new version number. New documents use it; documents already issued keep theirs.

The first terms can also be entered during first-run setup. Each new version is recorded in the audit log.

Drafts show the current terms. The terms are frozen onto a quotation when it is sent or accepted, onto an invoice when it is issued, and onto a report when it is approved.

## Holidays and working days

Due dates are worked out from each test's turnaround time (TAT) in working days. A working day is:

- one of the **Working days** in **Admin** → **Settings** (`calendar.workingDays`, Monday to Saturday by default), and
- not a holiday in **Admin** → **Holidays**.

The count starts from the day the clock starts, which is not itself counted. For example, a test with a 5-day TAT starting on a Thursday, with Sundays off and no holidays, is due on the following Wednesday. If the clock would start on a non-working day, it starts on the next working day instead.

Each test's **Default TAT (working days)** and **Urgent TAT (working days)** are set in **Masters** → **Tests**. See [Masters](/help/admin/masters/#tests).

### Add a holiday

**Goal**: stop due dates landing on a holiday.

**Who can do it**: Admin (`admin.settings`).

**Steps**:

1. Open **Admin** → **Holidays**.
2. Choose the **Date** and type the **Holiday** name.
3. Click **Add holiday**.

**Result**: the holiday is in the list. Due dates worked out from now on skip it. Adding a date that is already in the list renames it.

### Remove a holiday

**Goal**: make a day a working day again.

**Who can do it**: Admin (`admin.settings`).

**Steps**:

1. In **Admin** → **Holidays**, click **Remove** on the holiday's row.
2. Click **Remove** in the dialog.

**Result**: due dates worked out from now on count that day as a working day.

:::note
Adding or removing a holiday does not move due dates already worked out. It affects due dates calculated afterwards.
:::

### Change the working week

**Goal**: match the days your laboratory is open.

**Who can do it**: Admin (`admin.settings`).

**Steps**:

1. Open **Admin** → **Settings** and find **Working days (0 = Sunday)** under **Calendar**.
2. Type the days as a list, 0 for Sunday to 6 for Saturday. For Monday to Friday: `[1, 2, 3, 4, 5]`.
3. Click **Save**.

**Result**: due dates worked out from now on use the new week.

## Related

- [Settings](/help/admin/settings/#calendar)
- [Masters](/help/admin/masters/)
- [Audit log](/help/admin/audit-log/)
