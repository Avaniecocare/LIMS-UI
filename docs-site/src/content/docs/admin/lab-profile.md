---
title: Lab profile
description: The laboratory's details that print on reports, quotations, invoices and emails, and the rules each field must follow.
sidebar:
  order: 6
---

**Admin** → **Lab profile** holds the laboratory as it appears on every report, quotation, invoice and email: its names, addresses, tax registration, bank account, accreditation, document prefix, and support and privacy contacts.

- Saved changes apply to new documents at once, for everyone, without a restart.
- Documents already issued never change: they keep the details they were issued with.
- Saving asks you to confirm your password, because these details print on every invoice and report. The audit log keeps the previous values.

<!-- screenshot: admin-lab-profile -->

## Edit the lab profile

**Goal**: keep the laboratory's details correct on documents.

**Who can do it**: Admin (`admin.company.edit`). People with only `admin.company.view` see the form but cannot change it.

**Steps**:

1. Open **Admin** → **Lab profile**.
2. Change the fields you need. Entering the **GSTIN** fills **State**, **GST state code** and **PAN**.
3. Click **Save lab profile**.
4. Enter your password in **Confirm your password** if asked, and click **Confirm**.

**Result**: **Lab profile saved. New documents use it from now on.** If a field is wrong, the message appears under it and nothing is saved.

:::note
Fields may be left empty while you finish setting up, except the ones marked required. Anything filled in must be valid.
:::

## Laboratory

Printed on every report, quotation and invoice, and used in emails.

| Field | What it means | Required | Rules |
| --- | --- | --- | --- |
| **Laboratory name** | The name people know, as on the letterhead. Also the sender name on emails. | Yes | Up to 200 characters. |
| **Legal name** | The registered name, for example ending "Private Limited". | Yes | Up to 250 characters. |
| **Laboratory address** | Where the laboratory is. | No | Up to 500 characters. |
| **Registered office address** | Only if different from the laboratory. | No | Up to 500 characters. |
| **Phone** | | No | Up to 40 characters. |
| **Email** | The laboratory's email. | No | A valid email address. |
| **Website** | | No | Must start with `https://` (or `http://`). |

## Tax registration

For GST invoices.

| Field | What it means | Required | Rules |
| --- | --- | --- | --- |
| **GSTIN** | The 15-character GST number. | No | Format and check digit are verified. |
| **PAN** | | No | A valid PAN. If a GSTIN is entered, the PAN must match characters 3 to 12 of the GSTIN. |
| **State** | Chosen from the list of states. Sets the GST state code too. | No | |
| **GST state code** | Two digits. | No | Two digits. If a GSTIN is entered, it must match the GSTIN's first two digits. |
| **CIN** | Corporate identity number, companies only. | No | A valid CIN. |
| **SAC code** | Services accounting code on invoices. 998346 is technical testing and analysis. | Yes | Up to 10 characters. Default `998346`. |
| **SAC description** | | No | Default "Technical testing and analysis services". |

## Bank account

Printed on invoices for payment, and available to the payment reminder email.

| Field | What it means | Required | Rules |
| --- | --- | --- | --- |
| **Account name** | | No | |
| **Account number** | | No | |
| **Bank** | | No | |
| **Branch** | | No | |
| **IFSC** | | No | A valid IFSC: four letters, a zero, then six letters or digits. |
| **SWIFT** | Only for payments from abroad. | No | A valid SWIFT code. |

## Accreditation

| Field | What it means | Required | Rules |
| --- | --- | --- | --- |
| **Certification line on reports** | For example "ISO/IEC 17025:2017 accredited laboratory". | No | Up to 300 characters. |
| **NABL mode** | Prints the NABL details and a ULR number on reports of accredited tests. | No | |
| **NABL certificate number** | Shown only when **NABL mode** is ticked. | Yes, in NABL mode | |
| **ULR format** | The format of the ULR number. Shown only when **NABL mode** is ticked. | Yes, in NABL mode | Must contain `{SEQ:n}`. |

A ULR number is given when a report is approved, only if **NABL mode** is on and at least one parameter on the report is in the accreditation scope. See [Document numbers](/help/admin/numbering/#ulr-numbers) for how the format works.

## Documents

| Field | What it means | Required | Rules |
| --- | --- | --- | --- |
| **Document prefix** | How document numbers start. For example `SL` gives `SL/TR/26-27/000001`. Applies to new numbers only. | Yes | 1 to 10 letters, digits or hyphens. |
| **Report verification email** | The address on the report verification line, and in the test report email. | No | A valid email address. |

On a new installation the prefix starts as the initials of the brand name set by the server (`BRAND_NAME`).

## Support and legal

Shown on the sign-in page and in email footers.

| Field | What it means | Required | Rules |
| --- | --- | --- | --- |
| **Support email** | | No | A valid email address. |
| **Support phone** | | No | |
| **Terms of service link** | | No | Must start with `https://`. |
| **Privacy policy link** | | No | Must start with `https://`. |
| **Privacy contact** | Who answers privacy requests and grievances under the DPDP Act. | No | |
| **Privacy contact email** | Shown in email footers and on the sign-in page. | No | A valid email address. |

See [Data protection](/help/security/data-protection/#privacy-contact).

## If someone else saved first

If another administrator saved the profile while you were editing, you see **Someone else changed the profile. It has been reloaded.** Make your changes again and save.

## Related

- [Branding](/help/admin/branding/)
- [Document numbers](/help/admin/numbering/)
- [Lab setup wizard](/help/admin/setup-wizard/)
- [Audit log](/help/admin/audit-log/)
