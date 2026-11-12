---
title: Troubleshooting
description: The most common problems people and administrators meet in the app, grouped by topic, with what causes each one and how to fix it.
sidebar:
  order: 1
---

Find your problem below. For the exact wording of a message, see [Error messages](/help/troubleshooting/error-messages/). For problems installing or running the server, see [Install troubleshooting](/help/install/troubleshooting/).

:::tip
When something fails with "Something went wrong. Quote the request ID when reporting this.", the message shows a **Request ID**. Send it to your administrator: it lets them find exactly what happened.
:::

## Signing in

**"Incorrect email or password …"**
Check the email address and password. After 5 failed attempts the account is locked for 15 minutes. The message is the same for a wrong password, an unknown email and a locked account, so wait 15 minutes or use **Forgot password**.

**"Too many attempts. Wait a minute and try again."** or **"Too many failed sign-ins from this network. Wait ten minutes and try again."**
Too many attempts were made in a short time. Wait, then try once more, carefully.

**The reset link does not work.**
"This reset link is invalid or has expired" or "This reset link has already been used" means you need a new one. Use **Forgot password** again and open the newest email.

**"Choose a new password to continue".**
You signed in with a temporary password, from a new account or a reset by an administrator. Choose your own password. It needs at least 10 characters, with upper and lower case, a digit and a symbol.

**You are sent back to the sign-in page while working.**
Sessions end after 30 minutes without activity, and always 12 hours after you signed in. Sign in again. Changing your password also signs you out everywhere. Your administrator can change these times.

**Two-factor sign-in: "Incorrect code" or "Sign-in expired. Start again."**
Check the phone's clock is set automatically, and enter the code currently shown. You have 5 minutes after entering your password.

## Permissions

**"You don't have access to this page".**
Your role does not include this page. If you need it for your work, type why in **Why do you need it?** and select **Request access**. An administrator sees the request and you get a notification with the answer.

**"You do not have permission to do this".**
Your role lets you open the page but not take this action. Ask your administrator. See [Permissions](/help/admin/permissions/).

**"Confirm your password".**
Some changes, such as giving roles, deactivating users, editing the lab profile and bulk exports, need your password again. Enter it and the action goes through. It lasts 10 minutes.

**"You cannot approve results you entered" or "The reviewer and signatory of a report must be different people".**
These are separation-of-duties rules. Someone else must do the next step.

**"This test is assigned to someone else".**
Only the assigned analyst can enter results. Ask the planner to reassign the test. See [Planning](/help/features/planning/).

## "Changed by someone else"

**"This record was changed by someone else. The latest version has been loaded."**
Someone saved the same record while you had it open. Nothing you typed was saved. The screen now shows their version: check it and make your change again.

**"Someone else changed this at the same moment. Nothing was saved, so please try again."**
Two saves arrived together. Try again; it normally works.

**"Security token missing or invalid. Reload the page and try again."**
Your page is out of date with your session, for example after signing in on another tab. Reload the page.

## Documents not ready

PDFs and Excel files are made in the background. A new tab opens with "Preparing the document…", and the document appears in it when it is ready, usually within a few seconds.

| What you see | What to do |
| --- | --- |
| A message "… is ready" with **Open**, instead of a new tab | Your browser blocked the new tab. Select **Open**, or allow pop-ups for the app. |
| "This is taking longer than expected. Please try again shortly." | The server is busy or the background worker is down. Try again in a minute. If it keeps happening, tell your administrator. |
| "The document could not be produced. Please try again." | Try again. If it keeps failing, tell your administrator with the time it happened. |
| "The final PDF is still being prepared. Try again in a moment." | A report was just signed and its official PDF is being made. Wait a moment. |
| "Too many documents requested in the last minute …" | Wait a minute. |
| "This report has more than … rows, which is too many for a PDF." | Narrow the filters, or export to Excel. |
| A download link stopped working | Links last 5 minutes. Select the download button again. |

See [Documents](/help/features/documents/).

## Emails not arriving

1. Open the record (quotation, job, report or invoice) and look at its emails. Each shows whether it is queued, sent or failed, and the reason for a failure.
2. **Queued:** it goes out within a minute or two. Each email is tried up to 5 times.
3. **Sent:** the mail server accepted it. Ask the recipient to check spam or junk folders.
4. **Failed:** read the reason. A wrong address is the most common cause.
5. **"This customer has no contact email. Enter an address."** Add an email to the customer's contact, or type one in.

**Administrators:** if no email goes out at all, send a test from the setup wizard's **Email** step (**Send a test email to**). "The mail server refused or could not be reached" means the server's mail settings need fixing. See [Email (SMTP)](/help/integrations/email-smtp/).

## WhatsApp failures

| What you see | Why | What to do |
| --- | --- | --- |
| "WhatsApp is not set up for this laboratory." | The server has no WhatsApp connection. | An administrator sets it up. See [WhatsApp](/help/integrations/whatsapp/). |
| "Enter a WhatsApp mobile number, with the country code for numbers outside India" | The number is not a valid mobile number. | Enter a 10-digit Indian mobile number, or the full number with its country code. |
| The message stays at "sent" and never shows "delivered" | Delivery receipts are not set up on the server. | Nothing is wrong with the message. An administrator can set up receipts. See [Webhooks](/help/developers/webhooks/#whatsapp-status-webhook-incoming). |
| The message shows "failed" with "WhatsApp could not deliver it: …" | WhatsApp refused it. The reason follows. | Common reasons: the number is not on WhatsApp, or the approved template does not match. |
| "Only an issued report can be sent" or "Only an issued invoice can be sent" | Drafts cannot be sent. | Issue it first. |

See [WhatsApp](/help/features/whatsapp/).

## Barcode scanners

The app accepts scans from a USB or Bluetooth scanner set to **keyboard mode**, from any screen. A scanned sample, job, report, invoice or customer number opens that record, if your role lets you see it. Technicians scanning a sample go to their own test on it.

- **Nothing happens when you scan.** Click an empty part of the page first, so no text box has the cursor. A scan into a text box types into that box.
- **The scan types into the search box instead of opening the record.** The code did not match a record you can open, so the app searches for it instead. Check the label, and that the record is one your role can see.
- **The scanner must end each scan with Enter.** Most do by default. Check the scanner's manual if it does not.
- **Very short codes are ignored.** A scan needs at least 4 characters.

See [Search and scanning](/help/features/search-scanning/).

## Phones and tablets

- **"Best on a larger screen".** Some screens are designed for a computer. Select **Continue anyway** to use them on the phone. Tablets get the full app.
- **"You are offline".** The phone lost its connection. Nothing you saved is lost. Select **Try again** when you are back online.
- **"This link has expired or been used up. Ask for a new QR code on the computer."** A **Use phone** link lasts 15 minutes, takes up to 20 photos, and ends when the dialog on the computer is closed. Show a new QR code on the computer.
- **The camera does not open.** Allow camera access for the app in the browser's settings. The camera works only when the app is opened over a secure (https) address.

See [Send photos from your phone](/help/features/phone-upload/).

## A module is turned off

**"This part of the system is turned off"** or **"… is turned off for this laboratory. An administrator can turn it on in Admin, Modules."**
Your laboratory has turned that module off, for example billing, dispatch or quotations. Nothing has been deleted; it all comes back as soon as it is turned on. An administrator can turn it on in **Admin**, **Modules**. See [Modules](/help/admin/modules/).

**"… is not set up for this laboratory yet."**
The module needs a server setting first, such as WhatsApp. Ask your administrator.

## Still stuck

Send your administrator:

- what you were doing, and the record number;
- the exact message, and the **Request ID** if one was shown;
- the time it happened.

## Related

- [Error messages](/help/troubleshooting/error-messages/)
- [Frequently asked questions](/help/troubleshooting/faq/)
- [Install troubleshooting](/help/install/troubleshooting/)
