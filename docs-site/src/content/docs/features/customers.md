---
title: Customers
description: Add and maintain customers, their contacts and addresses, and see each customer's full history in one place.
sidebar:
  order: 1
---

A customer is the company that sends you samples and pays your invoices. Every quotation, job, report and invoice belongs to one customer. The customer page is also that customer's history: quotations, jobs, tests, reports, money and files, each on its own tab.

## Who can use it

| What | Permission | Default roles |
| --- | --- | --- |
| Open the customer list and customer pages | `customers.view` | Admin, Sales / Business Development, Sample Reception, Report Reviewer, Authorised Signatory, Dispatch, Accounts, Management, Document Controller |
| Create and edit customers, mark them inactive | `customers.edit` | Admin, Sales / Business Development |

Customer identity (name, contacts, addresses) needs `customers.view` everywhere in the system, including on jobs and documents. Planners, Heads of Department and technicians work from job and sample codes instead.

## Where to find it

Select **Customers** in the left menu. On a phone, **Customers** is in the bottom bar or under **More**.

<!-- screenshot: customers-list -->

The list shows **CRN**, **Customer**, **GSTIN**, **State**, **Credit days**, **Primary contact** and **Status** (**Active** or **Inactive**). Select a row to open the customer.

- **Search name, CRN or GSTIN** finds customers as you type.
- The status filter shows **Active** customers by default. Choose **Inactive** or **All** to see the others.
- **Export Excel** downloads every customer with their GSTIN, state, credit days and whether they are active.

## Add a customer

**Goal:** create a customer so you can quote, book and invoice for them.

**Who can do it:** Admin, Sales / Business Development (`customers.edit`).

**Steps:**

1. In **Customers**, select **New customer**.
2. Under **Customer details**, enter the **Name**.
3. Enter the **GSTIN** if the customer has one. The **State**, **GST code** and **PAN** fill in by themselves.
4. Fill in **Credit days**, or leave it empty for the lab's default.
5. Under **Contacts**, select **Add contact** and fill in the person's details. Tick **Primary** for the main contact.
6. Under **Addresses**, select **Add address**. The first address is a **Billing** address. Type the **PIN code** first: the city, state, GST code and area choices fill in.
7. To use the same address for reports, select **Copy billing address**. The copy is added with the type **Report**.
8. Select **Save customer**.

**Result:** the message "Customer saved" appears and the customer page opens. The system gives the customer a CRN (customer number), for example `CRN-00042`. A CRN is never reused.

**Related:** [Orders and quotations](/help/features/orders-quotations/), [Book samples](/help/features/booking/).

<!-- screenshot: customers-new-form -->

### Add a customer while you work

You do not have to leave a quotation, order or booking to add a customer. In any **Customer** picker, type the name and choose **Create new customer** at the top of the list. The **New customer** page opens with the name filled in. When you select **Save customer**, you go back to where you were, with the new customer chosen.

`Create new customer` appears only for people with `customers.edit`.

## Customer form fields

### Customer details

| Field | What it means | Required |
| --- | --- | --- |
| **Name** | The customer's registered name, for example "Contoso Forgings Ltd". 2 to 200 characters. | Yes |
| **Credit days** | Days the customer has to pay. An invoice's due date is its invoice date plus these days. 0 to 365. | No (empty uses the lab's default) |
| **GSTIN** | The customer's 15-character GST number. The system checks its format and check digit, and that its first two digits match the **GST code**. | No |
| **PAN** | 10-character PAN. Filled from the GSTIN if empty. | No |
| **State** | The customer's state. Choose or type a state name; choosing an official state also sets the **GST code**. | Yes |
| **GST code** | The two-digit GST state code. It decides whether invoices carry CGST and SGST or IGST. | Yes |
| **Notes** | Anything the team should know. Up to 2000 characters. | No |
| **Withhold report release until payment is received** | Reports for this customer are held back until every issued invoice for the job is paid. See [Test reports](/help/features/reports/). | No |
| **Active** | Shown only on an existing customer. Untick to make the customer inactive. | No |

### Contacts

Up to 50 contacts per customer.

| Field | What it means | Required |
| --- | --- | --- |
| **Name** | The person's name. | Yes |
| **Email** | Their email address. Used to suggest recipients for quotations, acknowledgements, reports and invoices. | No |
| **Phone** | Their phone number. | No |
| **Designation** | Their job title. | No |
| **Primary** | The main contact. Only one contact can be primary. | No |

When a contact has a phone number or email, **Call** and **Email** buttons appear under it. On a phone, tap them to call or write straight away.

### Addresses

Up to 50 addresses per customer.

| Field | What it means | Required |
| --- | --- | --- |
| **Type** | **Billing** (printed on invoices), **Report** (where reports go) or **Other**. | Yes |
| **PIN code** | Six digits. Typing all six fills the city, state and GST code. | No |
| **City** | City or town. | Yes |
| **State** | State name. | Yes |
| **GST code** | Two-digit state code. | Yes |
| **Address** | Building, street, plot or shop number. | Yes |
| **Area / locality** | The area. After a PIN lookup, the post office names appear as buttons under the field; select one to fill it. | No |

## PIN code and GSTIN auto-fill

The form fills itself where the system can work out the answer. Every filled value stays editable.

- **GSTIN:** a valid GSTIN fills the **State**, **GST code** and, if it is empty, the **PAN**. The hint under the field says what was filled. This is worked out on your server; nothing is sent outside.
- **PIN code:** six digits look up India Post's directory through your server. The result is cached for 30 days.
  - An exact match fills the city, state and GST code, and offers the area names.
  - A PIN not yet in India Post's list may be filled from a nearby PIN. The message says so; check the city and type the area.
  - If nothing is found, you see "No details found for this PIN code. Fill in the city and state by hand."
- If the customer's own **State** is still empty, a PIN lookup on an address fills it too.

:::note
If the PIN service is down, or your administrator has turned the lookup off on the server, the address is simply not filled. Type it by hand.
:::

## Edit a customer

**Goal:** change a customer's details, contacts or addresses.

**Who can do it:** Admin, Sales / Business Development (`customers.edit`).

**Steps:**

1. Open the customer from **Customers**.
2. Select the **Details** tab.
3. Make your changes.
4. Select **Save customer**.

**Result:** "Customer saved" appears. The change is recorded on the **Activity** tab.

If you try to leave with unsaved changes, the system asks you to confirm first. People without `customers.edit` see the **Details** tab read-only.

:::note
Documents already issued keep the customer details they were issued with. A quotation freezes the customer's details when it is sent or accepted, and a changed address does not alter it.
:::

## Make a customer inactive

**Goal:** stop offering a customer you no longer work with, without losing their records.

**Who can do it:** Admin, Sales / Business Development (`customers.edit`).

**Steps:**

1. Open the customer and select the **Details** tab.
2. Untick **Active**.
3. Select **Save customer**.

**Result:** the customer shows as **Inactive** in the list and no longer appears in **Customer** pickers when you create orders, quotations or bookings. Their quotations, jobs, reports and invoices stay as they are.

To bring the customer back, set the list filter to **Inactive**, open the customer and tick **Active** again.

## View a customer's history

**Goal:** see everything you have done for a customer.

**Who can do it:** anyone with `customers.view`. Each tab appears only if you may see what it lists.

**Steps:**

1. Open the customer from **Customers**.
2. Select a tab.

**Result:** the tab loads its list. Select a row to open that record.

| Tab | Shows | Needs |
| --- | --- | --- |
| **Overview** | Tiles for **Quotations**, **Jobs**, **Tests booked**, **Reports issued**, **Invoiced**, **Outstanding** (with any overdue amount), **Accepted quotation value** and **Customer since**, plus **Most booked tests**. Select a tile to open its tab. | Money tiles need `invoices.view`; quotation tiles need `quotations.view` |
| **Quotations** | The customer's quotations with status, dates and total. | `quotations.view` and the Orders and quotations module |
| **Jobs** | The customer's jobs with status, received date and sample count. Urgent jobs are marked. | `jobs.view` |
| **Tests booked** | Every test booked for the customer, its sample, job, status and report number. | — |
| **Reports** | The customer's reports with revision, status and issue date. | `reports.view` |
| **Invoices and payments** | **Invoices** (with balance; overdue balances in red) and **Payments** (with any **Advance left**). | `invoices.view` and the Billing module |
| **Files** | Files linked to the customer. See [Files](/help/features/files/). | `files.view` and the File library module |
| **Details** | The customer form. | — |
| **Activity** | Every change to the customer: who, when, and what changed. | — |

<!-- screenshot: customers-history-overview -->

## Settings that affect customers

- [`credit.defaultDays`](/help/admin/settings/#credit.defaultDays): the credit days a customer gets when **Credit days** is left empty.
- [`numbering.formats`](/help/admin/settings/#numbering.formats): the format of the CRN (default `CRN-{SEQ:5}`). Customer numbers do not reset each financial year.

## Tips

- Start an address with the PIN code. It fills most of the rest.
- Keep one **Primary** contact with an email. Quotation, acknowledgement and report emails suggest that address.
- Add a **Report** address if reports go somewhere other than the billing address. Bookings use the **Report** address (or the **Billing** address if there is none) to fill **Report issue address**.

## Limitations

- Customers cannot be deleted from the app. Make them inactive instead.
- An inactive customer can still be found in the customer list with the **Inactive** or **All** filter, and their existing records keep working.
- **Export Excel** includes every customer. The system asks you to confirm your password first, and the export is recorded so administrators can see bulk data leaving the system.
- On a phone, the list shows as cards and the form fields stack in one column.

## Related

- [Orders and quotations](/help/features/orders-quotations/)
- [Book samples](/help/features/booking/)
- [Invoices and payments](/help/features/invoices-payments/)
- [Due invoices](/help/features/due-invoices/)
- [Test reports](/help/features/reports/)
