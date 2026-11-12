---
title: Sales / Business Development
description: The day of sales and business development in the LIMS, with step-by-step tasks for customers, orders and quotations.
sidebar:
  order: 3
---

Sales / Business Development looks after customers and turns their enquiries into accepted quotations that the lab can book.

## Your day

- Enquiries arrive by email, phone, letter or walk-in. You record each as an order so nothing is lost.
- You add new customers, with their GSTIN, contacts and addresses.
- You prepare quotations: samples, tests, quantities, discounts. The server works out rates, GST and totals.
- You send quotations by email and follow up. When the customer agrees, you record the acceptance.
- Your dashboard's **My work** shows **Draft quotations** still to finish.

## Screens you use

| Screen | What for |
| --- | --- |
| **Dashboard** | **Draft quotations** waiting on you |
| **Orders** | Enquiries and their stage: **New**, **Quoted**, **Won**, **Lost** |
| **Quotations** | All quotations, new quotations, sending and decisions |
| **Customers** | Customer records and history |
| **Samples** | See jobs booked from your quotations (read only) |
| **Masters** | Look up tests and rates (read only) |

The Sales / Business Development role holds `customers.view`, `customers.edit`, `orders.view`, `orders.edit`, `quotations.view`, `quotations.edit`, `quotations.send`, `quotations.decide`, `quotations.rateOverride`, `quotations.convert`, `masters.view`, `rates.view` and `jobs.view`.

:::note
Orders and quotations belong to a module your administrator can turn off. If **Orders** and **Quotations** are missing from your menu, the module is off.
:::

## How to add a customer

**Goal**: Create a customer record you can quote and book for.

**Who can do it**: Sales / Business Development (`customers.edit`).

**Steps**:

1. Select **Customers**, then **New customer**.
2. Enter the **Name**.
3. Enter the **GSTIN**. The **State**, **GST code** and **PAN** fill in from it.
4. Enter the **Credit days** if the customer has credit terms.
5. Under **Contacts**, select **Add contact** and enter the **Name**, **Email**, **Phone** and **Designation**. Tick **Primary** for the main contact.
6. Under **Addresses**, select **Add address**. Choose the **Type** (**Billing**, **Report** or **Other**), enter the **PIN code** first, then the **Address** and **Area / locality**. Use **Copy billing address** to reuse the billing address for reports.
7. Select **Save customer**.

**Result**: The message "Customer saved" appears and the customer's page opens with a new CRN.

:::tip
While writing a quotation or an order, type a name in the **Customer** box and choose **Create new customer**. After you save the customer you return to where you were, with the customer chosen.
:::

**Related**: [Customers](/help/features/customers/)

## How to record an enquiry as an order

**Goal**: Keep track of an enquiry before you quote for it.

**Who can do it**: Sales / Business Development (`orders.edit`).

**Steps**:

1. Select **Orders**, then **New order**.
2. Choose the **Customer**.
3. Enter **Received on**, the **Source** (**Email**, **Phone**, **Letter** or **Walk In**) and the customer's **Reference**.
4. Choose the **Owner**, or leave it **Unassigned**.
5. Enter a **Description** of what the customer wants.
6. Select **Save order**.

**Result**: The message "Order saved" appears. The order shows on **Orders** with the stage **New**.

**Related**: [Orders and quotations](/help/features/orders-quotations/)

## How to create a quotation

**Goal**: Prepare a priced offer for a customer.

**Who can do it**: Sales / Business Development (`quotations.edit`). Overriding a rate also needs `quotations.rateOverride`.

**Before you start**: The tests must exist in **Masters**, with standard or customer rates. Editing a quotation is best done on a computer or tablet.

**Steps**:

1. Select **Quotations**, then **New quotation**. From an order, select **Create quotation** on the order's page instead.
2. Choose the **Customer** and, if there is one, the **Order**.
3. Choose the **Document title**: **Quotation** or **Proforma Invoice**.
4. Optional: set **Valid until** (empty uses the default validity), **Estimated days**, **Contact person**, **Header discount %**, **Payment terms** and **Send samples to**.
5. Under **Lines**, for each test enter the **Sample description**, **Required quantity**, choose the **Test** and enter the **Quantity**. Add a **Discount %** for the line if needed.
6. To charge a different rate, enter a **Rate override** and an **Override reason**.
7. Press **Enter** in a line to add the next one. It keeps the same sample and goes straight to the test.
8. Select **Save draft**.

**Result**: The message "Draft saved. Totals are updated." appears. **Calculated by the server** shows the rates, tax and totals.

<!-- screenshot: quotation-editor-lines -->

**Related**: [Orders and quotations](/help/features/orders-quotations/), [Masters](/help/admin/masters/)

## How to send a quotation by email

**Goal**: Email the quotation PDF to the customer.

**Who can do it**: Sales / Business Development (`quotations.send`).

**Before you start**: The quotation is a **Draft** or **Sent**, and its validity date has not passed.

**Steps**:

1. Open the quotation from **Quotations**.
2. Select **Send** (or **Send again** if it was sent before).
3. Enter **To**, and optionally **Cc** and a **Message**.
4. Select **Send**.

**Result**: The message "Quotation queued for sending" appears. The quotation's status becomes **Sent** and the email shows in the **Sent** tab.

**Related**: [Email](/help/features/email/)

## How to record that the customer accepted

**Goal**: Mark the quotation accepted so the reception desk can book it.

**Who can do it**: Sales / Business Development (`quotations.decide`).

**Before you start**: The quotation must still be valid. An expired quotation must be revised first.

**Steps**:

1. Open the quotation.
2. If it was sent, select **Accept**. If the customer accepted on the phone or in person before you sent it, select **Customer accepted**.
3. In **Accept this quotation?**, select **Accept**.

**Result**: The status becomes **Accepted**. The quotation now appears under **Book from an accepted quotation** on the booking page. Prices and terms on that version are frozen.

**Related**: [Booking](/help/features/booking/)

## How to record a rejection

**Goal**: Close a quotation the customer turned down.

**Who can do it**: Sales / Business Development (`quotations.decide`).

**Steps**:

1. Open the sent quotation.
2. Select **Reject**.
3. Enter the **Reason**.
4. Select **Reject**.

**Result**: The status becomes **Rejected**. You can still revise it later if the customer comes back.

**Related**: [Orders and quotations](/help/features/orders-quotations/)

## How to revise a quotation

**Goal**: Change a quotation that has been sent, rejected or has expired.

**Who can do it**: Sales / Business Development (`quotations.edit`).

**Steps**:

1. Open the quotation.
2. Select **Revise**.
3. Enter the **Reason**.
4. Select **Revise**.
5. Select **Edit**, make the changes, and select **Save draft**.

**Result**: A new draft version is created. Earlier versions stay as they were under **Version history**.

**Related**: [Orders and quotations](/help/features/orders-quotations/)

## How to convert an accepted quotation to a job

**Goal**: Create the job yourself when the samples arrive, if reception has not booked it.

**Who can do it**: Sales / Business Development or Sample Reception (`quotations.convert`).

**Steps**:

1. Open the accepted quotation.
2. Select **Convert to job**.
3. In **Convert to a job?**, select **Convert to job**.

**Result**: The message "Job … created" appears. Select **Open job** to see it.

:::caution
A quotation can be converted only once.
:::

**Related**: [Booking](/help/features/booking/), [Sample Reception guide](/help/guides/sample-reception/)

## How to see a customer's history

**Goal**: See everything about one customer before you quote.

**Who can do it**: Anyone with `customers.view`. Each tab shows only what your role may see.

**Steps**:

1. Select **Customers** and open the customer.
2. Read the **Overview**: quotations, jobs, tests booked, reports issued and the most booked tests.
3. Open the **Quotations** or **Jobs** tab for the list.

**Result**: You see the customer's work with your lab in one place.

**Related**: [Customers](/help/features/customers/)
