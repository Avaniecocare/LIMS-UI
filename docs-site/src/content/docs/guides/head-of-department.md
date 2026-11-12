---
title: Head of Department
description: The day of a head of department in the LIMS, with step-by-step tasks for approving and sending back test results, holds and quality.
sidebar:
  order: 7
---

The Head of Department checks the results technicians submit and approves them, or sends them back with a reason. Approved results are locked and feed the test report.

## Your day

- Your dashboard's **My work** shows **Results to approve**.
- In **Approvals**, tab **Results**, you open each test's readings, limits and verdicts.
- You approve correct results, one at a time or several together.
- You send back results that need another look, with a reason the technician sees.
- You watch rejection rates and staff output on **Analytics**, and equipment and competency on **Quality**.

## Screens you use

| Screen | What for |
| --- | --- |
| **Dashboard** | **Results to approve**; quality tiles such as **Test rejection rate** |
| **Approvals** | Tab **Results**: tests waiting for approval |
| A test's page | The full test: stages, results, images, history |
| **Analytics** | Quality, people and equipment charts |
| **Reports** | MIS reports such as **Technician Analysis** |
| **Quality**, **Masters** | View equipment and authorisations; look up tests and specifications |

The Head of Department role holds `tests.approve`, `tests.viewAll`, `tests.hold`, `masters.view`, `analytics.quality`, `analytics.people` and `mis.view`. New installations also give it `quality.view`.

## How to approve results

**Goal**: Accept a technician's results so they can go on the report.

**Who can do it**: Head of Department (`tests.approve`).

**Before you start**: The test shows **Results Submitted**. You cannot approve results you entered yourself.

**Steps**:

1. Select **Approvals**. The **Results** tab opens.
2. Optional: narrow the list with the search box (**Search test, sample or job**) or the department filter.
3. Select the show-results button on a row to see each parameter's result, limits and verdict, and the **Overall** result.
4. Select **Approve** on the row.
5. In **Approve these results?**, select **Approve**.

**Result**: The message "… on … approved" appears and the test leaves the list. When every test on a sample is approved, the system creates the draft report.

:::note
If you entered the results yourself, **Approve** is greyed out with the note "You entered these results, so someone else must approve them."
:::

<!-- screenshot: approvals-results-tab -->

**Related**: [Approvals](/help/features/approvals/)

## How to approve several tests at once

**Goal**: Approve a batch of results you have checked.

**Who can do it**: Head of Department (`tests.approve`).

**Steps**:

1. In **Approvals**, tab **Results**, tick the tests.
2. Select **Approve selected**.
3. In **Approve … tests?**, select **Approve selected**.

**Result**: Each test is approved on its own. Any that cannot be approved, for example your own results, are listed afterwards with the reason.

**Related**: [Approvals](/help/features/approvals/)

## How to send results back

**Goal**: Return results to the technician for correction.

**Who can do it**: Head of Department (`tests.approve`).

**Steps**:

1. In **Approvals**, tab **Results**, find the test.
2. Select **Reject**.
3. In **Send these results back**, enter the **Reason**. The technician sees it.
4. Select **Reject**.

**Result**: The message "… on … sent back" appears. The test returns to **In Progress** with the technician, who sees **Sent back for correction** and a **Sent back to me** item on their dashboard.

**Related**: [Technician / Analyst guide](/help/guides/technician-analyst/)

## How to open the full test

**Goal**: See everything about a test before you decide: stages, images, worksheets and history.

**Who can do it**: Head of Department (`tests.viewAll`).

**Steps**:

1. In **Approvals**, tab **Results**, select the test's name.
2. Read the **Results** tab, then **Images, graphs and files** and **History**.

**Result**: The test opens read-only. The breadcrumb **Approvals** takes you back.

**Related**: [Testing](/help/features/testing/)

## How to hold and release a test

**Goal**: Pause a test, for example while you query the method.

**Who can do it**: Head of Department (`tests.hold`).

**Steps**:

1. Open the test.
2. Select **Put on hold**, enter the **Reason**, and select **Put on hold**.
3. To restart, select **Release hold**, then **Release hold**.

**Result**: The test shows **On Hold** with the reason until it is released.

**Related**: [Testing](/help/features/testing/)

## How to review your department's quality

**Goal**: See rejection rates, rejection reasons and output by technician and instrument.

**Who can do it**: Head of Department (`analytics.quality`, `analytics.people`, `mis.view`).

**Steps**:

1. Select **Analytics**.
2. Set the **Period**.
3. Read **Quality** (**Rejection reasons**) and **People and equipment** (**Output by technician**, **Output by instrument**).
4. For detail, select **Reports** and open **Technician Analysis** or **Performance Analysis: Technician-wise**.

**Result**: You see where results are being sent back and why.

**Related**: [Dashboard and analytics](/help/features/dashboard-analytics/), [MIS reports](/help/features/mis-reports/)
