---
title: Send photos from your phone
description: Use a QR code on the lab computer to take photos with your phone and send them straight to a sample, test, report or booking.
sidebar:
  order: 19
---

Wherever you add photos on a computer, a **Use phone** button shows a QR code. Scan it with a phone and a simple camera page opens for that one record. Photos you take arrive on the computer within seconds. No sign-in is needed on the phone.

:::note
This is the **Photos from a phone** module. An administrator can turn it off in Admin → Modules. When it is off, **Use phone** is hidden and the phone links stop working.
:::

## Where you find **Use phone**

| Where | What the photos become | Who can make the link |
| --- | --- | --- |
| Booking form, on each sample (**Book samples**) | Photos of that sample, held until the booking is saved | Sample Reception (`jobs.create`) |
| A sample on the job page | Sample images | `jobs.create` or `jobs.edit` |
| **Customer letter** on the job page | Pages of the customer's letter | `jobs.create` or `jobs.edit` |
| A test in progress (**My Tests**) | Result images | The technician assigned to the test (`tests.work`), while the test is In Progress |
| A draft report (report photos) | Report photos | Report Reviewer (`reports.review`) or Authorised Signatory (`reports.approve`), while the report is a draft |

The button appears only where you could add a photo from the computer yourself. The link uses the same rule.

:::tip
On a phone you do not see **Use phone**: the phone's own camera and files are already there, through **Use camera** and **Add file**.
:::

## Send photos from your phone

**Goal:** take photos with a phone and attach them to a record open on the computer.

**Who can do it:** anyone who may add photos to that record (see the table above).

**Before you start:** open the record on the computer. The phone needs a camera and an internet connection that can reach the lab's system.

**Steps**

1. On the computer, select **Use phone**. The dialog **Send photos from your phone** opens with a QR code.
2. Scan the code with the phone's camera app and open the link.
3. On the phone, select **Take photo** to use the camera, or **Choose from gallery** to pick photos already taken (several at once).
4. Wait until each photo says **Sent**.
5. On the computer, check the dialog counts the photos ("2 photo(s) received from the phone"), then select **Done**.

**Result:** the photos are on the record, as if you had added them from the computer. Closing the dialog ends the link.

<!-- screenshot: phone-upload-qr-dialog -->

If the phone cannot scan the code, open **Can't scan? Open this link on the phone** in the dialog and type or send the link to the phone.

## What the phone page does

The phone page shows the lab's name and a line saying what the photos are for, for example "Photos of sample LAB/S/26-27/000123" or "Photos for report LAB/TR/26-27/000045 (sample …)". It never shows the customer's name.

It also shows how many more photos the link takes and how long it still works ("18 more photos · link works for 12:40").

For each photo, the phone:

1. Shrinks it on the phone to about 2000 pixels on the long side and under 1 MB, with the camera's rotation applied (**Preparing…**).
2. Sends it (**Sending (… KB)…**). Photos go one at a time, in the order chosen, which is kinder to a weak connection.
3. Marks it **Sent**, or shows the error with a retry button.

<!-- screenshot: phone-upload-phone-page -->

## Limits and expiry

| Limit | Value |
| --- | --- |
| How long a link works | 15 minutes from when the QR code is shown |
| Photos per link | 20 |
| What can be sent | Photos only (images). Anything else is refused with "Only photos can be sent from a phone". |
| File size | The server's upload limit (15 MB by default, set by the server administrator). Photos are shrunk on the phone first, so this is rarely reached. |

A link stops working when any of these happens:

- 15 minutes pass.
- 20 photos have been sent.
- You select **Done** or close the dialog on the computer.
- A report leaves the draft stage.
- The person who made the link is deactivated, or their role no longer allows adding those photos. Each photo is stored with the permissions the maker has at that moment.

When a link has stopped, the computer shows "This code has stopped working." with **Make a new code**. The phone shows **This link has ended** and asks for a new QR code on the computer. An unknown, expired, used-up or closed link always gets the same answer.

## Photos during a booking

During **Book samples** the sample does not exist yet. Photos sent from the phone are held for the person booking, visible only to them, and moved onto the sample as soon as the job is saved. If moving them fails, the booking still stands: the toast says so and you can add the photos on the job page.

## Security

- The QR code holds a long random token (256 bits). The system keeps only a fingerprint of it, so it cannot be read back from the database.
- The token works for one record and one purpose only.
- Creating a link and every photo received are written to the audit log.

## Tips

- Keep the dialog open on the computer until the phone shows **Sent** for every photo.
- For more than 20 photos, select **Make a new code** when the first link is used up.
- Choose several photos at once with **Choose from gallery**; they are sent one by one.

## Limitations

- Only photos can be sent. Use the computer for PDFs and other documents.
- The phone page does not show photos already on the record, only the ones sent in this session.
- Photos cannot be deleted from the phone; remove a wrong photo on the computer.

## Related

- [Book samples](/help/features/booking/)
- [Jobs and samples](/help/features/jobs-samples/)
- [Testing](/help/features/testing/)
- [Test reports](/help/features/reports/): report photos.
- [On a phone](/help/features/mobile/)
