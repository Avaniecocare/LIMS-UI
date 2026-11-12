---
title: Authorised Signatory
description: The day of an authorised signatory in the LIMS, with step-by-step tasks for signing, rejecting, issuing, emailing, sending on WhatsApp and revising test reports.
sidebar:
  order: 9
---

The Authorised Signatory gives the final approval to a test report with an electronic signature, then issues it to the customer. You can also start a revision of an issued report.

## Your day

- Your dashboard's **My work** shows **Reports to sign** and **Reports to issue**.
- In **Approvals**, tab **Sign**, you read each report that passed review and sign it, or reject it.
- Signing freezes the report. The system gives it a ULR number if NABL mode applies, and prepares the final PDF with its verification QR code.
- In the **Issue** tab you issue signed reports and email them to the customer, or send them on WhatsApp.
- When a customer needs a correction to an issued report, you start a revision with a reason.

## Screens you use

| Screen | What for |
| --- | --- |
| **Dashboard** | **Reports to sign**, **Reports to issue**; quality tiles |
| **Approvals** | Tabs **Sign**, **Issue** and **Issued** |
| A report's page | Preview, photos, revisions and tests, delivery log, history |
| **Samples**, **Customers** | The job and customer behind a report (read only) |
| **My account** | Your password (your signature) and two-factor login |

The Authorised Signatory role holds `reports.view`, `reports.approve`, `reports.issue`, `reports.revise`, `jobs.view`, `customers.view`, `tests.viewAll` and `analytics.quality`.

:::note
Your administrator uploads your signature image and designation in **Admin**, **Users**. They are printed on the reports you sign. Two-factor login is offered for your role in **My account**.
:::

## How to approve and sign a report

**Goal**: Give the final approval to a reviewed report with your electronic signature.

**Who can do it**: Authorised Signatory (`reports.approve`).

**Before you start**: The report shows **Pending Approval**. You cannot sign a report you reviewed yourself, unless your administrator has relaxed that control.

**Steps**:

1. Select **Approvals**, then the **Sign** tab.
2. Open the report.
3. Read the **Preview**, and check **Photos** and **Revisions and tests**.
4. Select **Approve and sign**.
5. Read "This is your electronic signature." Enter **Your password**.
6. Select **Sign and approve**.

**Result**: The message "Report approved and signed" appears. The status becomes **Approved**. The final PDF is prepared in the background, normally within seconds.

:::caution
After signing, the content is frozen. Any later change needs a new revision with a stated reason.
:::

<!-- screenshot: approve-and-sign-dialog -->

**Related**: [Reports](/help/features/reports/), [Key concepts](/help/getting-started/concepts/)

## How to reject a report

**Goal**: Send a report back instead of signing it.

**Who can do it**: Authorised Signatory (`reports.approve`) while the report is **Pending Approval**.

**Steps**:

1. Open the report from the **Sign** tab.
2. Select **Reject**.
3. Enter the **Reason**.
4. Under **What needs to happen**, choose **Correct the report**, or **Send tests back for re-testing** and tick the **Tests to send back**.
5. Select **Reject**.

**Result**: The report returns to **Draft** with your reason shown at the top. Re-tested tests go back to their technicians.

**Related**: [Report Reviewer guide](/help/guides/report-reviewer/)

## How to issue a report and email it

**Goal**: Release a signed report to the customer.

**Who can do it**: Authorised Signatory (`reports.issue`).

**Before you start**: The report shows **Approved** and its final PDF is ready. If the customer's report release is withheld until payment, the report cannot be issued until the payment is received.

**Steps**:

1. Select **Approvals**, then the **Issue** tab.
2. Open the report.
3. Select **Issue**.
4. In **Email to (optional)**, enter the customer's email address, and add a **Cc** if needed. Leave it empty to issue without emailing.
5. Select **Issue report**.

**Result**: The message "Report issued and queued for email" (or "Report issued") appears. The status becomes **Issued**. The email shows in the **Delivery** tab once sent.

:::caution
Once issued, the report can only be changed by a new revision.
:::

If the page says "The PDF is taking longer than usual", select **Prepare it again**.

**Related**: [Email](/help/features/email/), [Reports](/help/features/reports/)

## How to email an issued report again

**Goal**: Send the issued PDF again, for example to another contact.

**Who can do it**: Authorised Signatory (`reports.issue`).

**Steps**:

1. Open the issued report (from **Approvals**, tab **Issued**, or with **Ctrl+K**).
2. Select **Email again**.
3. Enter **Email to** and optionally **Cc**.
4. Select **Send**.

**Result**: The message "Email queued" appears. The issued PDF is attached.

**Related**: [Email](/help/features/email/)

## How to send a report on WhatsApp

**Goal**: Send the issued report PDF to the customer's WhatsApp.

**Who can do it**: Authorised Signatory (`reports.issue`). The WhatsApp module must be on and set up.

**Before you start**: The report shows **Issued**, and the customer has agreed to receive messages from your lab on WhatsApp.

**Steps**:

1. Open the issued report.
2. Select **WhatsApp**.
3. Choose the **Customer contact**, or **Someone else** and type the **WhatsApp number**.
4. Optional: enter the **Greeting name**.
5. Tick **The customer agreed to receive messages from us on WhatsApp**.
6. Select **Send on WhatsApp**.

**Result**: The message "Queued for WhatsApp. The PDF is attached once it is ready." appears. The message's status shows under **Sent before**: **Sending**, **Sent**, **Delivered**, **Read** or **Failed**.

<!-- screenshot: whatsapp-send-report -->

**Related**: [WhatsApp](/help/features/whatsapp/)

## How to revise an issued report

**Goal**: Start a new revision when an issued report must change.

**Who can do it**: Authorised Signatory (`reports.revise`).

**Steps**:

1. Open the issued report.
2. Select **Revise**.
3. Enter the **Reason**. It is kept with the new revision as its **Reason for revision**.
4. Select **Start revision**.

**Result**: The message "New revision started" appears. The new revision starts as a draft and goes through review and signing again. The issued revision stays valid until the new one is issued; then it becomes **Superseded**.

**Related**: [Reports](/help/features/reports/), [Key concepts](/help/getting-started/concepts/)

## How a customer checks a report is genuine

Every signed report carries a QR code. Anyone who scans it, without signing in, sees **Test report verification**: whether it is a **Genuine report**, the results on it, and **Check a PDF copy** to confirm a file has not been changed. A report replaced by a later revision says **This report has been replaced**.

**Related**: [Reports](/help/features/reports/)
