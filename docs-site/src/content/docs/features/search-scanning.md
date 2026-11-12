---
title: Search and scanning
description: Find any job, sample, report, invoice or customer by its number, with the search box, a barcode scanner or a phone camera.
sidebar:
  order: 14
---

The search box at the top of every screen finds records by their number. A barcode scanner works from any screen without clicking into the box, and on a phone you can read a sample label with the camera.

## Who can use it

Everyone who is signed in. You only find the kinds of record you may see:

| Record | Found by | Needs |
| --- | --- | --- |
| Customer | Customer number (CRN), name, or GSTIN | `customers.view` |
| Job | Job number | `jobs.view` |
| Sample | Sample number | `jobs.view` |
| Report | Report number | `reports.view` |
| Invoice | Invoice number | `invoices.view` |

A Technician / Analyst (`tests.work` only) can scan a sample label too, but it opens only a test assigned to them, never the job or the customer behind it.

## Where to find it

- **On a computer or tablet**: the box marked **Search or scan a job, sample, report, invoice or customer** in the header.
- **On a phone**: the magnifying glass (**Search or scan**) in the header opens a full-width search bar. **Scan a label** is at the top of the **Dashboard**.

## Search for a record

**Goal**: open a record when you know part of its number or name.

**Who can do it**: everyone signed in (results follow the table above).

**Steps**

1. Select the search box, or press **Ctrl K** (**⌘ K** on a Mac), or press **/** when you are not typing in a field.
2. Type at least two characters, for example `JOB/26-27/0004` or `Contoso`.
3. Wait a moment for the list. Each result shows its type (**Customer**, **Job**, **Sample**, **Report** or **Invoice**), its number or name, and a hint on the right.
4. Select a result, or use the up and down arrow keys and press **Enter**.

**Result**: the record opens. The list says **Searching…** while it works, **Nothing found** when nothing matches, and **Search failed. Please try again.** if the search could not run.

<!-- screenshot: search-scanning-results -->

The search matches any part of the number or name and ignores capitals. It shows up to eight results of each type.

| Result type | Hint on the right | Opens |
| --- | --- | --- |
| **Customer** | Customer number (CRN) | The customer's page |
| **Job** | Job status | The job's page |
| **Sample** | Sample description | The job's page, with that sample selected |
| **Report** | none | The report's page in **Approvals** |
| **Invoice** | Invoice status (a draft invoice shows as **Draft**) | The invoice's page |

:::tip
If you type a complete number and press **Enter** without choosing a result, the system looks for that exact number and opens it straight away. If there is no exact match, the list of partial matches appears instead.
:::

Press **Escape** to close the list.

## Scan with a barcode scanner

**Goal**: open a record by scanning its label, without touching the mouse.

**Who can do it**: everyone signed in.

**Before you start**: use a USB or Bluetooth scanner set to keyboard mode (it "types" the code and presses Enter). Most scanners work this way out of the box.

**Steps**

1. Make sure the cursor is not in a text field. Select an empty part of the page if needed.
2. Scan the label.

**Result**: the record opens, from any screen. If the code matches nothing exactly, the search box fills with the code and shows any partial matches.

A scan is told apart from typing by its speed: at least four characters, each arriving within 30 milliseconds of the last, ending with Enter. Typing in a field always goes to that field and is never treated as a scan.

### What a scan opens

The system checks the code in this order and opens the first exact match you may see:

1. **Sample number**: the job's page with the sample selected. For someone without `jobs.view`, the test on that sample assigned to them (if it is not cancelled or approved); otherwise nothing.
2. **Job number**: the job's page.
3. **Report number**: the report's page.
4. **Invoice number**: the invoice's page.
5. **Customer number (CRN)**: the customer's page.

Sample labels carry the sample number as a QR code, so scanning a label opens that sample.

:::note
The QR code printed on a test report is a verification link for customers, not a record number. Scanning it inside the LIMS finds nothing; open it with a phone's camera app instead to reach the public verification page. See [Test reports](/help/features/reports/).
:::

## Scan a label with a phone camera

**Goal**: open a sample, job or report from its label using your phone.

**Who can do it**: everyone signed in.

**Before you start**: your phone's browser must be able to read codes. Chrome on Android can; where the browser cannot, the **Scan a label** button does not appear. Allow camera access for the site when asked.

**Steps**

1. Open **Dashboard** on your phone.
2. Select **Scan a label**.
3. Point the camera at the label's QR code or barcode. The dialog says **Point the camera at the label.**
4. Hold still until it reads the code.

**Result**: the dialog says **Found** and the code, then opens the record, using the same rules as a scanner. If nothing matches, it says **Nothing matches** and the code, then keeps looking so you can try another label.

<!-- screenshot: search-scanning-camera -->

The camera reads QR codes, Code 128, Code 39, EAN-13 and Data Matrix. If the camera cannot open, the dialog says **The camera could not be opened. Allow camera access for this site and try again.**

## On a phone

- The search box is hidden behind the magnifying glass in the header; select it to open the bar and **Cancel** to close it. Moving to another page closes it too.
- A Bluetooth scanner paired with the phone or tablet still works from any screen, even while the search bar is closed.
- **Scan a label** is only on the **Dashboard**.

See [Using the LIMS on a phone](/help/guides/on-a-phone/).

## Tips

- Search is "numbers first": a fragment of a job or sample number is usually the fastest way to a record.
- Use **Ctrl K** or **/** to jump to the search box from anywhere, unless a dialog is open.

## Limitations

- Search finds records by number (and customers also by name and GSTIN). It does not search descriptions, contacts, test names or results.
- Quotations, orders, dispatches and credit notes are not in the global search. Use the search on their own lists.
- Camera scanning depends on the browser; on browsers without code reading (for example, many iPhone browsers), use a scanner or type the number.
<!-- TODO(verify): which iPhone browsers support the BarcodeDetector API; the code only checks for it and names Chrome on Android as an example. -->

## Related

- [Jobs and samples](/help/features/jobs-samples/)
- [Testing](/help/features/testing/)
- [Test reports](/help/features/reports/)
- [Customers](/help/features/customers/)
- [On a phone](/help/features/mobile/)
