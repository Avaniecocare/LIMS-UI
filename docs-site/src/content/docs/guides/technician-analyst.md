---
title: Technician / Analyst
description: The day of a technician or analyst in the LIMS, with step-by-step tasks for starting tests, entering and submitting results, attachments and corrections.
sidebar:
  order: 6
---

The Technician / Analyst carries out the tests assigned to them and enters the results. You see only your own tests, and you do not see customer names.

## Your day

- Your dashboard's **My work** shows **Tests assigned to me**, **My tests past due** and **Sent back to me**.
- **My Tests** lists your work with the most urgent first, then the soonest due.
- At the bench you scan a sample's label to open your test on it.
- You start the test, complete each stage in order, choose the instrument and type the results. They save as you type.
- You attach result images and worksheets, then submit the results for approval.
- If the head of department sends a test back, you correct it and submit again.

## Screens you use

| Screen | What for |
| --- | --- |
| **Dashboard** | What is waiting on you; on a phone, **My tests** and **Scan a label** |
| **My Tests** | Tabs **To do** and **Submitted and approved** |
| A test's page | Stages, results, remarks, images, worksheets, history |
| **My account** | Password, email preferences, problems you reported |

The Technician / Analyst role holds one permission, `tests.work`: work on assigned tests and enter results.

:::tip
**My Tests** and a test's page work fully on a phone or tablet. See [Using the LIMS on a phone](/help/guides/on-a-phone/).
:::

## How to find your next test

**Goal**: Open the test you should work on next.

**Who can do it**: Technician / Analyst (`tests.work`).

**Steps**:

1. Select **My Tests**. The **To do** tab lists your open tests, most urgent first.
2. Look at **Due**, **Urgent** and **Needs attention** (tests sent back or on hold).
3. Select the test to open it.

**Result**: The test's page opens with the sample number, job number, sample description, method and due date.

:::tip
With a barcode scanner, scan the sample label from any screen. It opens your test on that sample. On a phone, use **Scan a label** on the dashboard.
:::

**Related**: [Testing](/help/features/testing/), [Search and scanning](/help/features/search-scanning/)

## How to start a test and complete its stages

**Goal**: Begin work on an assigned test and record each stage as you finish it.

**Who can do it**: The technician the test is assigned to (`tests.work`).

**Before you start**: The test shows **Assigned**. The job must not be on hold or cancelled.

**Steps**:

1. Open the test.
2. Select **Start test**.
3. Read the **Instructions** card if there is one: **Analysis mode**, **Office instructions** and **Technical data** from the planner.
4. Under **Stages**, when you finish the first stage select **Complete**.
5. Repeat for each stage, in order. The next stage is marked **Next**.

**Result**: The test shows **In Progress**. Each completed stage shows "Done by" with your name and the time.

**Related**: [Testing](/help/features/testing/)

## How to enter results

**Goal**: Record the readings for each parameter.

**Who can do it**: The technician the test is assigned to (`tests.work`).

**Before you start**: The test shows **In Progress**.

**Steps**:

1. Under **Instrument and analyst**, choose the **Instrument** you used.
2. Under **Results**, type the value for each parameter in the **Result** column. Press **Enter** to move to the next reading.
3. For a value below or above what the method can measure, type `<` or `>` before it, for example `<0.005`.
4. Check **Limits** and **Pass or fail** for each row, and **Overall** at the top.
5. Optional: under **Remarks, observations and notes**, type in **Remarks**, **Observations** or **Notes**. Use **Add from a template…** to insert a standard remark.
6. Optional: use the **Unit converter** to convert a reading before you type it.

**Result**: Each entry is saved as you type; the bar at the bottom of the page shows the save status. Calculated parameters, such as averages or tensile strength, are worked out by the server.

:::caution
An instrument past its calibration due date may be refused, depending on your lab's settings. Tell your lab manager or quality manager.
:::

<!-- screenshot: test-result-entry -->

**Related**: [Testing](/help/features/testing/), [Key concepts](/help/getting-started/concepts/)

## How to add result images and worksheets

**Goal**: Attach photos, micrographs or worksheets to the test.

**Who can do it**: The technician the test is assigned to (`tests.work`).

**Steps**:

1. Open the test and select the **Images and worksheets** tab.
2. Under **Result images**, add PNG or JPEG images from this computer, or select **Use phone** to send photos from a phone.
3. Under **Worksheets**, add any worksheet files.

**Result**: The files are listed on the test. Result images can be printed on the report.

**Related**: [Phone upload](/help/features/phone-upload/), [Files](/help/features/files/)

## How to submit results for approval

**Goal**: Send finished results to the head of department.

**Who can do it**: The technician the test is assigned to (`tests.work`).

**Before you start**: Every stage is complete and every parameter has a result.

**Steps**:

1. Open the test.
2. Select **Submit results** in the bar at the bottom of the page.
3. In **Submit these results?**, select **Submit results**.

**Result**: The message "Results submitted for approval" appears. The test shows **Results Submitted** and is locked. It moves to the **Submitted and approved** tab of **My Tests**.

If something is missing, a message says what: for example "Complete every stage before submitting" or "Enter a result for: …".

**Related**: [Approvals](/help/features/approvals/)

## How to correct results that were sent back

**Goal**: Fix a test the head of department or a report reviewer sent back.

**Who can do it**: The technician the test is assigned to (`tests.work`).

**Steps**:

1. On the **Dashboard**, select **Sent back to me**, or open **My Tests** and look for "Sent back" in **Needs attention**.
2. Open the test. The box **Sent back for correction** shows the reason.
3. Correct the results, remarks or attachments.
4. Select **Submit results**, then **Submit results**.

**Result**: The test goes for approval again.

**Related**: [Testing](/help/features/testing/)

## How to put a test on hold

**Goal**: Pause your work on a test, for example while you wait for a reagent.

**Who can do it**: The technician the test is assigned to, or anyone with `tests.hold`.

**Steps**:

1. Open the test.
2. Select **Put on hold**.
3. Enter the **Reason** and select **Put on hold**.
4. To continue later, select **Release hold**, then **Release hold**.

**Result**: The test shows **On Hold** with your reason until it is released.

**Related**: [Testing](/help/features/testing/)

## How to print test data

**Goal**: Print the test's data sheet for your records or the bench file.

**Who can do it**: The technician the test is assigned to (`tests.work`), or anyone with `tests.viewAll`.

**Steps**:

1. Open the test.
2. Select **Print test data**.
3. Print the PDF that opens in a new tab.

**Result**: The test data PDF opens.

**Related**: [Documents](/help/features/documents/)

## How to report a problem

**Goal**: Tell the quality team about something wrong: equipment, a reagent, the sample, the method.

**Who can do it**: Technician / Analyst (`tests.work`). The quality module must be on.

**Steps**:

1. Open the test.
2. Select **Report a problem**.
3. Enter **In a few words**, for example "Balance reading drifts during weighing", and **What happened**.
4. Choose **How serious**: **Minor: worth fixing**, **Major: results may be affected** or **Critical: stop and check now**.
5. Choose **Where it came from**. **Concerns** already holds the sample and test.
6. Select **Report**.

**Result**: The message "Reported as …" appears. Follow its progress (**Received**, **Being fixed**, **Being checked**, **Closed**) under **Problems I reported** in **My account**.

**Related**: [Quality](/help/features/quality/)
