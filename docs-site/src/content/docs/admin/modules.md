---
title: Modules
description: Turn off parts of the product your laboratory does not use, what disappears when you do, and what "Not set up" means.
sidebar:
  order: 9
---

**Admin** → **Modules** lets you turn off parts of the product your laboratory does not use, to keep menus simple. Turning a module off deletes nothing; turning it back on brings everything back.

The core lab workflow is always on: customers, booking, planning, testing, approvals, reports, masters and admin.

<!-- screenshot: admin-modules -->

## The modules

| Module | What it covers |
| --- | --- |
| **Orders and quotations** | Enquiries, quotations and proforma invoices, and booking from an accepted quotation. |
| **Dispatch** | Dispatch records, challans, and returnable samples. |
| **Billing** | Tax invoices, payments, credit notes, due invoices and payment reminders. |
| **File library** | Folders of SOPs, certificates and other documents, with their own access role. |
| **Photos from a phone** | A QR code that lets a phone send photos to a sample, test or report. |
| **Analytics and MIS reports** | Charts across the lab, and MIS reports with Excel and PDF export. |
| **Quality management** | Equipment calibration and maintenance, staff authorisations and training, and non-conformance and CAPA. |
| **WhatsApp** | Send reports, invoices, sample-received letters and payment reminders to customers on WhatsApp. |
| **GST e-invoicing** | Register B2B tax invoices and credit notes at the GST Invoice Registration Portal (IRN and signed QR code). |

Every module is on by default, except one that is **Not set up** and **GST e-invoicing**, which stays off until an Admin turns it on (it changes what issuing an invoice does).

## Turn modules on or off

**Goal**: show only the parts of the product your lab uses.

**Who can do it**: Admin (`admin.company.edit`).

**Steps**:

1. Open **Admin** → **Modules**.
2. Tick the modules you want, untick the ones you do not. A module that is off shows **Off**.
3. Click **Save modules**. Click **Undo changes** to go back to what is saved.

**Result**: **Modules saved. Menus and pages follow at once.** Other people see the change within a minute, usually at once.

## What happens when a module is off

- Its menu items, pages and buttons disappear for everyone.
- The server refuses its actions too, including public phone-upload links and the module's documents. Someone who opens an old link sees **This part of the system is turned off**.
- Automatic payment reminders pause while **Billing** is off.
- Records are kept. Turning the module back on shows them again.

## "Not set up"

A module marked **Not set up** needs the server configured first, and cannot be ticked until it is. The reason is shown under its name.

Today this applies to **WhatsApp**, which needs `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` in the server settings, and **GST e-invoicing**, which needs `EINVOICE_PROVIDER` and the e-invoice API credentials. See [WhatsApp](/help/integrations/whatsapp/) and [GST e-invoicing](/help/integrations/e-invoicing/).

## Related

- [WhatsApp](/help/integrations/whatsapp/)
- [GST e-invoicing](/help/integrations/e-invoicing/)
- [Permissions](/help/admin/permissions/): a module that is on still needs the right permissions.
- [Administration](/help/admin/)
