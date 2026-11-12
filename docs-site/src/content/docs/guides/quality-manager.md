---
title: Quality Manager
description: The day of the quality manager in the LIMS, with step-by-step tasks for equipment calibration, staff authorisation and training, and non-conformance and CAPA.
sidebar:
  order: 13
---

The Quality Manager keeps the lab's quality system running in line with ISO/IEC 17025: equipment is calibrated and maintained, analysts are authorised for the tests they do, and problems are worked through to a verified corrective action.

## Your day

- The **Quality** page's **Overview** shows **Equipment overdue**, **Equipment due soon**, **Authorisations expiring soon**, **Non-conformances open** and **Non-conformances overdue**. The **Dashboard** shows **Calibrations due**.
- You record calibrations, intermediate checks, maintenance, repairs and breakdowns as they happen, and keep each instrument's schedule.
- You authorise analysts for tests, record training, and withdraw authorisations when needed.
- Problems arrive as non-conformances, raised by you or by staff with **Report a problem** on a job or test. You give each an owner and a due date, and take it through action and verification to closure.

## Screens you use

| Screen | What for |
| --- | --- |
| **Dashboard** | **Calibrations due** |
| **Quality** | Tabs **Overview**, **Equipment**, **Competency** and **Non-conformance** |
| **Samples** | Jobs and samples behind a problem (read only) |
| **Masters** | Instruments, tests and methods (read only) |
| **Files** | Calibration certificates and SOPs (read only) |

The Quality Manager role holds `quality.view`, `quality.manage`, `masters.view`, `tests.viewAll`, `files.view` and `jobs.view`.

:::note
Quality management is a module your administrator can turn off. Whether instruments past calibration are blocked, and whether analysts must be authorised before they are assigned, are lab settings your administrator controls. See [Settings](/help/admin/settings/).
:::

## How to record calibration or maintenance

**Goal**: Record work done on an instrument and update its next due date.

**Who can do it**: Quality Manager (`quality.manage`).

**Steps**:

1. Select **Quality**, then the **Equipment** tab.
2. Find the instrument and select **Record**.
3. Choose **What was done**: **Calibration**, **Intermediate check**, **Maintenance**, **Repair** or **Breakdown**.
4. Choose the **Outcome**: **Pass**, **Adjusted, then passed** or **Fail**.
5. Enter the **Date done** and **Done by** (agency or person), and the **Certificate no.** if there is one.
6. Enter **Next due**, or leave it empty to use the instrument's interval from the date done.
7. Add **Notes** if needed.
8. Select **Record**.

**Result**: The message "Recorded. The due dates are updated." appears. The instrument's **Calibration due** or **Maintenance due** changes. Select **History** to see past records.

<!-- screenshot: quality-record-calibration -->

**Related**: [Quality](/help/features/quality/)

## How to set an instrument's schedule

**Goal**: Set how often an instrument is calibrated and maintained.

**Who can do it**: Quality Manager (`quality.manage`).

**Steps**:

1. Select **Quality**, then **Equipment**.
2. Select **Schedule** on the instrument.
3. Enter **Calibrate every (months)** and **Maintain every (months)**, and the **Next maintenance** date.
4. Select **Save schedule**.

**Result**: The message "Schedule saved" appears.

**Related**: [Quality](/help/features/quality/)

## How to authorise an analyst for a test

**Goal**: Record that an analyst is competent to perform a test.

**Who can do it**: Quality Manager (`quality.manage`).

**Steps**:

1. Select **Quality**, then **Competency**.
2. Under **Authorisations**, select **Authorise**.
3. Choose the **Analyst** and the **Test**.
4. Enter **Authorised on**, and **Valid until** if the authorisation should be re-evaluated, for example after a year.
5. Enter the **Evidence**, for example supervised trials, replicate results or proficiency testing.
6. Select **Authorise**.

**Result**: The message "Authorised" appears. When planners assign that test, they no longer see a warning for this analyst.

**Related**: [Quality](/help/features/quality/), [Planning](/help/features/planning/)

## How to withdraw an authorisation

**Goal**: Stop an analyst being treated as authorised for a test.

**Who can do it**: Quality Manager (`quality.manage`).

**Steps**:

1. Select **Quality**, then **Competency**.
2. Find the authorisation and select **Withdraw**.
3. Enter the **Reason**.
4. Select **Withdraw**.

**Result**: The message "Authorisation withdrawn" appears.

**Related**: [Quality](/help/features/quality/)

## How to record training

**Goal**: Keep a record of training a person received.

**Who can do it**: Quality Manager (`quality.manage`).

**Steps**:

1. Select **Quality**, then **Competency**.
2. Under **Training**, select **Add training**.
3. Choose the **Person** and enter the **Date**, the **Training**, the **Trainer** and the **Hours**.
4. Select **Record**.

**Result**: The message "Training recorded" appears.

**Related**: [Quality](/help/features/quality/)

## How to raise a non-conformance

**Goal**: Start the record of a problem so it is corrected and prevented.

**Who can do it**: Quality Manager (`quality.manage`). Staff at the bench and front desk use **Report a problem** instead.

**Steps**:

1. Select **Quality**, then **Non-conformance**.
2. Select **Raise a non-conformance**.
3. Choose the **Source**, for example **Complaint**, **Internal audit**, **External audit**, **Proficiency testing**, **Customer feedback** or **Routine work**.
4. Choose the **Severity**: **Minor**, **Major** or **Critical**.
5. Enter what it **Concerns** (a job, sample, test or report number), a **Title** and **What happened**.
6. Choose the **Owner** who works it through, or **Decide later**, and a **Due** date.
7. Select **Raise**.

**Result**: The message "… raised" appears with the non-conformance number. Its status is **Open**.

**Related**: [Quality](/help/features/quality/)

## How to work a non-conformance through to closure

**Goal**: Record the correction, root cause, corrective action and its verification, then close it.

**Who can do it**: Quality Manager (`quality.manage`).

**Steps**:

1. Select **Quality**, then **Non-conformance**, and open the non-conformance.
2. Select **Start action**. The status becomes **Action**.
3. Fill in **Correction** (what was done straight away), **Root cause** (why it happened) and **Corrective action** (what stops it happening again). Select **Save** as you go.
4. Select **Send for verification**. The status becomes **Verification**.
5. Fill in **Verification of effectiveness**: how the action was checked, by someone other than the owner.
6. Select **Verify and close**, or **Send back** if the action did not work.

**Result**: The message "… closed" appears and the status is **Closed**. The person who reported it sees **Closed** under **Problems I reported**. A closed non-conformance can be reopened with **Reopen**.

<!-- screenshot: quality-nc-dialog -->

**Related**: [Quality](/help/features/quality/)
