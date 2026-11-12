---
title: Document numbers
description: How document numbers are built from the prefix, financial year and sequence, and how to change their formats.
sidebar:
  order: 10
---

Every customer, quotation, job, sample, report, invoice and other document gets a number from its own series. The format of each series is a setting, **Document number formats** (`numbering.formats`) in **Admin** → **Settings**. The start of most numbers, the **Document prefix**, is in **Admin** → **Lab profile**.

## Tokens in a format

| Token | Replaced by | Example |
| --- | --- | --- |
| `{PREFIX}` | The **Document prefix** from the lab profile. | `SL` |
| `{FY}` | The Indian financial year (April to March) of the document's date, as two two-digit years. | `26-27` |
| `{SEQ:n}` | The next number in the series, padded with zeros to `n` digits. `{SEQ}` without a width is not padded. | `{SEQ:5}` gives `00012` |

Everything else in the format is printed as typed, for example the slashes and `TR`.

Every format must contain a `{SEQ` token; a format without one is refused.

## Default formats

| Series | Used for | Default format | Example |
| --- | --- | --- | --- |
| `CUSTOMER` | Customer number (CRN) | `CRN-{SEQ:5}` | `CRN-00042` |
| `ORDER` | Orders | `{PREFIX}/ORD/{FY}/{SEQ:5}` | `SL/ORD/26-27/00007` |
| `QUOTATION` | Quotations | `{PREFIX}/QT/{FY}/{SEQ:5}` | `SL/QT/26-27/00031` |
| `JOB` | Jobs | `{PREFIX}/JOB/{FY}/{SEQ:5}` | `SL/JOB/26-27/00012` |
| `SAMPLE` | Samples | `{PREFIX}/S/{FY}/{SEQ:6}` | `SL/S/26-27/000345` |
| `PLAN` | Test plans | `{PREFIX}/PL/{FY}/{SEQ:5}` | `SL/PL/26-27/00003` |
| `REPORT` | Test reports | `{PREFIX}/TR/{FY}/{SEQ:6}` | `SL/TR/26-27/000112` |
| `DISPATCH` | Dispatch challans | `{PREFIX}/DC/{FY}/{SEQ:5}` | `SL/DC/26-27/00009` |
| `INVOICE` | Tax invoices | `{PREFIX}/INV/{FY}/{SEQ:5}` | `SL/INV/26-27/00088` |
| `CREDIT_NOTE` | Credit notes | `{PREFIX}/CN/{FY}/{SEQ:5}` | `SL/CN/26-27/00002` |
| `PAYMENT` | Payment receipts | `{PREFIX}/RCP/{FY}/{SEQ:5}` | `SL/RCP/26-27/00015` |
| `ULR` | ULR numbers | `{SEQ:8}` | See [ULR numbers](#ulr-numbers) |
| `NC` | Non-conformances | `{PREFIX}/NC/{FY}/{SEQ:4}` | `SL/NC/26-27/0004` |

The examples use `SL` as the prefix.

## When numbers restart

- Every series restarts at 1 each financial year (1 April), except customer numbers.
- Customer numbers (CRN) never restart: each is unique for life.
- A number is taken only when the document is actually saved. If saving fails, the number is not used up, so there are no gaps from failed saves.

## Change a format

**Goal**: number documents your laboratory's way.

**Who can do it**: Admin (`admin.settings`).

**Steps**:

1. Open **Admin** → **Settings** and find **Document number formats** under **Numbering**.
2. Edit the JSON. Change only the text in quotes for the series you want, and leave the other lines as they are. For example, change the `INVOICE` line to:

   ```json
   "INVOICE": "{PREFIX}/TI/{FY}/{SEQ:4}",
   ```

   If you delete a series from the JSON, that series falls back to `{PREFIX}/<series name>/{FY}/{SEQ:5}`.
3. Click **Save**.

**Result**: new documents use the new format. Documents already numbered keep their numbers. The running count is not reset by a format change.

:::caution
Changing a format in the middle of a financial year mixes two styles in one year's numbering. Check with your accountant before you change invoice or credit note formats.
:::

To change only the start of the numbers, change the **Document prefix** in [Lab profile](/help/admin/lab-profile/#documents) instead.

## ULR numbers

A ULR (Unique Lab Report) number is printed on reports when **NABL mode** is on in the lab profile and the report includes at least one parameter in the accreditation scope. It is given when the report is approved.

The ULR format is the **ULR format** field in the lab profile, not the `ULR` entry in the settings. It must contain `{SEQ:n}` and can use `{PREFIX}` and `{FY}`. The ULR series restarts each financial year like the others.

<!-- TODO(verify): the ULR format field's hint suggests "TC1234{YY}{SEQ:8}F", but the number builder only replaces {PREFIX}, {FY} and {SEQ:n}. A {YY} token would print as typed. Confirm before documenting {YY}. -->

## Related

- [Settings](/help/admin/settings/#numbering)
- [Lab profile](/help/admin/lab-profile/)
