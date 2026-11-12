---
title: My account
description: Change your password, see where you are signed in, choose which notifications are emailed to you, and follow your access requests and reported problems.
sidebar:
  order: 22
---

**My account** is your own page: your password, two-factor login (for some roles), the devices you are signed in on, which notifications reach your inbox, and the answers to things you asked for. Everyone who can sign in has it; no permission is needed.

## Where to find it

Select your name at the top right (on a phone, your initials), then **My account**. The same menu holds **Appearance** and **Sign out**.

The page header shows your name and email address. Your name, email, designation and roles are set by an administrator in Admin → Users; you cannot change them here.

My account works fully on a phone.

<!-- screenshot: account-page -->

## Change your password

**Goal:** set a new password.

**Who can do it:** everyone, for their own account.

**Steps**

1. Open **My account**.
2. Under **Change password**, enter your **Current password**.
3. Enter a **New password**.
4. Select **Change password**.

**Result:** the toast says "Password changed. Please sign in again." You are signed out on every device, including this one, and taken to the sign-in page.

| Field | What it means | Required |
| --- | --- | --- |
| **Current password** | Your password now. A wrong one gives "Current password is incorrect". | Yes |
| **New password** | At least 10 characters, with upper and lower case, a digit and a symbol | Yes |

:::note
If an administrator created your account or reset your password, you must choose a new one when you next sign in, before anything else opens.
:::

## Two-factor login

The **Two-factor login** card appears only for people who hold the Admin, Authorised Signatory or Accounts role. It is optional.

### Turn on two-factor login

**Goal:** ask for a code from an authenticator app at each sign-in.

**Who can do it:** holders of the Admin, Authorised Signatory or Accounts role.

**Before you start:** install an authenticator app on your phone.

**Steps**

1. Under **Two-factor login**, select **Set up two-factor login**.
2. Add the key shown to your authenticator app.
3. Enter the **6-digit code** the app shows.
4. Select **Turn on**.

**Result:** the toast says "Two-factor login is on". From the next sign-in, you enter a code after your password.

### Turn it off

1. Under **Two-factor login**, enter your password in **Confirm your password to turn it off**.
2. Select **Turn off**.

The toast says "Two-factor login is off".

## See where you are signed in

The **Where you're signed in** card lists each session: the browser and system (for example "Chrome on Windows"), when it signed in, when it was last active, and the network address. The one you are using is marked **This browser**.

**Goal:** end a session you do not recognise or no longer use.

**Who can do it:** everyone, for their own sessions.

**Steps**

1. Open **My account** and find **Where you're signed in**.
2. Select **Sign out** next to a session, or **Sign out everywhere else** to end all others.

**Result:** the toast says "Signed out of N other session(s)".

:::caution
If you see a device you don't recognise, sign it out and change your password.
:::

Sessions also end on their own: after a period without activity (30 minutes by default) and at the latest 12 hours after signing in. The server administrator sets both limits.

## Recent sign-ins

The **Recent sign-ins** card lists your last 50 sign-ins and failed attempts, with the time and network address:

| Entry | Meaning |
| --- | --- |
| **Signed in** | A successful sign-in |
| **Wrong password** | A failed attempt with your email |
| **Attempt while locked** | Someone tried while the account was locked |
| **Account locked** | Five failures locked the account for 15 minutes |

Failed entries are highlighted.

## Choose which notifications are emailed to you

You always see notifications in the bell. Under **Email notifications**, tick the types you also want by email; untick the ones you do not.

**Steps**

1. Open **My account** and find **Email notifications**.
2. Tick or untick a type.

**Result:** the toast says "Email preferences saved". The change applies to the next notification.

| Type | What it covers |
| --- | --- |
| **Tests assigned to you** | A planner assigned you a test |
| **Work sent back to you** | A test or report was sent back, with the reason |
| **Approvals waiting for you** | Results to approve, reports to review or sign |
| **TAT nearing** | Work close to its turnaround date |
| **TAT crossed** | Work past its turnaround date |
| **Quotations expiring** | Quotations about to expire |
| **Invoices overdue** | Invoices past their due date |
| **Access requests to decide** | For administrators: someone asked for access |
| **Answers to your access requests** | Your request was approved or denied |
| **Security alerts** | Security events on the system |
| **Equipment due for calibration or maintenance** | The daily equipment notice (quality managers) |
| **Non-conformances assigned to you** | You were made owner of a non-conformance |
| **Privacy requests to answer** | For privacy managers |

Every type is ticked to start with. You only receive types that apply to your role.

<!-- TODO(verify): PUT /notifications/preferences replaces the whole stored preference set with the one type the page sends, so unticking a second type appears to re-tick the first. Check before relying on more than one unticked type. -->

See [Notifications](/help/features/notifications/).

## Appearance

The **Appearance** choice is in the account menu (your name at the top right), not on the page:

- **Light**
- **Dark**
- **Same as this device**: follows the light or dark setting of your computer or phone.

The choice is kept in this browser only, so set it on each device.

## My access requests

When you open a page your role does not include, the system shows "You don't have access to this page" and offers **Request access**: say **Why do you need it?** (at least 3 characters) and send it. Administrators see the request and are notified.

The **My access requests** card lists your requests, with the page, the date and the status:

| Status | Meaning |
| --- | --- |
| **Pending** | Waiting for an administrator |
| **Approved** | You were given a role; the card shows "given …" with the role name |
| **Denied** | Refused, with the administrator's note |

You are notified of the answer either way. You cannot ask twice for the same page while a request is pending. The card appears only once you have made a request.

## Problems I reported

If the Quality module is on and you work on tests or jobs, the **Problems I reported** card lists the problems you raised with **Report a problem**, and how far each has got: **Received**, **Being fixed**, **Being checked** or **Closed**. See [Quality](/help/features/quality/#problems-i-reported).

## Tips

- Check **Where you're signed in** after using a shared computer, and sign it out.
- Untick email notifications you act on from the bell anyway, to keep your inbox quiet.

## Limitations

- You cannot change your own name, email or roles; ask an administrator.
- There is no profile photo or signature upload here.
- The appearance choice is not saved to your account, so it does not follow you to another device.

## Related

- [Notifications](/help/features/notifications/)
- [Quality](/help/features/quality/)
- [On a phone](/help/features/mobile/)
