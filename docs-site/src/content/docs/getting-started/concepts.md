---
title: Key concepts
description: The words the LIMS uses for jobs, samples, tests, results, reports, invoices and access, and what each one means.
sidebar:
  order: 2
---

This page explains the terms you meet on screens, documents and notifications. The words match what the system shows.

## Customers and sales

### Customer

A company or person you test for. Each customer has a customer reference number (**CRN**, for example `CRN-00012`), a GSTIN, state and GST code, contacts, and billing and report addresses. A customer can be marked **Withhold report release until payment is received**.

### Order

An enquiry from a customer, received by email, phone, letter or walk-in. An order moves through the stages **New**, **Quoted**, **Won** and **Lost**, and can have quotations. Orders are optional.

### Quotation / proforma invoice

An offer listing samples, tests, quantities, rates and discounts, with GST worked out by the server. The same document can be titled **Quotation** or **Proforma Invoice**. A quotation has numbered versions; revising it creates a new draft version and keeps the earlier ones. Its status is **Draft**, **Sent**, **Accepted**, **Rejected** or **Expired**. An accepted quotation can be converted to a job once.

## Samples and tests

### Job

One booking: the samples a customer sent together, with one letter or challan, one receipt date and one set of contact details. A job has a job number and a status: **Received**, **Planned**, **In Testing**, **Reporting**, **Completed**, **On Hold** or **Cancelled**. The system moves a job forward by itself as its tests progress; people can put it on hold, release it or cancel it.

### Sample

One item within a job, with its own description, condition, quantity, size and optional attributes. A job has one or more samples.

### Sample number

The unique number printed on each sample's label as text and as a QR code. Scanning it opens the sample (or, for a technician, their test on it). Numbers follow your lab's format, for example `LAB/S/26-27/000123`, where `26-27` is the Indian financial year.

### Test

A test from your lab's catalogue (for example *Tensile test* or *Chemical analysis, low alloy steel*) applied to one sample. Each test on a sample has a status: **Planned**, **Assigned**, **In Progress**, **Results Submitted**, **Approved**, **On Hold** or **Cancelled**. A test that has been requested at booking but not yet planned shows **Not planned yet**.

### Parameter

One measured or calculated value within a test. *Tensile test* has parameters such as *Width*, *Maximum load* and *Ultimate tensile strength*. Calculated parameters are worked out from the others by a formula.

### Specification (grade)

A set of limits for parameters, such as a material grade or standard. When a sample is planned against a specification, each result is checked against its limits and shows **Pass** or **Fail**. Without limits a result shows **No limits**.

### Dual specification (dual grade)

A second specification on the same sample (**Second grade (dual grade)** when planning). Results are checked against both and the verdict for each grade is shown.

### Result

The value entered for a parameter. Results save as you type. For a value outside what the method can measure, type `<` or `>` before it, for example `<0.005`. Once submitted, results are locked unless they are sent back.

### Stage

A step within a test, such as sample preparation or measurement, completed in order. Every stage must be complete before results can be submitted.

### Deviation

Anything about the samples that departs from what was expected, recorded at booking or later: for example *Sample damaged*, *Insufficient quantity* or *Missing test details*. A deviation applies to the whole job or to one sample.

### TAT (turnaround time)

The number of working days a test should take. Each test in the catalogue has a normal TAT and an urgent TAT. When a test is planned, its due date is worked out from today, the job's urgency, your working days and holidays. Tests past their due date show **Overdue**; the dashboard counts **TAT crossed**.

### Urgent

A job marked **Urgent** at booking uses the urgent TAT and is listed first in work queues.

## Reports

### Report (test report)

The certificate of results for one sample. The system creates a draft report by itself once every active test on the sample is approved. A report has a report number.

### Revision

A version of a report. The first is created as a draft. A report moves through **Draft**, **In Review**, **Pending Approval**, **Approved** and **Issued**. To change an issued report, someone with permission starts a new revision with a reason; when the new revision is issued, the old one becomes **Superseded**.

### Electronic signature

When the authorised signatory approves a report, they re-enter their password. The report's content is then frozen and a fingerprint (SHA-256) of it is stored. The reviewer and the signatory must be different people unless your administrator has relaxed that control.

### ULR and NABL mode

The Unique Lab Report number required by NABL. When your laboratory has NABL mode turned on and a report contains accredited parameters, the report gets a ULR number when it is signed, in your lab's format.

### Verification code / QR

A signed report carries a QR code with a verification link. Anyone can scan it, without signing in, to see that the report is genuine, see its results, and check that a PDF copy has not been changed. A replaced report says **This report has been replaced**.

### Acknowledgement

The samples-received letter sent to the customer after booking, optionally with photos of the samples as received.

### Sample request form (SRF), job card, labels, challan

Documents the system produces as PDFs: the SRF and acknowledgement for a job, a job card for the lab, 70 × 40 mm sample labels, and a dispatch challan.

## Dispatch and samples

### Dispatch

A record that reports and returnable samples left the lab, with the date, mode (for example *Courier*, *By hand* or *Post*) and courier or carrier details. Each dispatch has a number and a challan.

### Returnable sample / retention

A sample marked **Returnable** at booking is due back to the customer. Other samples are kept until a retention date (**Keep until**) and then become **Due for disposal**. Disposal is recorded with a date and cannot be undone.

## Billing

### Tax invoice

A GST invoice raised from jobs that have approved tests. It starts as a draft, gets its number and due date when issued, and then cannot be edited. Its status is **Draft**, **Issued**, **Partially Paid**, **Paid** or **Cancelled**. CGST and SGST, or IGST, are worked out from the customer's state.

### Credit note

A reduction against an issued invoice, entered as an amount before tax with a reason. GST is worked out the same way as on the invoice.

### Payment and allocation

A payment received from a customer (NEFT, RTGS, IMPS, UPI, cheque, cash, card or other), with a receipt number. You allocate it to one or more open invoices. Any amount not allocated stays **on account** as an **advance**, which you can apply to invoices later.

### Due invoice and ageing

An issued invoice that is not fully paid. Its age is counted from the due date into the buckets **Not Due**, **0-30**, **31-60**, **61-90** and **90+** days.

## Access

### Module

A part of the product your laboratory can turn on or off, such as billing or WhatsApp. When a module is off, its menus and buttons disappear and nothing is deleted.

### Role and permission

A permission allows one kind of action, for example *Book jobs and samples* (`jobs.create`). A role is a named set of permissions, such as **Sample Reception**. A person can hold several roles. If you open a page your roles do not include, you can ask for access with a reason; an administrator answers it.

## Related

- [What the LIMS is](/help/getting-started/)
- [The sample lifecycle](/help/getting-started/sample-lifecycle/)
- [Find your role](/help/guides/)
