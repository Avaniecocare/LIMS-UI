---
title: Masters
description: The master lists behind every booking, test and invoice - tests, parameters, methods, specifications, rates, units, formulas, instruments and more - with Excel import and export.
sidebar:
  order: 12
---

**Masters** holds the lists the rest of the system picks from: what you test, how, against which limits, with which instruments, and at what price. Open **Masters** from the side menu and pick a list on the left (on a phone, use **Choose a master**).

| Lists | View | Edit |
| --- | --- | --- |
| **Standard rates**, **Customer rates** | `rates.view` | `rates.edit` |
| All other lists | `masters.view` | `masters.edit` |

Most roles can view masters; only Admin can edit them by default, and Accounts can edit rates. See [Permissions](/help/admin/permissions/).

<!-- screenshot: masters-tests -->

## Working with a list

Every list works the same way:

- Search with the box at the top, and filter by **Active**, **Inactive** or **All** (active is shown by default).
- Click a column heading to sort, where sorting is offered.
- Click a row to edit it. An existing record has two tabs: **Details** and **History** (every change to the record, from the audit log).
- Click **Add** to create a record, fill in the fields and click **Save**.
- Untick **Active** to stop a record being offered for new work.

### Add or edit a record

**Goal**: keep a master list up to date.

**Who can do it**: Admin (`masters.edit`, or `rates.edit` for rates).

**Steps**:

1. Open **Masters** and choose the list.
2. Click **Add**, or click the record's row.
3. Fill in the fields. Required fields are marked.
4. Click **Save**.

**Result**: *list name*: **saved**. The record is offered at once wherever the list is used.

### Delete a record

**Goal**: remove a record entered by mistake.

**Who can do it**: Admin (`masters.edit`, or `rates.edit` for rates).

**Steps**:

1. Click the bin icon on the record's row.
2. Click **Delete** in **Delete this record?**.

**Result**: the record is removed from the list.

:::caution
Records already in use can only be deactivated, not deleted. For example, a test used on any sample cannot be deleted; untick **Active** instead. A deleted record's code stays reserved, so it can never later mean something else on old records.
:::

## The lists

### Tests

What the laboratory tests. Columns: **Code**, **Name**, **Category**, **Department**, **Method**, **Parameters**.

| Field | What it means | Required |
| --- | --- | --- |
| **Code** | Short unique code. | Yes |
| **Name** | | Yes |
| **Category** | Chemical, Mechanical, Physical or Other. | Yes |
| **Department** | From **Departments**. | No |
| **Test method** | From **Test methods**. | No |
| **Default TAT (working days)** | Turnaround time. Default 5. | No |
| **Urgent TAT (working days)** | Turnaround for urgent work. Default 2. Cannot be longer than the default TAT. | No |
| **In accreditation scope** | Tick if the test is in your accreditation scope. | No |
| **Accreditation valid until** | | No |
| **Stages, one per line** | The stages an analyst completes in order. Default: Sample Received by Analyst, Sample Preparation, Analysis, Calculation and Result Entry. | No |

### Test parameters

The values measured in each test. Columns: **Test**, **Code**, **Name**, **Kind**, **Unit**, **Decimals**, **Order**, **On report**.

| Field | What it means | Required |
| --- | --- | --- |
| **Test** | The test this parameter belongs to. | Yes |
| **Code**, **Name** | | Yes |
| **Kind** | **Numeric**, **Text**, **Result set** (pick from a list) or **Calculated** (from a formula). | Yes |
| **Unit** | From **Units**. | No |
| **Decimal places** | Default 2. | No |
| **Order** | Position on the result sheet and report. | No |
| **Show on report** | Untick for working values such as dimensions, loads or individual readings. They stay on the test record but not on the report. | No |
| **Result set** | For kind **Result set**. | When kind is Result set |
| **Formula** | For kind **Calculated**. | When kind is Calculated |
| **Formula inputs** | For kind **Calculated**: one line per formula variable, written `variable=PARAMETER_CODE`. | When kind is Calculated |
| **In accreditation scope**, **Accreditation valid until** | Accreditation of this parameter. | No |

### Test methods

Columns: **Code**, **Name**, **Standard**. Fields: **Code**, **Name**, **Standard reference** (for example the IS or ASTM number), **In accreditation scope**, **Accreditation valid until**.

### Specifications and grades

Limits that results are judged against, for example a drinking water standard or a material grade. Columns: **Code**, **Name**, **Scope** (**General** or **Customer-specific**), **Limits**.

- **Customer (for a customer-wise specification)**: leave empty for a general specification.
- **Parameter limits**: choose a **Test**, then **Add parameter**, and enter a minimum, maximum or text limit for each parameter.

### Test and chemical groups

Packages of tests booked together. Columns: **Code**, **Name**, **Kind** (**Test group** or **Chemical group**), **Tests**. Use **Tests in this group** to add or remove tests.

### Result sets

Lists of allowed results for **Result set** parameters, for example "Detected / Not detected". Under **Allowed results**, click **Add result**, type the result and choose whether it **Counts as pass**, **Counts as fail** or has **No outcome**.

### Formulas

Calculations for **Calculated** parameters. Columns: **Code**, **Name**, **Expression**, **Version**.

- **Expression**: the calculation. Functions: avg, sum, min, max, abs, sqrt, round. Operators: + − * / ^ and brackets.
- **Decimal places** (default 2) and **Description**.
- **Test console**: type an expression in **Expression to try**, click **Check**, fill in the variables and see the result.

:::note
Saving a changed expression creates a new version. Results already calculated keep the version they used.
:::

### Instruments

Columns: **Code**, **Name**, **Department**, **Last calibrated**, **Calibration due** (shown red with "overdue" when past). Fields: **Code**, **Name**, **Serial no.**, **Department**, **Last calibrated**, **Calibration due**. An existing instrument also has **Calibration certificates**, where you attach the certificate files.

Whether an overdue instrument can still be used depends on the setting **Block instruments past calibration due date**. See [Settings](/help/admin/settings/#controls).

### Departments

**Code** and **Name**.

### Units

**Code**, **Name** and **Symbol** (required).

### Unit conversions

**From unit**, **To unit** and **Multiply by** (the factor). All required.

### Rates

**Standard rates** are the lab's price list; **Customer rates** are agreed prices for one customer. When a job is booked, the rate is taken from the accepted quotation, then the customer rate, then the standard rate, and frozen on the job.

| Field | Standard rates | Customer rates |
| --- | --- | --- |
| **Customer** | | Required |
| **Test** | Required | Required |
| **Rate (₹)** | Required | Required |
| **Effective from** | Required | Required |
| **Effective to** | Optional | Optional |

Changing a rate never changes work already booked.

### Remark templates

Ready-made remarks offered when results are entered. Fields: **Code**, **Suggest when** (**Any result**, **Result passes** or **Result fails**), **Only for test** (optional) and **Text**.

### Deviation types and modes

Short lists used on forms. **Kind** is **Deviation type**, **Receipt mode** or **Dispatch mode**; each entry has a **Code** and a **Label**.

## Export and import with Excel

Every list has **Export Excel**, which downloads the active and inactive records as a spreadsheet.

Most lists also have **Import Excel**, for people who can edit them. Import is not offered for **Specifications and grades**, **Test and chemical groups** and **Result sets**.

### Import records from Excel

**Goal**: add or update many records at once.

**Who can do it**: Admin (`masters.edit`, or `rates.edit` for rates).

**Before you start**: click **Export Excel** on the same list and use that file as your template. The first row must keep the column headings exactly as exported.

**Steps**:

1. Fill in or change rows in the spreadsheet (`.xlsx`). Only the first sheet is read.
2. In **Masters**, open the same list and click **Import Excel**.
3. Choose the file.

**Result**: an **Import result** dialog shows how many records were created and updated.

How rows are matched:

- A row whose code already exists updates that record; a new code creates a record.
- Rows that refer to other lists use their codes, for example a parameter's **Test code** or a conversion's **From** and **To** unit codes.
- Rates are matched on the test (and customer) and **Effective from** date.

:::caution
Import is all or nothing. If any row has a problem, nothing is saved and the dialog lists each row number with what is wrong. Fix those rows and upload the file again. At most 5000 rows can be imported at a time.
:::

## Lab-type templates

A new laboratory can start from a ready test catalogue in the [lab setup wizard](/help/admin/setup-wizard/#lab-type-templates): water and wastewater, ambient air and stack emission, soil, noise, and materials and metals. Templates add departments, units, methods, tests, parameters, result sets, specifications, groups and remark templates. They set no prices and nothing accredited, and only add what is missing.

## Related

- [Lab setup wizard](/help/admin/setup-wizard/)
- [Terms and holidays](/help/admin/terms-holidays/): working days for TAT.
- [Settings](/help/admin/settings/)
- [Permissions](/help/admin/permissions/)
