---
title: Report Reviewer
description: The day of a report reviewer in the LIMS, with step-by-step tasks for checking, correcting, passing and rejecting draft test reports.
sidebar:
  order: 8
---

The Report Reviewer checks each draft test report before it goes to the authorised signatory. You correct what can be corrected on the draft, choose the photos it prints, and send back anything that needs re-testing.

## Your day

- Your dashboard's **My work** shows **Reports to review**: drafts and reports in review.
- The system creates a draft report for a sample as soon as all its tests are approved.
- You open each draft from **Approvals**, tab **Review**, and check the preview against the job.
- You correct the sample description, customer reference, kind attention or report remarks, and tick the sample photos to print.
- You submit the draft for review, check it, and pass it to the signatory, or reject it.

## Screens you use

| Screen | What for |
| --- | --- |
| **Dashboard** | **Reports to review**; quality tiles |
| **Approvals** | Tabs **Review** (sections **In review** and **Draft, not yet submitted for review**) and **Issued** |
| A report's page | Tabs **Preview**, **Photos**, **Revisions and tests**, **Delivery**, **History** |
| **Samples**, **Customers** | The job and customer behind a report (read only) |
| **Analytics** | Quality charts |

The Report Reviewer role holds `reports.view`, `reports.review`, `jobs.view`, `customers.view`, `tests.viewAll` and `analytics.quality`.

## How to correct a draft report

**Goal**: Fix the wording on a draft before review.

**Who can do it**: Report Reviewer (`reports.review`) or Authorised Signatory (`reports.approve`).

**Before you start**: The report shows **Draft**. Results cannot be changed here; to change a result, send the test back for re-testing.

**Steps**:

1. Select **Approvals**, then the **Review** tab.
2. Open the report under **Draft, not yet submitted for review**.
3. Check the **Preview** tab.
4. Select **Correct draft**.
5. Change the **Sample description**, **Customer reference**, **Kind attention** or **Report remarks**. Report remarks are printed on the report.
6. Select **Save correction**.

**Result**: The message "Draft corrected" appears and the preview updates. The change is recorded in **History**.

<!-- screenshot: report-correct-draft -->

**Related**: [Reports](/help/features/reports/), [Approvals](/help/features/approvals/)

## How to choose the photos printed on a report

**Goal**: Decide which sample photos appear on the report, with captions and size.

**Who can do it**: Report Reviewer (`reports.review`) or Authorised Signatory (`reports.approve`).

**Before you start**: The report shows **Draft**.

**Steps**:

1. Open the draft report and select the **Photos** tab.
2. Tick **Print on report** for each photo to include. Photos taken at booking are listed too.
3. For each ticked photo, add a **Caption**, choose the **Print size**, and move it earlier or later.
4. To add photos, select **Add photos** or **Take photo**.
5. Select **Save photos**.

**Result**: The message "… photo(s) will print on the report" appears.

**Related**: [Reports](/help/features/reports/), [Phone upload](/help/features/phone-upload/)

## How to submit a draft for review and pass it

**Goal**: Move a checked report on to the authorised signatory.

**Who can do it**: Report Reviewer (`reports.review`).

**Steps**:

1. Open the draft report.
2. Select **Submit for review**. The status becomes **In Review**.
3. Check the **Preview** and the **Revisions and tests** tab.
4. Select **Pass review**.

**Result**: The status becomes **Pending Approval** and the report appears in the signatory's **Sign** tab.

:::note
The reviewer and the signatory of a report must be different people, unless your administrator has relaxed that control. If you also hold the signatory role, another signatory signs the reports you reviewed.
:::

**Related**: [Authorised Signatory guide](/help/guides/authorised-signatory/)

## How to reject a report

**Goal**: Send a report back for correction or for re-testing.

**Who can do it**: Report Reviewer (`reports.review`) while the report is **In Review**.

**Steps**:

1. Open the report.
2. Select **Reject**.
3. Enter the **Reason**. Whoever corrects or re-tests sees it.
4. Under **What needs to happen**, choose:
   - **Correct the report**: the report returns to **Draft** for correction.
   - **Send tests back for re-testing**: then tick the **Tests to send back**.
5. Select **Reject**.

**Result**: The message "Report rejected for correction" or "Report rejected and tests sent back" appears. The draft shows a red box "Rejected at …" with your reason. Re-tested tests go back to their technician; when they are approved again, the draft refreshes.

**Related**: [Approvals](/help/features/approvals/), [Technician / Analyst guide](/help/guides/technician-analyst/)

## How to find an issued report

**Goal**: Look up a report that has already gone to the customer.

**Who can do it**: Anyone with `reports.view`.

**Steps**:

1. Select **Approvals**, then the **Issued** tab.
2. Search by report, sample or customer.
3. Open the report. The **Delivery** tab shows the email log.

**Result**: You see the issued report, its revisions, ULR, who reviewed and approved it, and when it was issued.

:::tip
Type the report number in the search box at the top (**Ctrl+K**) to open it from anywhere.
:::

**Related**: [Reports](/help/features/reports/), [Search and scanning](/help/features/search-scanning/)
