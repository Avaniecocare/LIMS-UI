---
title: Accounts
description: The day of the accounts team in the LIMS, with step-by-step tasks for invoices, payments, advances, credit notes, reminders and statements.
sidebar:
  order: 11
---

Accounts raises tax invoices for completed work, records the payments customers make, and follows up what is still due. You also keep the lab's standard and customer rates.

## Your day

- Your dashboard's **My work** shows **Jobs ready to invoice** and **Overdue invoices**. The **Commercial** tiles show **Billed**, **Collected** and **Outstanding**.
- In **Invoices**, tab **Ready to invoice**, you turn jobs with approved work into draft invoices, check them and issue them.
- You email invoices, or send them on WhatsApp.
- You record payments as they arrive and allocate them to invoices. Any extra stays on account as an advance.
- In **Due Invoices** you see what is unpaid by ageing, send reminders and produce statements of account.
- When an invoice is wrong after issue, you raise a credit note or cancel it.

## Screens you use

| Screen | What for |
| --- | --- |
| **Dashboard** | **Jobs ready to invoice**, **Overdue invoices**, commercial tiles |
| **Invoices** | Tabs **Ready to invoice**, **All invoices** and **Payments** |
| An invoice's page | Tabs **Details**, **Payments**, **Credit notes**, **Reminders**, **Delivery**, **History** |
| **Due Invoices** | Everything unpaid, ageing totals, **Outstanding by customer** |
| **Analytics**, **Reports** | Commercial charts; **Invoice Register with GST Summary**, **Payment Register**, **Outstanding and Ageing Report** |
| **Masters** | **Standard rates** and **Customer rates** |
| **Customers**, **Samples** | Customer and job details (read only) |

The Accounts role holds `invoices.view`, `invoices.edit`, `payments.edit`, `reminders.send`, `rates.view`, `rates.edit`, `customers.view`, `jobs.view`, `reports.view`, `masters.view`, `analytics.commercial` and `mis.commercial`.

:::note
Billing is a module your administrator can turn off. If **Invoices** and **Due Invoices** are missing from your menu, the module is off. Two-factor login is offered for your role in **My account**.
:::

## How to create a draft invoice

**Goal**: Turn approved work into a draft invoice.

**Who can do it**: Accounts (`invoices.edit`).

**Before you start**: The job needs approved tests with a rate. A job with **Missing rates** cannot be invoiced until the rate is added in **Masters**.

**Steps**:

1. Select **Invoices**. The **Ready to invoice** tab opens.
2. Tick one job, or several jobs for the same customer.
3. Select **Create draft invoice**.
4. In **Create a draft invoice?**, select **Create draft**.

**Result**: The message "Draft invoice created" appears and the draft opens. Nothing goes to the customer until it is issued.

**Related**: [Invoices and payments](/help/features/invoices-payments/), [Masters](/help/admin/masters/)

## How to check and issue an invoice

**Goal**: Finalise a draft and give it its number and due date.

**Who can do it**: Accounts (`invoices.edit`).

**Steps**:

1. Open the draft invoice.
2. In the **Details** tab, check the lines and the totals: **Subtotal**, **Discount**, **Taxable amount**, CGST and SGST or IGST, **Round-off** and **Grand total**.
3. To change a line's rate, select its change-rate button, enter the **Rate** and the **Reason**, and select **Save rate**.
4. To change the discount, enter a **Discount %** under **Draft**, add **Notes** if needed, and select **Save draft**. The server works out the totals each time you save.
5. Select **Issue**.
6. Optional: enter an **Invoice date (optional)** (empty means today), and an **Email to (optional)** address with **Cc**. Leave the email empty to issue without emailing.
7. Select **Issue invoice**.

**Result**: The message "Invoice … issued" appears. The invoice has its number and due date, and can no longer be edited.

<!-- screenshot: invoice-issue-dialog -->

**Related**: [Invoices and payments](/help/features/invoices-payments/)

## How to email an invoice or send it on WhatsApp

**Goal**: Send an issued invoice's PDF to the customer.

**Who can do it**: Accounts (`invoices.edit`). WhatsApp needs the WhatsApp module.

**Steps**:

1. Open the issued invoice.
2. To email it: select **Email**, enter **Email to** and optionally **Cc**, and select **Send**.
3. To send it on WhatsApp: select **WhatsApp**, choose the **Customer contact** or enter the **WhatsApp number**, tick **The customer agreed to receive messages from us on WhatsApp**, and select **Send on WhatsApp**.

**Result**: The message "Invoice queued for email" or "Queued for WhatsApp…" appears. Delivery shows in the **Delivery** tab.

To download the PDF yourself, select **PDF**.

**Related**: [Email](/help/features/email/), [WhatsApp](/help/features/whatsapp/)

## How to record a payment

**Goal**: Record money received and allocate it to invoices.

**Who can do it**: Accounts (`payments.edit`).

**Steps**:

1. Select **Invoices**, then the **Payments** tab, then **Record payment**. From an invoice or from **Due Invoices**, select **Record payment** there instead; the customer is filled in.
2. Choose the **Customer**.
3. Enter the **Date**, choose the **Mode** (NEFT, RTGS, IMPS, UPI, Cheque, Cash, Card or Other) and enter the **Reference** (cheque, UTR or transaction number).
4. Enter the **Amount**, and **Notes** if needed.
5. Under **Allocate to invoices**, enter how much goes to each open invoice.
6. Select **Record payment**.

**Result**: The message "Payment … recorded" appears with the receipt number. If you did not allocate everything, the message adds how much is "kept as an advance". Each invoice's status becomes **Partially Paid** or **Paid**.

:::note
You cannot allocate more than an invoice's balance.
:::

**Related**: [Invoices and payments](/help/features/invoices-payments/), [Key concepts](/help/getting-started/concepts/)

## How to apply an advance

**Goal**: Use money held on account against an invoice.

**Who can do it**: Accounts (`payments.edit`).

**Steps**:

1. Select **Invoices**, then the **Payments** tab.
2. Choose **With money on account** in the filter.
3. Select **Apply advance** on the payment.
4. Enter the amount for each open invoice.
5. Select **Apply advance**.

**Result**: The message "Advance applied, … left on account" appears.

**Related**: [Invoices and payments](/help/features/invoices-payments/)

## How to raise a credit note

**Goal**: Reduce what a customer owes on an issued invoice.

**Who can do it**: Accounts (`payments.edit`).

**Before you start**: The invoice must be issued. The credit cannot be more than the invoice's balance.

**Steps**:

1. Open the issued invoice.
2. Select **Credit note**.
3. Enter the **Taxable amount** (before tax). GST is worked out the same way as on the invoice.
4. Optional: enter a **Date (optional)**. Empty means today.
5. Enter the **Reason**.
6. Select **Raise credit note**.

**Result**: The message "Credit note raised" appears. It is listed in the **Credit notes** tab with its own PDF.

**Related**: [Invoices and payments](/help/features/invoices-payments/)

## How to send a payment reminder

**Goal**: Remind a customer about an unpaid invoice.

**Who can do it**: Accounts (`reminders.send`).

**Steps**:

1. Select **Due Invoices**.
2. Find the invoice. Use the ageing chips (**All outstanding**, **Not Due**, **0-30**, **31-60**, **61-90**, **90+**) or **Overdue only** to narrow the list.
3. Select **Remind** on its row (or **Send reminder** on the invoice's page).
4. Optional: enter **Send to**. Empty uses the customer's contact email.
5. Select **Send reminder**.

**Result**: The message "Reminder sent" appears and the reminder is logged on the invoice's **Reminders** tab. To remind on WhatsApp instead, select **Remind on WhatsApp** on the invoice's page.

**Related**: [Due invoices](/help/features/due-invoices/), [WhatsApp](/help/features/whatsapp/)

## How to produce a statement of account

**Goal**: Give a customer a statement of their invoices and payments.

**Who can do it**: Anyone with `invoices.view`.

**Steps**:

1. Select **Due Invoices**.
2. Under **Outstanding by customer**, find the customer and select **Statement**.
3. Optional: enter **From** and **To**. Leave them empty for the whole account up to today.
4. Select **Produce statement**.

**Result**: The statement PDF opens in a new tab.

**Related**: [Due invoices](/help/features/due-invoices/)

## How to cancel an invoice or reverse a payment

**Goal**: Undo an invoice or payment recorded by mistake.

**Who can do it**: Accounts. Cancelling needs `invoices.edit`; reversing a payment needs `payments.edit`.

**Steps**:

1. To reverse a payment: select **Invoices**, then **Payments**, select **Reverse** on the payment, enter the **Reason** and select **Reverse payment**. The record stays, and its invoices go back to their earlier balance.
2. To cancel an invoice: open it, select **Cancel invoice**, enter the **Reason** and select **Cancel invoice**.

**Result**: The payment shows **Reversed**, or the invoice shows **Cancelled**.

:::caution
Cancelling an invoice cannot be undone. An invoice with payments or credit notes must have them reversed first.
:::

**Related**: [Invoices and payments](/help/features/invoices-payments/)

## How to set a customer's rate

**Goal**: Keep the prices the lab charges, for everyone or for one customer.

**Who can do it**: Accounts (`rates.edit`).

**Steps**:

1. Select **Masters** (best on a computer).
2. Open **Standard rates** for the lab's list prices, or **Customer rates** for a customer's agreed prices.
3. Select **Add**.
4. For a customer rate, choose the **Customer**. Choose the **Test** and enter the **Rate (₹)**.
5. Enter **Effective from**, and **Effective to** if the rate ends.
6. Select **Save**.

**Result**: Quotations and invoices use the rate that is in effect, a customer rate before the standard rate.

**Related**: [Masters](/help/admin/masters/)
