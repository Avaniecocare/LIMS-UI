---
title: Data protection
description: How the LIMS supports the DPDP Act - whose data it holds, retention, the limits of erasure, breach reporting and the privacy contact.
sidebar:
  order: 2
---

This page is for administrators and auditors. It explains how the LIMS supports the laboratory's duties under India's Digital Personal Data Protection Act 2023 (DPDP Act) and the DPDP Rules. The day-to-day steps are on [Privacy](/help/admin/privacy/).

:::note
The LIMS gives you registers, deadlines and tools. It does not make the laboratory compliant by itself: your privacy notice, consent wording and procedures are your own. Take legal advice where needed.
:::

## Whose personal data the LIMS holds

| Who | What | Where |
| --- | --- | --- |
| Customers' contacts | Name, email, phone, designation | Customer contacts |
| People named on bookings | Kind attention, contact email and phone | Jobs |
| Recipients of emails and WhatsApp messages | Address or number, message, delivery status | Email and WhatsApp logs |
| Staff | Name, email, phone, designation, signature image, sign-in history and network addresses | Staff accounts, audit log |

Customer companies themselves (names, GSTIN, addresses) are business data, not personal data, but sole proprietors may blur this line.

The help assistant's question log may also hold personal data if people type it. See [Help assistant](/help/admin/help-assistant/).

## Requests from people

People can ask to see, correct or erase their data, withdraw consent, or raise a grievance. Log each one in **Admin** → **Privacy**; it gets an answer-by date from **Days to answer a privacy request** (`privacy.responseDays`, 30 days by default). Open requests past their date show as **Overdue**. Each answer is recorded with who gave it and when.

**Where this email address is held** lists every place a person's email appears, to help you answer an access request completely.

## Erasure and its limits

**Erase from customer contacts** removes the name, email, phone and designation from every customer contact with the person's email address. It needs your password confirmed and is recorded in the audit log.

Some records are deliberately not erased:

| Record | Why it is kept unchanged |
| --- | --- |
| Issued test reports | Accreditation (ISO/IEC 17025) requires reports and their records to be kept unchanged for the retention period. |
| Tax invoices, credit notes, payments | GST and accounting law require them to be kept unchanged. |
| Jobs (contact on booking) | Part of the technical record behind each report. |
| Email and WhatsApp logs | Evidence of what was sent, and when. |
| Audit log | Must be complete and unchangeable. |
| Staff accounts | Switched off rather than deleted, so signatures and history stay attributable. |

The DPDP Act allows personal data to be kept where another law requires it. Tell the person what was erased and what is kept and why; the suggested answer after an erasure says this.

## Retention

| What | Retention in the LIMS |
| --- | --- |
| Samples | **Sample retention (days)** (`retention.sampleDays`, default 90) sets each job's retention date. |
| Reports | **Report retention (years)** (`retention.reportYears`, default 5) records your retention period. |
| Audit log | Kept for as long as the database; never deleted by the system. |
| Records generally | The system does not delete records automatically. |

<!-- TODO(verify): no code acts on retention.reportYears yet; confirm whether reports past retention are flagged or purged in a later version. -->

Set retention periods in your quality system to meet the longest of accreditation, tax and contract requirements, and record them in [Settings](/help/admin/settings/#retention).

## Breach reporting

A personal data breach is any unauthorised access, disclosure, loss or alteration of personal data, for example a lost laptop with exported customer lists, or a report emailed to the wrong customer.

1. Log it at once in **Admin** → **Privacy** → **Log a breach**. Everyone with `privacy.manage` is alerted.
2. Tell the Data Protection Board and the people affected without delay.
3. Send the Board the detailed report within 72 hours of detection. The log shows the deadline for each breach, in red once it has passed.
4. Record when the Board and the people were told, what was done to contain it, and when it was closed.

## Privacy contact

Set **Privacy contact** and **Privacy contact email** in **Admin** → **Lab profile**. They are shown in email footers and on the sign-in page, so people know whom to ask. You can also link your **Privacy policy link** there. See [Lab profile](/help/admin/lab-profile/#support-and-legal).

## Security of personal data

The DPDP Act requires reasonable security safeguards. The LIMS provides role-based access with least privilege, customer identity hidden from technicians, password rules and lockout, session limits, password confirmation for sensitive actions, an unchangeable audit log, private file storage with short-lived links, and alerts on bulk exports. See [Security for administrators](/help/security/).

## Related

- [Privacy](/help/admin/privacy/)
- [Security for administrators](/help/security/)
- [Audit log](/help/admin/audit-log/)
