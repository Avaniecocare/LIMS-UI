---
title: Due invoices
description: See everything customers owe by age, send payment reminders by hand or automatically, and produce a statement of account.
sidebar:
  order: 11
---

**Due Invoices** lists every unpaid invoice (status **Issued** or **Partially Paid**) with how long it has been overdue, totals by age and by customer, and the actions Accounts needs to collect: record a payment, send a reminder, produce a statement of account, or export the list to Excel.

:::note
Due Invoices is part of the billing module. When an administrator turns billing off in Admin → Modules, the screen disappears from the menu and automatic reminders pause.
:::

## Who can use it

| Role | Permissions | What it allows |
| --- | --- | --- |
| Accounts, Admin | `invoices.view`, `payments.edit`, `reminders.send` | See the list, record payments, send reminders, statements and Excel |
| Management | `invoices.view` | See the list, statements and Excel; no **Actions** column |

- **Record payment** appears only with `payments.edit`.
- **Remind** appears only with `reminders.send`.
- The customer filter appears only with `customers.view`.

## Where to find it

Select **Due Invoices** in the left menu. Selecting a row opens the invoice (see [Invoices and payments](/help/features/invoices-payments/)).

<!-- screenshot: due-invoices-page -->

## Ageing buckets

Ageing is worked out from each invoice's due date every day; it is never stored or set by hand. The due date is the invoice date plus the customer's credit days.

| Bucket | Meaning |
| --- | --- |
| **Not Due** | Due today or later |
| **0-30** | 1 to 30 days past the due date |
| **31-60** | 31 to 60 days past |
| **61-90** | 61 to 90 days past |
| **90+** | More than 90 days past |

At the top of the screen, **All outstanding** and one tile per bucket show the total balance and the number of invoices. Select a tile to list only that bucket; select it again to clear it.

## The list

| Column | What it shows |
| --- | --- |
| **Customer** | The customer |
| **Invoice** | Invoice number |
| **Date** | Invoice date |
| **Due** | Due date |
| **Amount** | Grand total |
| **Paid** | Paid so far |
| **Balance** | Grand total less payments and credit notes |
| **Days overdue** | Days past the due date, or a dash when not overdue |
| **Ageing** | The bucket, red when overdue |
| **Actions** | **Record payment** and **Remind** |

Filters: **Search invoice or customer**, the customer picker (**All customers**), **All ageing** (choose a bucket), and **Overdue or not** (**Overdue only** or **Not overdue**). You can save a filter for later. The list is sorted by due date, oldest first.

Below the list, **Outstanding by customer** shows each customer's **CRN**, number of **Invoices**, **Outstanding** and **Overdue** amounts, largest first. Select a customer's name to filter the list to them.

When nothing is due, the list says **No invoices are due**.

## Record a payment from the list

**Goal:** record money received against a due invoice.

**Who can do it:** Accounts or Admin (`payments.edit`).

**Steps:**

1. Select **Record payment** on the invoice's row.
2. Complete the **Record payment** dialog. The amount and the allocation start as the invoice's balance.
3. Select **Record payment**.

**Result:** the payment is recorded and the list and totals update. See [Record a payment](/help/features/invoices-payments/#record-a-payment) for every field.

## Send a reminder by hand

**Goal:** email the customer a payment reminder for one unpaid invoice.

**Who can do it:** Accounts or Admin (`reminders.send`).

**Steps:**

1. On **Due Invoices**, select **Remind** on the row. You can also open the invoice and select **Send reminder**.
2. Leave **Send to** empty to use the customer's contact email (the primary contact first), or enter another address.
3. Select **Send reminder**.

**Result:** "Reminder sent" appears. The email uses the "Payment reminder" template: the balance, the invoice number, the due date and, when the lab profile has them, the lab's bank details. The reminder is logged on the invoice's **Reminders** tab as **Manual**, and the email appears on its **Delivery** tab.

If the customer has no contact email and you leave **Send to** empty, the reminder is refused with "This customer has no contact email. Enter an address."

Only invoices that are **Issued** or **Partially Paid** can be reminded.

<!-- screenshot: due-invoices-reminder-dialog -->

### Remind on WhatsApp

When the WhatsApp module is on and you hold `reminders.send`:

- the reminder dialog shows **Send it on WhatsApp instead**;
- an open invoice's page shows **Remind on WhatsApp**.

Both open the WhatsApp dialog, where you enter the number and confirm that the customer agreed to WhatsApp messages. See [WhatsApp](/help/features/whatsapp/).

## Automatic reminders

The lab can have the system send reminders by itself.

- Turn them on with [`reminders.enabled`](/help/admin/settings/#reminders.enabled) (off by default).
- Choose the days after the due date with [`reminders.scheduleDays`](/help/admin/settings/#reminders.scheduleDays) (by default 1, 7, 15 and 30).

Every day at 9:30 am (India time), the system looks at every **Issued** or **Partially Paid** invoice past its due date. If today is one of the scheduled days after its due date, and no automatic reminder went for it today, it emails the customer's contact (the primary contact first). Invoices whose customer has no contact email are skipped. Each automatic reminder is logged on the invoice's **Reminders** tab as **Automatic**.

Automatic reminders pause while billing is turned off.

:::note
Separately, every morning at 8:30 am the system notifies people with `invoices.edit` once about each invoice that has become overdue ("Invoice *number* is overdue"). See [Notifications](/help/features/notifications/).
:::

## Produce a statement of account

**Goal:** give a customer a statement of everything billed and paid.

**Who can do it:** anyone with `invoices.view`.

**Steps:**

1. On **Due Invoices**, find the customer under **Outstanding by customer**.
2. Select **Statement**.
3. Enter **From** and **To** dates, or leave both empty for the whole account up to today.
4. Select **Produce statement**.

**Result:** a PDF named "Statement *CRN*" opens. It shows the customer's name, CRN and GSTIN, the period, and every issued invoice (debit), payment (credit, with mode and reference) and credit note (credit) in date order with a running balance. With a **From** date, earlier entries are summed into an **Opening balance** line. It ends with the **Closing balance**, the ageing of outstanding invoices by bucket, and the lab's bank details.

| Field | What it means | Required |
| --- | --- | --- |
| **From** | First day of the period; empty means from the start of the account | No |
| **To** | Last day of the period; empty means today | No |

Reversed payments, drafts and cancelled invoices are left out.

:::note
**Statement** appears only for customers who currently owe something, because it is offered only in **Outstanding by customer**. To produce one for a customer with nothing outstanding, there is no button in the app.
:::

## Export to Excel

**Goal:** get the due invoices in a spreadsheet.

**Who can do it:** anyone with `invoices.view`.

**Steps:**

1. Set the filters you want (customer, bucket, overdue, search).
2. Select **Excel**.
3. Enter your password in **Confirm your password** if asked. You are not asked again for ten minutes.

**Result:** `due-invoices.xlsx` downloads with exactly the invoices the filters show (all pages): **Customer**, **CRN**, **Invoice no.**, **Invoice date**, **Due date**, **Amount**, **Paid**, **Credited**, **Balance**, **Days overdue** and **Ageing**.

The export holds every matching customer's unpaid amounts, so it asks for your password and administrators can see that it was made.

## Settings that affect due invoices

| Setting | Effect |
| --- | --- |
| [`reminders.enabled`](/help/admin/settings/#reminders.enabled) | Turns automatic reminders on or off |
| [`reminders.scheduleDays`](/help/admin/settings/#reminders.scheduleDays) | Days after the due date on which automatic reminders go |
| [`credit.defaultDays`](/help/admin/settings/#credit.defaultDays) | Default credit days for customers; a customer's credit days set each invoice's due date |

The reminder wording is the "Payment reminder" template. See [Email templates](/help/admin/email-templates/).

## On a phone

Due Invoices works on a phone in a simplified layout. The ageing tiles stay at the top, rows become cards (the first four columns, with the rest under **More details**), and filters move under a **Filters** button. **Due Invoices** comes right after Samples in the phone's bottom-bar order, so for Accounts it is usually one tap away. See [Using the app on a phone](/help/guides/on-a-phone/).

## Tips

- Start the day with the **90+** tile, then **61-90**.
- Send a statement of account with a reminder when a customer has several open invoices.
- Keep each customer's primary contact email up to date: manual and automatic reminders go there.

## Limitations

- Only **Issued** and **Partially Paid** invoices appear; drafts are not due.
- Advances held on account are not subtracted from the outstanding totals until you apply them to invoices.
- Automatic reminders go by email only.

## Related

- [Invoices and payments](/help/features/invoices-payments/)
- [Customers](/help/features/customers/)
- [Email](/help/features/email/)
- [WhatsApp](/help/features/whatsapp/)
- [Notifications](/help/features/notifications/)
- [Documents](/help/features/documents/)
