---
title: Notifications
description: See what the system tells you in the bell, which events send a notification, and choose which ones are also emailed to you.
sidebar:
  order: 15
---

The system tells you when something needs you: a test assigned to you, work sent back, results or reports waiting for approval, due dates near or crossed, and more. Every notification appears in the bell in the header. You choose which kinds are also emailed to you.

## Who can use it

Everyone who is signed in. You see only your own notifications. Which ones you receive depends on your role and permissions (see [What sends a notification](/help/features/notifications/#what-sends-a-notification)).

## Where to find it

- **The bell** in the header, at the top right of every screen. A red badge shows how many are unread (**99+** above 99).
- **Email notifications** on **My account** (open the menu under your name, then **My account**).

## Read your notifications

**Goal**: see what needs your attention and go to it.

**Who can do it**: everyone signed in.

**Steps**

1. Select the bell.
2. Read the list. Unread notifications are highlighted and marked **Unread**.
3. Select a notification's title to open the record it is about.

**Result**: the record opens, and that notification is marked read. Select the bell again, press **Escape**, or select anywhere outside the panel to close it.

<!-- screenshot: notifications-bell -->

The panel shows your latest 20 notifications. When you have more, it says **Showing the latest 20 of** and the total. If you have none, it says **You have no notifications.**

The bell checks for new notifications every minute while the tab is open and in front. It pauses while the tab is hidden.

## Mark notifications as read

**Goal**: clear notifications you have dealt with.

**Who can do it**: everyone signed in.

**Steps**

1. Select the bell.
2. Select **Mark read** beside one notification, or **Mark all read** at the top to clear all of them.

**Result**: the highlight and **Unread** go, and the badge count drops.

## What sends a notification

| Kind (as shown on My account) | When | Who receives it |
| --- | --- | --- |
| **Tests assigned to you** | A planner assigns a test to you | The technician assigned |
| **Work sent back to you** | An approver sends your results back, or a signatory sends a report back | The technician, for results; everyone with `reports.review`, for reports |
| **Approvals waiting for you** | Results are submitted; a report is ready for review; a report is ready to sign | Everyone with `tests.approve`; everyone with `reports.review`; everyone with `reports.approve` |
| **TAT nearing** | Daily at 08:00, for tests due within the warning days | The technician assigned |
| **TAT crossed** | Daily at 08:00, for tests past their due date | The technician assigned and everyone with `planning.edit` |
| **Quotations expiring** | Daily at 08:15, for sent quotations that expire within three days | The person who made the quotation (or everyone with `quotations.edit` if unknown) |
| **Invoices overdue** | Daily at 08:30, for issued or partly paid invoices past their due date | Everyone with `invoices.edit` |
| **Access requests to decide** | Someone asks for access to a page | Everyone with `admin.users` |
| **Answers to your access requests** | An administrator grants or declines your request | The person who asked |
| **Security alerts** | Someone's access widens (a user created with roles, given a role, or a role given new permissions); one user refused repeatedly within ten minutes; an export of all customers or all due invoices; a personal data breach logged | Everyone with `admin.users`; for a breach, everyone with `privacy.manage` |
| **Equipment due for calibration or maintenance** | Daily at 08:00, when instruments are overdue or due soon | Everyone with `quality.manage` |
| **Non-conformances assigned to you** | A non-conformance is raised with you as its owner | The owner |
| **Privacy requests to answer** | A privacy request is logged | Everyone with `privacy.manage` |

Times are Indian Standard Time. Scheduled checks send each notification only once for the same record and due date, so you are not reminded every day about the same thing.

:::note
You never get a notification about your own action. If you assign a test to yourself, for example, you are not notified.
:::

:::note
Notifications name records by their numbers (sample, report, invoice, quotation) and never include the customer's name or prices, because they also reach technicians.
:::

## Choose which notifications are emailed

**Goal**: get email only for the notifications that matter to you.

**Who can do it**: everyone signed in, for their own account.

**Steps**

1. Open the menu under your name and select **My account**.
2. Find **Email notifications**.
3. Tick a kind to have it emailed to you as well, or untick it to see it only in the bell.

**Result**: a toast says **Email preferences saved**. The change applies to the next notification of that kind.

<!-- screenshot: notifications-email-preferences -->

| Field | What it means | Required |
| --- | --- | --- |
| One tick box per kind (see the table above) | Ticked: the notification is also emailed to your account's address. Unticked: bell only. | No. Every kind starts ticked. |

<!-- TODO(verify): each tick sends only the changed kind, and the server replaces all stored preferences with what it receives, so unticking a second kind may re-tick the first. Check updatePreferences in the notifications service. -->

You always see every notification in the bell; the tick boxes only decide email. Each email has the notification's title, its details and an **Open** link to the record.

## On a phone

The bell is in the header on a phone too, and works the same way. **My account** works fully on a phone.

## Settings that affect it

- [`notifications.tatWarningDays`](/help/admin/settings/#notifications.tatWarningDays): how many days before a test's due date **TAT nearing** is sent (default 1).
- [`quality.dueWarningDays`](/help/admin/settings/#quality.dueWarningDays): how many days ahead equipment counts as due soon.
- [`calendar.workingDays`](/help/admin/settings/#calendar.workingDays): the working days used to set due dates.

The wording of these staff emails is fixed. Customer emails (reports, invoices, reminders) are separate and use the templates at [Email templates](/help/admin/email-templates/).

## Tips

- If a notification links to a page you cannot open, you see **You don't have access to this page**, where you can ask an administrator for access.
- Use **My work** on the [Dashboard](/help/features/dashboard-analytics/) for counts of everything waiting on you; the bell tells you about each new event.

## Limitations

- There is no page listing all your past notifications; the bell shows the latest 20.
- Notifications cannot be deleted, only marked read.
- There are no SMS or WhatsApp notifications for staff.

## Related

- [My account](/help/features/account/)
- [Email](/help/features/email/)
- [Dashboard and Analytics](/help/features/dashboard-analytics/)
- [Quality](/help/features/quality/)
