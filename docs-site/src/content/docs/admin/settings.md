---
title: Settings
description: Every operating setting in Admin, Settings - what it does, its key, its default, and which ones need a reason to change.
sidebar:
  order: 5
---

**Admin** → **Settings** holds the laboratory's operating settings: tax, numbering, report format, quotation defaults, reminders, working days, retention, controls and warnings. Settings are grouped in cards. Each change is saved on its own and recorded in the [audit log](/help/admin/audit-log/) with the old and new value.

The lab's identity (names, GSTIN, bank, accreditation, document prefix), branding, email templates, modules and WhatsApp templates are not here; they have their own tabs.

## Change a setting

**Goal**: change how the lab operates.

**Who can do it**: Admin (`admin.settings`).

**Steps**:

1. In **Admin** → **Settings**, find the setting.
2. Change the value:
   - Yes/no settings have a **Yes** / **No** list.
   - Numbers and text have a box.
   - Lists and number formats are written in JSON, for example `[1, 2, 3, 4, 5, 6]`.
3. For a sensitive setting, fill in **Reason for this change**. The reason is written to the audit log.
4. Click **Save** on that row.

**Result**: the message *setting name* **saved** appears. The change applies at once.

:::caution
If someone else saved the same setting while you were editing, your save is refused and you need to reload the page and try again. If a value is not valid (for example, a list with a day outside 0 to 6) the save is refused.
:::

## Sensitive settings

Separation-of-duties and impartiality controls are **sensitive**: the server refuses to change them without a reason. They are marked **Yes** in the **Sensitive** column below.


## Tax

| Setting (as shown) | Key | Default | Sensitive | What it does |
| --- | --- | --- | --- | --- |
| **GST rate (%)** | <span id="tax.gstRate"></span>`tax.gstRate` | 18 | No | The GST rate used on quotations and invoices. 0 to 100. |

## Numbering

| Setting (as shown) | Key | Default | Sensitive | What it does |
| --- | --- | --- | --- | --- |
| **Document number formats** | <span id="numbering.formats"></span>`numbering.formats` | See [Document numbers](/help/admin/numbering/) | No | The format of each document number series, in JSON. Every format must contain `{SEQ`. |

## Report format

These print in the controlled-document block of test reports.

| Setting (as shown) | Key | Default | Sensitive | What it does |
| --- | --- | --- | --- | --- |
| **Report format no.** | <span id="report.formatNo"></span>`report.formatNo` | `QF-01` | No | The format number of the report form. |
| **Issue no.** | <span id="report.issueNo"></span>`report.issueNo` | `01` | No | The issue number of the report form. |
| **Issue date** | <span id="report.issueDate"></span>`report.issueDate` | empty | No | The issue date of the report form. |
| **Format revision no.** | <span id="report.revisionNo"></span>`report.revisionNo` | `00` | No | The revision number of the report form. |
| **Format revision date** | <span id="report.revisionDate"></span>`report.revisionDate` | empty | No | The revision date of the report form. |
| **Sampling statement** | <span id="report.samplingStatement"></span>`report.samplingStatement` | Sample not drawn by our laboratory. The results relate only to the items tested. | No | The statement printed on reports about sampling. |

<!-- TODO(verify): exactly where each report-format value prints on the report PDF. -->

## Quotations

| Setting (as shown) | Key | Default | Sensitive | What it does |
| --- | --- | --- | --- | --- |
| **Default quotation title** | <span id="quotation.defaultTitle"></span>`quotation.defaultTitle` | `Quotation` | No | The title of a new quotation. Only `Quotation` or `Proforma Invoice`. |
| **Default validity (days)** | <span id="quotation.defaultValidityDays"></span>`quotation.defaultValidityDays` | 30 | No | How long a new quotation is valid. |
| **Default payment terms** | <span id="quotation.defaultPaymentTerms"></span>`quotation.defaultPaymentTerms` | 100% within the agreed credit period | No | Payment terms filled in on a new quotation. |

## Accounts

| Setting (as shown) | Key | Default | Sensitive | What it does |
| --- | --- | --- | --- | --- |
| **Default credit days** | <span id="credit.defaultDays"></span>`credit.defaultDays` | 30 | No | Credit period for customers who have none of their own. |
| **Automatic invoice reminders** | <span id="reminders.enabled"></span>`reminders.enabled` | No | No | Whether payment reminders are emailed automatically for overdue invoices. They also pause while the **Billing** module is off. |
| **Reminder days after due date** | <span id="reminders.scheduleDays"></span>`reminders.scheduleDays` | `[1, 7, 15, 30]` | No | On which days after the due date an automatic reminder goes out. Whole numbers 0 to 365. |

## Calendar

| Setting (as shown) | Key | Default | Sensitive | What it does |
| --- | --- | --- | --- | --- |
| **Working days (0 = Sunday)** | <span id="calendar.workingDays"></span>`calendar.workingDays` | `[1, 2, 3, 4, 5, 6]` (Monday to Saturday) | No | Days of the week counted when due dates are worked out from turnaround times. 0 is Sunday, 6 is Saturday. Holidays are skipped too; see [Terms and holidays](/help/admin/terms-holidays/#holidays-and-working-days). |

## Retention

| Setting (as shown) | Key | Default | Sensitive | What it does |
| --- | --- | --- | --- | --- |
| **Sample retention (days)** | <span id="retention.sampleDays"></span>`retention.sampleDays` | 90 | No | How long samples are kept after booking. Sets each job's retention date. |
| **Report retention (years)** | <span id="retention.reportYears"></span>`retention.reportYears` | 5 | No | How long reports are to be kept. <!-- TODO(verify): no code reads this setting apart from first-run setup; nothing is deleted automatically. --> |

## Controls

| Setting (as shown) | Key | Default | Sensitive | What it does |
| --- | --- | --- | --- | --- |
| **Allow self-approval of results** | <span id="controls.allowSelfApproval"></span>`controls.allowSelfApproval` | No | Yes | When **No**, a person cannot approve a test result they conducted or submitted. |
| **Allow same reviewer and signatory** | <span id="controls.allowSameReviewerSignatory"></span>`controls.allowSameReviewerSignatory` | No | Yes | When **No**, the person who reviewed a report cannot also sign it. |
| **Hide customer identity from technicians** | <span id="controls.impartiality"></span>`controls.impartiality` | Yes | Yes | When **Yes**, test lists and test screens never show the customer. |
| **Block instruments past calibration due date** | <span id="controls.blockOverdueInstruments"></span>`controls.blockOverdueInstruments` | No | No | When **Yes**, an instrument past its calibration due date cannot be used on a test. |
| **Refuse to assign a test to someone not authorised for it** | <span id="controls.requireAuthorisation"></span>`controls.requireAuthorisation` | No | Yes | When **No**, planners only see a warning when they assign a test to someone without an authorisation for it. When **Yes**, the assignment is refused. |

:::caution
The controls support ISO/IEC 17025 impartiality and separation of duties. Change them only with a documented reason.
:::

## Quality

| Setting (as shown) | Key | Default | Sensitive | What it does |
| --- | --- | --- | --- | --- |
| **Warn this many days before equipment is due** | <span id="quality.dueWarningDays"></span>`quality.dueWarningDays` | 15 | No | How many days ahead calibration or maintenance shows as due soon. |

## Privacy

| Setting (as shown) | Key | Default | Sensitive | What it does |
| --- | --- | --- | --- | --- |
| **Days to answer a privacy request** | <span id="privacy.responseDays"></span>`privacy.responseDays` | 30 | No | The deadline for a privacy request, counted in calendar days from the day it was received. See [Privacy](/help/admin/privacy/). |

## Notifications

| Setting (as shown) | Key | Default | Sensitive | What it does |
| --- | --- | --- | --- | --- |
| **Warn this many days before TAT** | <span id="notifications.tatWarningDays"></span>`notifications.tatWarningDays` | 1 | No | How many days before a test's due date a warning notification goes out. |

## Hidden system settings

A few settings are kept by the system and do not appear on the tab: whether first-run setup is done, whether the lab setup wizard is finished, and whether the wizard's test email was sent.

## Related

- [Document numbers](/help/admin/numbering/)
- [Terms and holidays](/help/admin/terms-holidays/)
- [Audit log](/help/admin/audit-log/)
- [Lab profile](/help/admin/lab-profile/)
