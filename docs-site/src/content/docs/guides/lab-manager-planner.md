---
title: Lab Manager / Planner
description: The day of the lab manager or planner in the LIMS, with step-by-step tasks for planning tests, assigning work, job cards, holds and workload.
sidebar:
  order: 5
---

The Lab Manager / Planner decides what each sample is tested for, against which specification, by whom and on which instrument. They keep the lab's work moving and on time.

## Your day

- New jobs arrive from reception. Your dashboard's **My work** shows **Tests to plan** and **Tests to assign**.
- For each job you choose the specification or grade, confirm the tests, and add instructions for the technician.
- You assign tests to technicians and instruments, looking at each person's open, overdue and urgent work.
- You print job cards for the bench.
- You watch for tests past their due date and move work between people when someone is away.
- When a customer or the lab needs to pause, you put jobs or tests on hold.

## Screens you use

| Screen | What for |
| --- | --- |
| **Dashboard** | **Tests to plan**, **Tests to assign**, operations tiles such as **TAT crossed** |
| **Planning** | Plan and assign tests: tabs **Unplanned**, **Unassigned**, **Assigned** |
| **Samples** | Jobs and samples; hold, release and cancel |
| **Analytics** | Operations and people charts |
| **Reports** | MIS reports such as **Pending Plan Detail** and **Pending Tests Summary** |
| **Quality**, **Files**, **Masters** | View equipment status, the file library and the test catalogue |

The Lab Manager / Planner role holds `planning.view`, `planning.edit`, `jobs.view`, `jobs.hold`, `jobs.cancel`, `tests.viewAll`, `tests.hold`, `masters.view`, `analytics.operations`, `analytics.people` and `mis.view`. New installations also give it `files.view` and `quality.view`.

:::note
Planning is a wide screen. On a phone it first says **Best on a larger screen**; use a computer or tablet.
:::

## How to plan samples on a job

**Goal**: Choose the specification and tests for a job's samples so they can be assigned.

**Who can do it**: Lab Manager / Planner (`planning.edit`).

**Before you start**: The job must not be **On Hold**, **Cancelled** or **Completed**. Each test must have parameters in **Masters**.

**Steps**:

1. Select **Planning**. The **Unplanned** tab lists tests requested at booking.
2. Choose the job in the job filter (**All jobs**), or select **Open in planning** on the job's page.
3. Select the rows to plan and select **Plan**. To plan samples that have no requested tests, select **Plan samples** at the top instead.
4. In **Plan samples on …**, tick the **Samples** to plan.
5. Choose the **Grade / specification**. Results are checked against its limits.
6. Optional: choose a **Second grade (dual grade)** to check results against both.
7. Optional: choose a **Test or chemical group** and select **Suggest tests** to add its tests.
8. Use **Add a test…** to add any other test. Remove one with its remove button.
9. For each test, optionally set the **Analysis mode** (**Spectro** or **Wet**), **Office instructions**, **Technical data**, **Assign to** and **Instrument**. **Later** in **Assign to** leaves the test in **Unassigned**.
10. Optional: add **Plan notes**.
11. Select **Create plan**.

**Result**: The message "Plan … created with … tests" appears. Each test gets a due date from its TAT, counting working days and holidays. Assigned tests appear in the technician's **My Tests**.

:::tip
You can plan samples from one job at a time. If the **Plan** button is greyed out, filter the list to a single job.
:::

<!-- screenshot: planning-plan-dialog -->

**Related**: [Planning](/help/features/planning/), [Key concepts](/help/getting-started/concepts/)

## How to assign tests to a technician

**Goal**: Give planned tests to a technician, and optionally an instrument.

**Who can do it**: Lab Manager / Planner (`planning.edit`).

**Steps**:

1. Select **Planning**, then the **Unassigned** tab.
2. Tick the tests to assign.
3. Select **Assign**.
4. Under **Technician**, choose the person. The table shows each person's **Open**, **In progress**, **Overdue** and **Urgent** work.
5. Under **Instrument (optional)**, choose an instrument or **No instrument**.
6. Select **Assign**.

**Result**: The message "… tests assigned" appears. The technician gets a notification and sees the tests in **My Tests**.

:::caution
If the person is not authorised for a test in **Quality**, a warning names the test. If your lab requires authorisation, the assignment is refused. An instrument marked **Calibration overdue** may be refused when the technician tries to use it.
:::

**Related**: [Planning](/help/features/planning/), [Quality](/help/features/quality/)

## How to reassign tests

**Goal**: Move tests to another technician, for example when someone is on leave.

**Who can do it**: Lab Manager / Planner (`planning.edit`).

**Steps**:

1. Select **Planning**, then the **Assigned** tab.
2. Tick the tests.
3. Select **Reassign**.
4. Choose the new technician. Under **Instrument (optional)**, leave **Keep the current instrument** or choose another.
5. Select **Reassign**.

**Result**: The message "… tests reassigned" appears and the tests move to the new person's **My Tests**.

**Related**: [Planning](/help/features/planning/)

## How to print a job card

**Goal**: Print the job card the bench works from.

**Who can do it**: Anyone with `planning.view` or `tests.viewAll`.

**Steps**:

1. Select **Planning** and filter to the job, or open the job and select the **Documents** tab.
2. Select **Job card**.
3. Print the PDF that opens in a new tab.

**Result**: The job card PDF opens.

**Related**: [Documents](/help/features/documents/)

## How to cancel a test

**Goal**: Remove a test the customer no longer wants, or that was added by mistake.

**Who can do it**: Lab Manager / Planner (`planning.edit` or `jobs.cancel`).

**Steps**:

1. Select **Planning** and find the test, or open the job and find it on the sample's card.
2. Select **Cancel** on the test's row.
3. Read the effect: the tests, reports and invoice lines it touches.
4. Select **Continue**, enter the **Reason for cancelling**, and select **Confirm cancellation**.

**Result**: The message "… cancelled" appears. The test shows **Cancelled** and is not billed.

:::caution
Cancelling cannot be undone. To stop work only for a while, put the test or job on hold instead.
:::

**Related**: [Jobs and samples](/help/features/jobs-samples/)

## How to hold and release a test

**Goal**: Pause one test, for example while an instrument is repaired.

**Who can do it**: Lab Manager / Planner or Head of Department (`tests.hold`). The technician working on it can too.

**Steps**:

1. Open the job (from **Samples** or with **Ctrl+K**) and select the test's name on the sample's card.
2. Select **Put on hold**, enter the **Reason**, and select **Put on hold**.
3. To restart, select **Release hold**, then **Release hold** again.

**Result**: While on hold the test shows **On Hold** with the reason. When released it returns to the status it had before.

To hold a whole job, see [How to put a job on hold](/help/guides/sample-reception/#how-to-put-a-job-on-hold).

**Related**: [Testing](/help/features/testing/)

## How to find late work

**Goal**: See which tests are past due or close to it.

**Who can do it**: Lab Manager / Planner (`mis.view`, `analytics.operations`).

**Steps**:

1. On the **Dashboard**, select the **TAT crossed** tile, or **Tests on hold**.
2. Or select **Reports** and open **TAT Crossed Sample Report**, **Pending Tests Summary** or **Test Result Pending Detail**.
3. Filter by department, technician or date, and export with **Excel** or **PDF** if needed.

**Result**: You see the late tests and who has them. Reassign them from **Planning** if needed.

**Related**: [MIS reports](/help/features/mis-reports/), [Dashboard and analytics](/help/features/dashboard-analytics/)
