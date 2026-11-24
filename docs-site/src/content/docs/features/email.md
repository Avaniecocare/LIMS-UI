---
title: Email
description: Which emails the system sends and when, how to check whether one was delivered, and how to send it again.
sidebar:
  order: 21
---

The system emails customers their documents (acknowledgements, quotations, reports, invoices, reminders) and emails staff their notifications. Every email is written to a delivery log first and then sent in the background, with retries, so you can always see what went out and whether it arrived at the mail server.

The wording of customer emails is set by the lab: see [Email templates](/help/admin/email-templates/).

## Emails to customers

| Email | When it is sent | Who sends it | Attachment | Logged on |
| --- | --- | --- | --- | --- |
| **Samples received** (acknowledgement) | At booking, when **Email the acknowledgement to …** is ticked; or later with **Email acknowledgement** on the job page | Sample Reception (`jobs.create` or `jobs.edit`) | Acknowledgement letter PDF, with sample photos if chosen | The job's **Acknowledgement emails** card |
| **Quotation** | **Send** or **Send again** on a quotation | Sales / Business Development (`quotations.send`) | PDF of the current version (titled Quotation or Proforma Invoice) | The quotation's **Sent** tab |
| **Test report** | When a report is issued with an email address; or **Email again** on an issued report | Authorised Signatory (`reports.issue`) | The issued report PDF | The report's **Delivery** tab |
| **Tax invoice** | When an invoice is issued with **Email to (optional)** filled in; or **Email** on an issued invoice | Accounts (`invoices.edit`) | Invoice PDF | The invoice's **Delivery** tab |
| **Payment reminder** | **Send reminder** on an invoice or in **Due Invoices**; or automatically on the scheduled days | Accounts (`reminders.send`), or the system | None | The invoice's **Delivery** and **Reminders** tabs |

The module that owns each document must be on: quotations need Orders and quotations; invoices and reminders need Billing.

### Automatic payment reminders

When [`reminders.enabled`](/help/admin/settings/#reminders.enabled) is on, the system emails a reminder at 09:30 (Indian time) on each day listed in [`reminders.scheduleDays`](/help/admin/settings/#reminders.scheduleDays) after an invoice's due date (by default 1, 7, 15 and 30 days), at most once per invoice for each of those days. It goes to the customer's primary contact email, or another contact with an email; a customer with no contact email gets no automatic reminder. Automatic reminders pause while the Billing module is off. See [Due invoices](/help/features/due-invoices/).

## Emails to staff

| Email | When |
| --- | --- |
| Notifications | Every in-app notification is also emailed, unless you untick that type under **Email notifications** on [My account](/help/features/account/). The email has the notification's title, text and an **Open** link. |
| Password reset | When someone uses **Forgot password** on the sign-in page. The link in the stored copy is blanked once the email is sent. |

Notification emails never contain customer names or prices, because they reach technicians too. See [Notifications](/help/features/notifications/).

## What every email looks like

Every email is wrapped in the lab's layout: the lab's name on a band in its brand colour at the top, and at the bottom the legal name, lab address, phone and email, support contacts, the privacy contact, and links to the terms and privacy pages where the lab has set them. The layout narrows to fit phone mail apps. Emails come from the lab's name at the server's sending address.

## Check whether an email was delivered

**Goal:** see whether a document reached the mail server, and why not if it failed.

**Who can do it:** anyone who can see the record: `jobs.view` (job), `quotations.view` (quotation), `reports.view` (report), `invoices.view` (invoice).

**Steps**

1. Open the job, quotation, report or invoice.
2. Open the delivery log: the **Acknowledgement emails** card on the job's **Documents** tab, the **Sent** tab on a quotation, or the **Delivery** tab on a report or invoice.

**Result:** a table with one row per email.

<!-- screenshot: email-delivery-log -->

| Column | What it means |
| --- | --- |
| **To** | The recipient |
| **Cc** | Copy recipients, or — |
| **Subject** | The subject as sent |
| **Status** | **Queued**, **Sent** or **Failed**. A failure shows the mail server's error underneath. |
| **Attempts** | How many times the system tried to send it |
| **Sent or queued** | When it was sent, or when it was queued if not sent yet |

If nothing has been sent, the log says **Nothing sent yet.**

### Statuses

| Status | Meaning |
| --- | --- |
| **Queued** | Written to the log, waiting to be sent (documents are rendered first) |
| **Sent** | The lab's mail server accepted it |
| **Failed** | The last attempt failed. The system keeps retrying, up to five attempts, waiting longer each time. |

:::note
**Sent** means the lab's mail server accepted the email. It does not prove the customer opened it, or that it did not land in spam.
:::

## Send an email again

To the same address, an administrator can send it again from **Admin** → **Emails**. See [Emails](/help/admin/emails/). To another address, send the document again from its record; this writes a new row to the log.

**Goal:** send a document again, to the same or another address.

**Who can do it:** the person who may send that document (see the first table).

**Steps**

1. Open the record.
2. Select the send button:
   - Job: **Email acknowledgement**.
   - Quotation: **Send again** (while the quotation is **Sent**).
   - Report: **Email again** (while the report is **Issued**).
   - Invoice: **Email** (while issued, partly paid or paid), or **Send reminder** (while unpaid).
3. Fill in the address (**To**, **Email to**, or **Send to** for a reminder) and, if needed, **Cc**.
4. Select **Send** (or **Send reminder**).

**Result:** a toast confirms it, for example "Email queued", "Invoice queued for email", "Quotation queued for sending" or "Reminder sent", and a new row appears in the delivery log.

| Field | What it means | Required |
| --- | --- | --- |
| **To** / **Email to** | The recipient's email address. On the acknowledgement it is filled in from the job's contact email. | Yes |
| **Send to** (reminder) | Leave empty to use the customer's contact email | No |
| **Cc** | A copy recipient | No |
| **Message** (quotation only) | A personal message added to the quotation email | No |

:::tip
If an email keeps failing, check the address first. If every email fails, the lab's mail server settings need attention: tell your administrator.
:::

## Tips

- At booking, keep **Email the acknowledgement to …** ticked: the customer hears straight away, and the job page stops reminding you that no acknowledgement has been sent.
- Use **Preview letter** in the **Email the acknowledgement** dialog to see the PDF before sending.
- WhatsApp is an alternative for the same documents: see [WhatsApp](/help/features/whatsapp/).

## Limitations

- Email bodies are plain text from the lab's templates; they cannot carry images other than the attachments.
- Statements of account are downloaded, not emailed from the system.
- The delivery log shows emails for one record. There is no lab-wide email log screen.
- Staff notification wording cannot be edited; only the customer emails have templates.

## Related

- [Email templates](/help/admin/email-templates/)
- [Notifications](/help/features/notifications/)
- [WhatsApp](/help/features/whatsapp/)
- [Book samples](/help/features/booking/)
- [Orders and quotations](/help/features/orders-quotations/)
- [Test reports](/help/features/reports/)
- [Invoices and payments](/help/features/invoices-payments/)
- [Due invoices](/help/features/due-invoices/)
