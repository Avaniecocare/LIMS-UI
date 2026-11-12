---
title: Dispatch
description: The day of the dispatch desk in the LIMS, with step-by-step tasks for recording dispatches, printing challans, and returning or disposing of samples.
sidebar:
  order: 10
---

Dispatch sends issued reports and returnable samples back to customers, and keeps track of samples held by the lab until they are returned or disposed of.

## Your day

- **Dispatch**, tab **Pending**, lists jobs with issued reports or returnable samples waiting to go.
- You record each dispatch: the reports and samples going out, the date, the mode and the courier or carrier.
- You print the dispatch challan to go with the package.
- You mark returnable samples as returned when the customer collects them.
- When samples reach the end of their retention, you record their disposal.

## Screens you use

| Screen | What for |
| --- | --- |
| **Dashboard** | On a phone, **Dispatch** and **Scan a label** |
| **Dispatch** | Tabs **Pending**, **Dispatches** and **Returnable samples** |
| **Approvals** | Tab **Issued**: issued reports (read only) |
| **Samples**, **Customers** | Jobs and customer contacts (read only) |
| **Masters** | Dispatch modes (read only) |

The Dispatch role holds `dispatch.view`, `dispatch.edit`, `reports.view`, `jobs.view`, `customers.view` and `masters.view`.

:::note
Dispatch is a module your administrator can turn off. If **Dispatch** is missing from your menu, the module is off.
:::

## How to record a dispatch

**Goal**: Record that reports and samples have left the lab for the customer.

**Who can do it**: Dispatch (`dispatch.edit`).

**Before you start**: The reports must be **Issued**. A report shows **Withheld until paid** if the customer's report release is withheld until payment; it cannot be dispatched until then.

**Steps**:

1. Select **Dispatch**. The **Pending** tab opens.
2. Find the job (search with **Search job**).
3. Select **Record dispatch** on its row.
4. Under **Reports**, tick the reports going out.
5. Under **Returnable samples**, tick the samples going back.
6. Check the **Dispatch date** (today is filled in) and choose the **Mode**.
7. For **Courier**, enter the **Courier name** and **Docket no.** (the tracking or consignment number). For **By hand**, enter the **Carrier name** and **Carrier contact**.
8. Optional: add **Remarks**.
9. Select **Save dispatch**.

**Result**: The message "Dispatch … recorded" appears with the dispatch number. The dispatch shows in the **Dispatches** tab, and returned samples are marked returned.

<!-- screenshot: record-dispatch-dialog -->

**Related**: [Dispatch](/help/features/dispatch/)

## How to print a dispatch challan

**Goal**: Print the challan that goes with the package.

**Who can do it**: Anyone with `dispatch.view`.

**Steps**:

1. Select **Dispatch**, then the **Dispatches** tab.
2. Find the dispatch by its number, the docket or the job. Narrow by **Dispatch date** if needed.
3. Select **Challan** on its row.
4. Print the PDF that opens in a new tab.

**Result**: The challan PDF opens.

**Related**: [Documents](/help/features/documents/)

## How to mark a sample returned

**Goal**: Record that a returnable sample went back to the customer, other than in a dispatch, for example when the customer collects it.

**Who can do it**: Dispatch (`dispatch.edit`).

**Steps**:

1. Select **Dispatch**, then the **Returnable samples** tab. **Due back** is shown.
2. Find the sample.
3. Select **Mark returned**.
4. Enter the **Date returned** and the **Return status**, for example "Collected by customer".
5. Select **Mark returned**.

**Result**: The message "… marked returned" appears. The sample moves to **Returned**.

**Related**: [Dispatch](/help/features/dispatch/)

## How to record disposal of a sample

**Goal**: Record that a sample past its retention date has been disposed of.

**Who can do it**: Dispatch (`dispatch.edit`).

**Before you start**: Check your lab's retention rules. Choose **Due for disposal** in the list to see samples past their **Keep until** date.

**Steps**:

1. Select **Dispatch**, then the **Returnable samples** tab.
2. Choose **Due for disposal** in the list filter.
3. Select **Mark disposed** on the sample.
4. Enter the **Date disposed**.
5. Select **Mark disposed**.

**Result**: The message "… marked disposed" appears. The sample moves to **Disposed**.

:::caution
This cannot be undone. A disposed sample cannot be returned to the customer.
:::

**Related**: [Dispatch](/help/features/dispatch/), [Key concepts](/help/getting-started/concepts/)

## How to find a report to send

**Goal**: Check which reports of a job are issued, and see the PDF.

**Who can do it**: Dispatch (`reports.view`).

**Steps**:

1. Select **Approvals**, then the **Issued** tab.
2. Search by report, sample or customer.
3. Open the report and look at the **Preview**.

**Result**: You see the issued report. Dispatch cannot email or issue reports; ask an authorised signatory.

**Related**: [Reports](/help/features/reports/)
