---
title: Privacy
description: Log and answer privacy requests under the DPDP Act, find where someone's personal data is held, erase it, and keep the data breach log.
sidebar:
  order: 14
---

**Admin** → **Privacy** helps the laboratory meet the Digital Personal Data Protection Act 2023 (DPDP Act). The people whose personal data a testing lab holds are mainly its customers' contacts and its own staff. The tab has two registers: **Privacy requests** and **Data breaches**.

For the policy side (what is kept and why, erasure limits), see [Data protection](/help/security/data-protection/).

<!-- screenshot: admin-privacy -->

**Who can use it**: people with `privacy.manage` (the **Admin** role by default). They are also notified when a request is logged or a breach is recorded.

## Privacy requests

Each request shows the kind of **Request**, who it is **From**, when it was **Received**, the **Answer by** date and the **Status**: **Open**, **Overdue** (open after its answer-by date), **Done** or **Rejected**.

| Request | Meaning |
| --- | --- |
| **Access to data** | The person wants to know what personal data the lab holds about them. |
| **Correction** | The person wants their data corrected. |
| **Erasure** | The person wants their data erased. |
| **Grievance** | A complaint about how their data was handled. |
| **Consent withdrawn** | The person withdraws consent to the lab using their data. |

The **Answer by** date is the received date plus **Days to answer a privacy request** (`privacy.responseDays`, 30 calendar days by default) in [Settings](/help/admin/settings/#privacy).

### Log a request

**Goal**: record a privacy request so it is answered on time.

**Who can do it**: Admin (`privacy.manage`).

**Steps**:

1. In **Admin** → **Privacy**, click **Log a request**.
2. Choose the **Request** kind and the **Received on** date (not in the future).
3. Enter the person's **Name** and **Email**.
4. Under **What they asked**, write the request as received.
5. Click **Log request**.

**Result**: **Logged. Answer by** *date*. People with `privacy.manage` are notified.

### Find someone's personal data

**Goal**: see where a person's email address is held, to answer an access, correction or erasure request.

**Who can do it**: Admin (`privacy.manage`).

**Steps**:

1. In **Privacy requests**, click the request.
2. Read **Where this email address is held**.

**Result**: a list of every place the address appears, each marked **Can be erased** or **Kept**:

| Place | Can it be erased here? |
| --- | --- |
| Customer contact | **Can be erased** |
| Staff account | **Kept**. Change or switch off staff accounts in **Admin** → **Users**. |
| Job (contact on booking) | **Kept**: part of the job record. |
| Emails sent | **Kept**: the email delivery log. |

If the address is held nowhere, you see **Nowhere: no personal data with this address.**

### Erase personal data

**Goal**: carry out an erasure request or a withdrawal of consent.

**Who can do it**: Admin (`privacy.manage`).

**Before you start**: the request must be open and of kind **Erasure** or **Consent withdrawn**, and at least one place must show **Can be erased**.

**Steps**:

1. Open the request.
2. Click **Erase from customer contacts**.
3. Confirm your password if asked.

**Result**: the name, email, phone and designation are removed from every customer contact with that address; the contact's name becomes "Erased on request". The **Answer** box is filled with a suggested reply that says issued documents are kept as tax and accreditation rules require. The erasure is recorded in the audit log.

:::caution
Erasure cannot be undone. Jobs, reports, invoices and the email log keep what they recorded, because tax and accreditation rules require those records to stay unchanged. Tell the person this in your answer.
:::

### Answer a request

**Goal**: close a request with a recorded answer.

**Who can do it**: Admin (`privacy.manage`).

**Steps**:

1. Open the request.
2. In **Answer**, write what was done, or why the request is rejected. Keep a copy of what you sent to the person.
3. Click **Mark done** or **Reject**.

**Result**: **Request answered**. The request shows who answered it, when, and the answer. It cannot be reopened.

## Data breaches

Each breach shows when it was **Detected**, **What happened**, whether the **Board told** (or **Due by** the deadline, in red once past), whether **People told**, and the **Status** (**Open** or **Closed**).

Under the DPDP Rules, the Data Protection Board and the people affected must be told without delay, and the detailed report to the Board is due within 72 hours of detection. The log shows that deadline for each breach.

### Log a breach

**Goal**: record a personal data breach and start the 72-hour clock.

**Who can do it**: Admin (`privacy.manage`).

**Steps**:

1. In **Admin** → **Privacy**, click **Log a breach**.
2. Enter **Detected at** (not in the future) and, if known, **People affected** (an estimate is fine).
3. Describe **What happened** and the **Personal data affected**, for example "names, emails and phone numbers of customer contacts".
4. Optionally describe the **Containment so far**.
5. Click **Log breach**.

**Result**: **Logged. The report to the Board is due by** *date and time*. People with `privacy.manage` get a security notification.

### Update a breach

**Goal**: record when the Board and the people affected were told, and close the breach.

**Who can do it**: Admin (`privacy.manage`).

**Steps**:

1. Click the breach in **Data breaches**.
2. Fill in **Reported to the Board**, **People told** and, when finished, **Closed**.
3. Update **Containment and remedy**.
4. Click **Save**.

**Result**: **Breach updated**. Each update is recorded in the audit log.

## Related

- [Data protection](/help/security/data-protection/)
- [Lab profile](/help/admin/lab-profile/#support-and-legal): the privacy contact.
- [Audit log](/help/admin/audit-log/)
