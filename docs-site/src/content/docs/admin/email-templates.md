---
title: Email templates
description: Change the wording of emails to customers and staff password resets, use values and optional passages, preview, and reset to the standard wording.
sidebar:
  order: 8
---

**Admin** → **Email templates** holds the wording of the emails the system sends to customers, and the password reset email to staff. Each email has a subject and a message. Wherever you have not changed an email, the product's standard wording is used, so improvements in an upgrade reach emails you never edited.

Notifications to staff (other than password reset) are system messages and are not editable here.

<!-- screenshot: admin-email-templates -->

## The emails

| Email | When it is sent |
| --- | --- |
| **Samples received** | With the acknowledgement letter when samples are booked. |
| **Quotation** | With a quotation or proforma invoice. |
| **Test report** | With an issued test report. |
| **Tax invoice** | With an issued tax invoice. |
| **Payment reminder** | For an unpaid invoice, by hand or on the automatic schedule. |
| **Password reset** | To a staff member who asked to reset their password. |

An email you have changed shows **Edited** in the list.

## Edit an email

**Goal**: send emails in your laboratory's own words.

**Who can do it**: Admin (`admin.company.edit`). People with only `admin.company.view` can read the templates and preview.

**Steps**:

1. Open **Admin** → **Email templates** and click an email in the list.
2. Change the **Subject** and the **Message**.
3. To add a value, click in the subject or message where it should go, then click the value's name under **Insert a value**. Hover over a name to see what it holds.
4. Check **Preview, with example values** on the right. It shows the email in your branded layout.
5. Click **Save template**. Click **Discard changes** to go back to what is saved.

**Result**: **Template saved. Emails use it from now on.**

## How to write a template

Templates are plain text, never HTML.

| You type | You get |
| --- | --- |
| A blank line | A new paragraph. A single line break stays a line break. |
| `**words**` | **Bold** words. |
| `{{jobNo}}` | The value, for example the job number. A value that is empty prints nothing. |
| `{{#message}}...{{/message}}` | The passage between the markers only when that value exists. |

Example, from the standard **Quotation** message:

```text
Dear {{contactName}},

Please find attached our {{documentTitleLower}} **{{quotationNo}}**.

{{#message}}{{message}}

{{/message}}Regards,
{{senderName}}
{{labName}}
```

When the sender typed no note, the `{{#message}}` passage is left out.

Rules checked when you save (and shown in the preview):

- You can only use the values listed for that email. Anything else is refused, for example "`{{amount}}` is not available here".
- Every `{{#name}}` needs a matching `{{/name}}`.
- The subject can be up to 200 characters, the message up to 5000.
- Line breaks in the subject are removed.
- Everything you type and every value is escaped, so a template cannot add links or code. The only link is the password reset link, shown as "Set a new password".

## Values for each email

Every email can use **labName**, **labPhone** and **labEmail** (the laboratory's name, phone and email from the lab profile).

### Samples received

| Value | What it holds |
| --- | --- |
| `jobNo` | Job number |
| `contactName` | The customer contact, or "Sir/Madam" |
| `customerName` | The customer company |
| `sampleCount` | How many samples |
| `photoText` | For example "2 photographs", only when photos are attached |
| `senderName` | The person sending it |

### Quotation

| Value | What it holds |
| --- | --- |
| `quotationNo` | Quotation number |
| `documentTitle` | "Quotation" or "Proforma Invoice" |
| `documentTitleLower` | The same, in lower case for a sentence |
| `contactName` | The customer contact, or "Sir/Madam" |
| `customerName` | The customer company |
| `message` | The note typed when sending, if any |
| `senderName` | The person sending it |

### Test report

| Value | What it holds |
| --- | --- |
| `reportNo` | Report number |
| `sampleNo` | Sample number |
| `revisionNo` | Revision number, only for a revised report |
| `revisionReason` | Why it was revised, only for a revised report |
| `contactName` | The customer contact, or "Sir/Madam" |
| `customerName` | The customer company |
| `verifyEmail` | The report verification email from the lab profile |

### Tax invoice

| Value | What it holds |
| --- | --- |
| `invoiceNo` | Invoice number |
| `amount` | Invoice total |
| `dueDate` | Due date |
| `contactName` | The customer contact, or "Sir/Madam" |
| `customerName` | The customer company |

### Payment reminder

| Value | What it holds |
| --- | --- |
| `invoiceNo` | Invoice number |
| `balance` | Amount still due |
| `dueDate` | Due date |
| `contactName` | The customer contact, or "Sir/Madam" |
| `customerName` | The customer company |
| `bankName` | Bank name |
| `bankAccount` | Account number |
| `bankIfsc` | IFSC |

### Password reset

| Value | What it holds |
| --- | --- |
| `appName` | The app's name |
| `userName` | The staff member |
| `resetLink` | The one-time link, shown as "Set a new password". It works for one hour. |

## Reset an email to the standard wording

**Goal**: undo your changes to one email.

**Who can do it**: Admin (`admin.company.edit`).

**Steps**:

1. Open the email. **Reset to standard wording** shows only for an email you have changed.
2. Click **Reset to standard wording**, then **Reset** in the dialog.

**Result**: **Back to the standard wording.** This cannot be undone, but you can edit the email again.

## Related

- [Branding](/help/admin/branding/): the email layout uses the lab's colours and logo.
- [Email (SMTP)](/help/integrations/email-smtp/)
- [Lab profile](/help/admin/lab-profile/)
