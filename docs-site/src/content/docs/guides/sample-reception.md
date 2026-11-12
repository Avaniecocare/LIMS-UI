---
title: Sample Reception
description: The day of the reception desk in the LIMS, with step-by-step tasks for booking samples, labels, acknowledgements, deviations and holds.
sidebar:
  order: 4
---

Sample Reception receives samples at the front desk and turns them into jobs in the LIMS. Every job, sample number, label and acknowledgement starts here.

## Your day

- Samples arrive by courier, by hand, by post, or are collected by the lab. You check them against the customer's letter or challan.
- If the customer accepted a quotation, you book the job from it. If not, you book it directly with a reason.
- You note anything unexpected as a deviation: a damaged sample, a missing size, too little material.
- You print the sample labels and the sample request form (SRF), and stick the labels on.
- You send the customer an acknowledgement by email or WhatsApp, with photos of the samples as received if you took them.
- During the day you answer questions about where a job is, from the job's page.

## Screens you use

| Screen | What for |
| --- | --- |
| **Dashboard** | Today's numbers, and **Scan a label** on a phone |
| **Samples** | Every job and sample; **Book samples** |
| **Customers** | Customer details and contacts |
| **Masters** | Look up tests and deviation types (read only) |
| **Reports** | MIS reports such as daily sample collection and pending samples |

The Sample Reception role holds `jobs.view`, `jobs.create`, `jobs.createWithoutQuotation`, `jobs.edit`, `jobs.hold`, `quotations.convert`, `customers.view`, `masters.view` and `mis.view`.

:::note
By default Sample Reception can view customers but not add them. If a new customer walks in, ask Sales or your administrator to add the customer first, or ask for the `customers.edit` permission.
:::

## How to book samples from an accepted quotation

**Goal**: Create a job with the samples and tests the customer accepted.

**Who can do it**: Sample Reception (`quotations.convert` and `jobs.create`). The orders and quotations module must be on.

**Before you start**: The quotation must be **Accepted** and not yet converted.

**Steps**:

1. Select **Samples** in the menu.
2. Select **Book samples**.
3. Under **Book from an accepted quotation**, find the quotation by its number and customer.
4. Select **Book job** on its row.
5. In **Book a job from …?**, select **Book job**.

**Result**: The message "Job … booked" appears and the new job's page opens, with the quotation's samples and tests.

:::caution
A quotation can be booked only once. If the customer sends more samples later, book them as a new job.
:::

**Related**: [Booking](/help/features/booking/), [Orders and quotations](/help/features/orders-quotations/)

## How to book samples without a quotation

**Goal**: Create a job directly, for a customer who sent samples without a quotation.

**Who can do it**: Sample Reception (`jobs.create` and `jobs.createWithoutQuotation`).

**Before you start**: The customer must exist in **Customers**. Booking is a long form, best done on a computer or tablet.

**Steps**:

1. Select **Samples**, then **Book samples**.
2. Under **Book without a quotation**, in **Job details**, choose the **Customer** by typing its name or CRN.
3. Enter the **Reason for no quotation**, for example "Regular customer, standard rates".
4. Fill in what you have from the letter: **Letter / challan reference**, **Letter / challan date**, **Material specification**, **PO number**, **PO date**, **Receipt mode**, **Kind attention**, **Contact email**, **Contact phone**, **Report issue details** and **Report issue address**.
5. Tick **Urgent** if the customer asked for urgent testing. Tick **Sample drawn by the laboratory** if your lab took the sample.
6. For **Sample 1**, enter the **Description**, and if known the **Condition**, **Quantity** and **Size**. Tick **Returnable** if the customer wants the sample back. Use **Add attribute** for anything else, such as a heat number.
7. Choose the **Requested tests** for the sample.
8. Optional: add photos with **Add photos**, **Take photo** or **Use phone**.
9. Select **Add sample** for each further sample and repeat steps 6 to 8.
10. If anything is not as expected, select **Add deviation**, choose the **Type**, choose what it **Applies to** (leave **Whole job** unless one sample is affected) and add a **Remark**.
11. Under **After booking**, leave **Email the acknowledgement to …** ticked to send it at once, or untick it to send later.
12. Select **Book job**.

**Result**: The message "Job … booked" appears and the job's page opens. Each sample has its sample number. If you left the acknowledgement ticked, it is queued for email with the photos you added.

| Field | What it means | Required |
| --- | --- | --- |
| **Customer** | Who the job is for | Yes |
| **Reason for no quotation** | Why there is no quotation; shown on the job | Yes |
| **Receipt mode** | How the samples came in, for example *Courier* or *By hand* | No |
| **Description** | What the sample is; printed on the label and the report | Yes |
| **Returnable** | The sample goes back to the customer after testing | No |
| **Requested tests** | What the customer asked for; the planner confirms them | No |

:::tip
A sample booked without requested tests can still be planned later. The planner adds the tests.
:::

<!-- screenshot: booking-without-quotation -->

**Related**: [Booking](/help/features/booking/), [Phone upload](/help/features/phone-upload/)

## How to print labels and the SRF

**Goal**: Print the sample labels and the sample request form for a job.

**Who can do it**: Anyone who can view the job (`jobs.view`).

**Steps**:

1. Open the job: select **Samples**, then the job number, or search for it with **Ctrl+K**.
2. Select the **Documents** tab.
3. Select **All labels** for every sample's label, or **Sample request form** for the SRF.
4. Wait while the document is prepared. It opens in a new tab.
5. Print it from the browser.

**Result**: The PDF opens. Labels are 70 × 40 mm, one per page, with the sample number and a QR code.

To print one sample's label, select **Label** on that sample's card in the **Samples** tab.

**Related**: [Documents](/help/features/documents/), [System requirements](/help/getting-started/system-requirements/)

## How to email the acknowledgement

**Goal**: Send the customer the samples-received letter, with photos if you have them.

**Who can do it**: Sample Reception (`jobs.create` or `jobs.edit`).

**Before you start**: To include photos, add them to the samples first (on the sample card, or at booking).

**Steps**:

1. Open the job and select the **Documents** tab.
2. Under **Acknowledgement emails**, select **Email acknowledgement**.
3. Check **To** (the job's contact email is filled in) and add a **Cc** if needed.
4. Under **Photos of the samples as received**, tick the photos to include.
5. Optional: select **Preview letter** to check it.
6. Select **Send**.

**Result**: The message "Acknowledgement queued" appears. The email shows in the delivery log on the same card once it is sent.

**Related**: [Email](/help/features/email/), [Jobs and samples](/help/features/jobs-samples/)

## How to send the acknowledgement on WhatsApp

**Goal**: Send the samples-received letter to the customer's WhatsApp.

**Who can do it**: Sample Reception (`jobs.create` or `jobs.edit`). The WhatsApp module must be on and set up.

**Before you start**: The customer must have agreed to receive messages from your lab on WhatsApp.

**Steps**:

1. Open the job and select the **Documents** tab.
2. Under **Acknowledgement emails**, select **WhatsApp**.
3. Choose the **Customer contact**, or choose **Someone else** and type the **WhatsApp number**. Indian numbers can be written without +91.
4. Optional: enter a **Greeting name**. Empty means "Sir/Madam".
5. Tick **The customer agreed to receive messages from us on WhatsApp**.
6. Select **Send on WhatsApp**.

**Result**: The message "Queued for WhatsApp. The PDF is attached once it is ready." appears. Its status (**Sending**, **Sent**, **Delivered**, **Read** or **Failed**) shows under **Sent before**.

**Related**: [WhatsApp](/help/features/whatsapp/)

## How to record a deviation after booking

**Goal**: Note something unexpected about a sample that you find after the job is booked.

**Who can do it**: Sample Reception (`jobs.edit` or `jobs.create`).

**Steps**:

1. Open the job. The **Samples** tab is shown.
2. Under **Deviations**, select **Add deviation**.
3. Choose the **Type**, for example *Insufficient quantity*.
4. Choose what it **Applies to**: **Whole job** or one sample.
5. Add a **Remark**.
6. Select **Add deviation**.

**Result**: The deviation appears in the list with the time it was recorded.

**Related**: [Jobs and samples](/help/features/jobs-samples/)

## How to correct job or sample details

**Goal**: Fix a mistake in the job details or a sample after booking.

**Who can do it**: Sample Reception (`jobs.edit`).

**Before you start**: A job that is **Completed** or **Cancelled** can no longer be edited.

**Steps**:

1. Open the job.
2. To change the job: select the **Job details** tab, change the fields, and select **Save job details**.
3. To change a sample: in the **Samples** tab, select **Edit** on the sample's card, change the fields, and select **Save sample**.

**Result**: The message "Job saved" or "Sample saved" appears. The change is recorded in the **History** tab.

**Related**: [Jobs and samples](/help/features/jobs-samples/)

## How to put a job on hold

**Goal**: Stop planning and testing on a job, for example while you wait for the customer to confirm the tests.

**Who can do it**: Sample Reception or Lab Manager / Planner (`jobs.hold`).

**Steps**:

1. Open the job.
2. Select **Put on hold**.
3. Enter the **Reason**.
4. Select **Put on hold**.

**Result**: The job shows **On Hold** and the reason at the top of its page. To restart work, select **Release hold**, then **Release hold** again. The job returns to the status it had before.

**Related**: [Jobs and samples](/help/features/jobs-samples/)

## How to report a problem

**Goal**: Tell the quality team about something wrong with a job: a damaged sample, a mix-up, equipment, anything.

**Who can do it**: Anyone who can view jobs (`jobs.view`). The quality module must be on.

**Steps**:

1. Open the job.
2. Select **Report a problem**.
3. Enter **In a few words** and **What happened**.
4. Choose **How serious** it is and **Where it came from**. **Concerns** is filled in with the job number.
5. Select **Report**.

**Result**: The message "Reported as …" appears with the non-conformance number. You can follow it under **Problems I reported** in **My account**.

**Related**: [Quality](/help/features/quality/), [Quality Manager guide](/help/guides/quality-manager/)
