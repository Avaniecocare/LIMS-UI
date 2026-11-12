---
title: GST e-invoicing
description: Register B2B tax invoices and credit notes at the GST Invoice Registration Portal (IRP), print the IRN and signed QR code, and set it up on the server.
sidebar:
  order: 4
---

GST e-invoicing registers each B2B tax invoice and credit note at the government's **Invoice Registration Portal (IRP)**. The IRP gives back an **IRN** (Invoice Reference Number), an acknowledgement number and date, and a **signed QR code**. The LIMS prints all of them on the invoice PDF and keeps exactly what the IRP returned.

E-invoicing is required by law once a business's turnover has exceeded ₹5 crore in any financial year since 2017-18. Testing laboratories are not exempt. Check with your accountant whether it applies to you.

## What gets registered

| Document | Registered? |
| --- | --- |
| Tax invoice to a customer **with a GSTIN** (B2B) | Yes, as soon as it is issued |
| Credit note against such an invoice | Yes, as soon as it is raised, referring to the invoice |
| Invoice to a customer without a GSTIN (B2C) | No. B2C invoices are outside e-invoicing |
| Draft invoice | No |

A B2B invoice is not emailed or sent on WhatsApp until it has its IRN. If registration fails, the invoice stays issued, the reason shows on the invoice page, and anyone with `invoices.edit` can fix the cause and select **Try again**. See [Invoices and payments](/help/features/invoices-payments/#gst-e-invoice-irn).

## Set it up

**Who can do it:** whoever runs the server sets the credentials. An Admin (`admin.company.edit`) does the rest in the app.

**Before you start:** the lab needs an API user on the e-invoice portal. Sign in at [einvoice1.gst.gov.in](https://einvoice1.gst.gov.in), open **API Registration**, then **Create API User**. For a first trial, use the NIC sandbox at [einv-apisandbox.nic.in](https://einv-apisandbox.nic.in): sign in with the lab's GSTIN to get the sandbox address, the client id and secret, and the sandbox public key.

**Steps:**

1. On the server, set the settings in [Environment variables](/help/install/environment/#gst-e-invoicing) and restart: `EINVOICE_PROVIDER=nic`, `EINVOICE_ENV`, the client id and secret, the API user name and password, the lab's GSTIN and the IRP public key. In the sandbox, also set `EINVOICE_BASE_URL`.
2. In the app, open **Admin** → **E-invoicing**. The **Connection** card shows where invoices will be registered, and lists anything still stopping registration, each in words.
3. Under **The lab's address on e-invoices**, enter **Address line 1**, **City or town** and the 6-digit **PIN code**, then select **Save**. The GSTIN, legal name and state come from the [Lab profile](/help/admin/lab-profile/).
4. If the list says the invoice or credit note numbers are too long, shorten them in [Numbering](/help/admin/numbering/). The IRP accepts at most 16 letters, digits, `/` or `-`, not starting with `0`, `/` or `-`. For example `{PREFIX}/{FY}/{SEQ:5}` gives `AE/26-27/00001`.
5. Select **Check the connection**. "Signed in to the GST portal. The credentials work." means the server can reach the IRP.
6. When the card says **Nothing is stopping registration.**, open **Admin** → **Modules**, tick **GST e-invoicing**, and save.

**Result:** from now on, B2B invoices and credit notes are registered as they are issued.

:::note
**GST e-invoicing** stays off after the server is set up, until an Admin turns it on. Switching it on changes what issuing an invoice does, so it is a deliberate step.
:::

Untick **Register B2B invoices and credit notes at the GST portal as soon as they are issued** to register each one by hand from its invoice page instead.

## Test IRNs

With `EINVOICE_PROVIDER=mock`, the server makes test IRNs itself, for training and demonstrations. Nothing is sent anywhere. The invoice page shows **Test IRN**, and the PDF prints "TEST IRN: not registered with the GST portal, not valid for GST". The sandbox gives test IRNs too, marked the same way. The mock cannot be used with `EINVOICE_ENV=production`.

## Cancelling and correcting

The IRP lets an IRN be cancelled only within **24 hours** of registration. Within that time, cancelling the invoice in the LIMS cancels the IRN first, with a reason the IRP records: **Duplicate**, **Data entry mistake**, **Order cancelled** or **Other**. If the IRP refuses, the invoice stays issued.

After 24 hours the invoice cannot be cancelled. Correct it with a credit note, which is registered too. A cancelled invoice number can never be registered again.

## Security

- The API credentials are server settings only. They are never stored in the database, shown in Admin, or sent to a browser.
- Every registration, failure and cancellation is in the invoice's **History**, with who did it.
- The document sent to the IRP is kept with the e-invoice record for support and audit.

## Limitations

- The LIMS connects to the IRP's direct API (NIC). NIC gives production direct-API access only to larger taxpayers. Most labs register through a GST Suvidha Provider (GSP), which this version does not support yet. Check with NIC or your GSP which route you can use.
<!-- TODO(verify): the current turnover threshold for production direct-API access; NIC's announcement said ₹500 crore at launch, later sources say ₹100 crore. -->
- Only B2B supplies within India are registered. Exports, SEZ supplies, reverse charge and debit notes are not.
- E-way bills are not generated. Testing services do not need them.
- From 1 April 2025, taxpayers with turnover of ₹10 crore or more cannot register a document more than 30 days after its date. Register promptly, and fix failures the same day.
- The IRP checks that each PIN code belongs to the state given. A mismatch comes back as a failure with the IRP's reason.

## Related

- [Invoices and payments](/help/features/invoices-payments/)
- [Modules](/help/admin/modules/)
- [Numbering](/help/admin/numbering/)
- [Environment variables](/help/install/environment/#gst-e-invoicing)
