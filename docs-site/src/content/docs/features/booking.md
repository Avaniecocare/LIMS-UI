---
title: Book samples
description: Register samples that arrive at the lab, from an accepted quotation or without one, with photos, deviations and the acknowledgement email.
sidebar:
  order: 3
---

Booking registers the samples a customer sends. It creates a **job** (one consignment) with one or more **samples**, each with the tests the customer asked for. The job starts as **Received** and goes to the planner next.

You can book in two ways:

- **From an accepted quotation**: one click. Samples, tests, quantities and agreed prices come from the quotation.
- **Without a quotation**: you fill in the job, samples, tests and any deviations yourself, and give a reason.

## Who can use it

| What | Permission | Default roles |
| --- | --- | --- |
| Open **Book samples** | `jobs.create` | Admin, Sample Reception |
| Book from an accepted quotation | `quotations.convert` | Admin, Sales / Business Development, Sample Reception |
| Book without a quotation | `jobs.create` and `jobs.createWithoutQuotation` | Admin, Sample Reception |
| See customer names, contacts and addresses on the form | `customers.view` | Admin, Sample Reception and others |

Booking from a quotation never shows prices, so Sample Reception does not need `quotations.view`.

The **Book from an accepted quotation** section appears only when the Orders and quotations module (`quotations`) is on.

## Where to find it

Select **Samples** in the left menu, then **Book samples** at the top right.

:::note
On a phone, **Book samples** shows **Best on a larger screen**, because booking takes the customer, every sample, its tests and deviations in one long form. Select **Continue anyway** to book on the phone.
:::

## Book from an accepted quotation

**Goal:** create a job from a quotation the customer has accepted.

**Who can do it:** Sample Reception, Sales / Business Development, Admin (`quotations.convert`).

**Before you start:** the quotation is **Accepted** and has not been converted yet. See [Orders and quotations](/help/features/orders-quotations/).

**Steps:**

1. In **Samples**, select **Book samples**.
2. Under **Book from an accepted quotation**, find the quotation. The table shows **Quotation**, **Customer**, **Accepted**, **Samples** and **Tests**, oldest acceptance first.
3. Select **Book job** on its row.
4. Confirm with **Book job**.

**Result:** "Job … booked" appears and the new job opens. Each distinct sample description on the quotation becomes one sample with its tests. Each test keeps the quantity and the agreed amount from the quotation, so the invoice matches what the customer accepted.

**Related:** [Jobs and samples](/help/features/jobs-samples/).

<!-- screenshot: booking-from-quotation -->

A job booked from a quotation has no contact details, letter reference or photos yet, and no acknowledgement is sent. Fill those in on the job page, add sample photos, and send the acknowledgement from there. The job page reminds you until an acknowledgement has been emailed.

If there is nothing to book, the table says "No accepted quotations are waiting to be booked".

## Book without a quotation

**Goal:** register samples that arrived without a quotation.

**Who can do it:** Sample Reception, Admin (`jobs.create` and `jobs.createWithoutQuotation`).

**Before you start:** the customer exists, or you may create customers (`customers.edit`).

**Steps:**

1. In **Samples**, select **Book samples**.
2. Under **Book without a quotation**, choose the **Customer**. **Kind attention**, **Contact email**, **Contact phone** and **Report issue address** fill in from the customer's primary contact and report address.
3. Enter the **Reason for no quotation**.
4. Fill in the job details you have: letter or challan reference and date, PO, receipt mode and so on.
5. Tick **Urgent** if the customer needs results fast.
6. Under **Samples**, enter the first sample's **Description** and any other details.
7. Under **Requested tests**, tick the tests the customer asked for. Use **Filter by code or name** to find them.
8. Optional: add photos of the sample as received with **Add photos**, **Take photo** or **Use phone**.
9. For each further sample, select **Add sample** and repeat steps 6 to 8.
10. If anything about the samples differs from what was expected, select **Add deviation** and record it.
11. Under **After booking**, leave **Email the acknowledgement to …** ticked to send it now, or untick it to send it later.
12. Select **Book job**.

**Result:** "Job … booked" appears, followed by how many photos were saved and where the acknowledgement was emailed. The new job opens with status **Received**. Each sample gets its own number, and each requested test waits for planning.

**Related:** [Planning](/help/features/planning/), [Jobs and samples](/help/features/jobs-samples/).

<!-- screenshot: booking-without-quotation -->

If you try to leave the page before booking, the system asks you to confirm, because what you entered would be lost.

### Job details fields

| Field | What it means | Required |
| --- | --- | --- |
| **Customer** | Who sent the samples. Only active customers are offered. Type a name and choose **Create new customer** to add one (needs `customers.edit`); you come back here with it chosen. | Yes |
| **Reason for no quotation** | Why this job has no quotation, for example "Regular customer, standard rates". Up to 500 characters. Recorded with the job's first status. | Yes |
| **Letter / challan reference** | The number on the customer's covering letter or delivery challan. | No |
| **Letter / challan date** | The date on that letter or challan. | No |
| **Material specification** | The material standard or grade the customer quoted, for example "IS 2062 E250". | No |
| **PO number** | The customer's purchase order number. | No |
| **PO date** | The purchase order date. | No |
| **Receipt mode** | How the samples arrived, from the list in Masters (for example by hand or by courier). | No |
| **Kind attention** | The person reports and letters are addressed to. | No |
| **Contact email** | Where the acknowledgement and reports go. | No |
| **Contact phone** | The contact's phone number. | No |
| **Report issue details** | Any instructions for the report, such as the name to print. | No |
| **Report issue address** | The address printed on the report. | No |
| **Urgent** | Marks the job and its tests as urgent. | No |
| **Sample drawn by the laboratory** | Tick if your lab took the sample. The report then leaves out the "sample not drawn by our laboratory" statement. | No |

Fields that identify the customer (letter reference, PO number, contacts and report details) are shown only to people with `customers.view`.

### Sample fields

A job has 1 to 200 samples.

| Field | What it means | Required |
| --- | --- | --- |
| **Description** | What the sample is, for example "MS round bar, 25 mm". Up to 500 characters. | Yes |
| **Condition** | Its condition on arrival, for example "Sealed, no damage". | No |
| **Quantity** | How much was received, for example "2 pieces". | No |
| **Size** | Its dimensions. | No |
| **Returnable** | Tick if the customer wants the sample back after testing. Returnable samples appear in Dispatch for return. | No |
| **Attributes** | Extra details as label and value pairs, for example **Heat no.** "H1234". Select **Add attribute** for each. Up to 50. | No |
| **Requested tests** | The tests the customer asked for, from the test catalogue. Up to 200 per sample. You can also leave this empty and let the planner add tests. | No |
| **Photos** | Photos of the sample as received. Optional. | No |

### Deviation fields

A deviation records anything about the samples that departs from what was expected, such as a damaged seal, too little material or a missing document.

| Field | What it means | Required |
| --- | --- | --- |
| **Type** | The kind of deviation, from the list in Masters. | Yes |
| **Applies to** | **Whole job**, or one sample. Leave as **Whole job** unless one sample is affected. | No |
| **Remark** | What exactly is wrong. Up to 1000 characters. | No |

If you remove a sample, deviations on it change to **Whole job**, and deviations on later samples follow their sample.

## Sample photos at booking

Each sample has an optional **Photos** area:

- **Add photos** picks image files from the computer.
- **Take photo** uses the computer's camera.
- **Use phone** shows a QR code. Scan it with a phone to take photos there; they appear here marked **Phone**. See [Photos from a phone](/help/features/phone-upload/).

Photos are shrunk in the browser before upload, to about 2000 pixels on the long side. Select the cross on a photo to remove it.

Because the sample has no number until it is booked, photos wait: computer photos stay in your browser and phone photos wait in a holding area only you can see. Right after the job is saved, they are stored on their samples.

**Use phone** appears only when the Photos from a phone module (`phoneUpload`) is on, and not when you are already using the app on a phone. On a phone, **Add photos** lets you take a picture with the phone's own camera.
<!-- TODO(verify): confirm that the file picker offers the camera on common phone browsers (accept="image/*" without capture) -->

Deviations are printed on the Sample Request Form (SRF). See [Documents](/help/features/documents/).

## The acknowledgement email

The acknowledgement is the letter that tells the customer you received their samples.

- On **Book without a quotation**, the **Email the acknowledgement to …** box is ticked when there is a **Contact email**. The photos you added go with it (up to 12), two to a row on the letter.
- Without a contact email the box is disabled: "Add a contact email above to send it. You can also send it later from the job page."
- The email uses the **Samples received** template. See [Email templates](/help/admin/email-templates/).

The job is created first, then the photos are stored, then the email is queued. If a photo or the email fails, you see "… photo(s) or the acknowledgement could not be sent. Add or send them on the job page." The booking itself is never undone.

To send it later, or for a job booked from a quotation, use the acknowledgement on the job page. See [Jobs and samples](/help/features/jobs-samples/).

## What booking sets up

- **Numbers:** the job and each sample get numbers from [`numbering.formats`](/help/admin/settings/#numbering.formats) (for example `LAB/JOB/26-27/00012` and `LAB/S/26-27/000045`).
- **Status:** the job and its samples start as **Received**. Requested tests wait for the planner.
- **Rates:** each test's rate is fixed at booking: the accepted quotation's agreed amount, else the customer's rate, else the standard rate. A later rate change does not reach this job.
- **Retention:** each sample is kept until today plus [`retention.sampleDays`](/help/admin/settings/#retention.sampleDays) (default 90 days).

## Settings that affect booking

- [`numbering.formats`](/help/admin/settings/#numbering.formats): job and sample number formats.
- [`retention.sampleDays`](/help/admin/settings/#retention.sampleDays): how long samples are kept after booking.
- [`report.samplingStatement`](/help/admin/settings/#report.samplingStatement): the statement printed on reports unless **Sample drawn by the laboratory** is ticked.

## Tips

- Choose the customer first: the contact and report address fill in, and anything you typed yourself is left alone.
- Take photos at the counter with **Use phone** if the computer has no camera.
- Record deviations at booking. They print on the Sample Request Form and help explain results later.

## Limitations

- Booking from a quotation uses the quotation exactly. To add tests or samples, edit the job afterwards or ask the planner.
- One quotation can make only one job.
- Receipt modes and deviation types come from Masters. If the list is empty, ask whoever manages Masters to add them.
- At most 12 photos go on the acknowledgement.

## Related

- [Orders and quotations](/help/features/orders-quotations/)
- [Jobs and samples](/help/features/jobs-samples/)
- [Planning](/help/features/planning/)
- [Photos from a phone](/help/features/phone-upload/)
- [Documents](/help/features/documents/)
- [Email](/help/features/email/)
