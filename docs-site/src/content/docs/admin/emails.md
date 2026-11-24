---
title: Emails sent and failed
description: See every email the system sent or could not send, find out why, and send one again.
sidebar:
  order: 17
---

**Admin** → **Emails** lists every email the system has sent, is about to send, or could not send, newest first. Each record also shows its own emails; see [Email](/help/features/email/).

**Who can do it**: Admin (`admin.emails`). The list shows customers' email addresses.

## Find an email

Search by address or subject, or choose a **Status**: **Failed**, **Waiting** or **Sent**. A failed email shows the mail server's reason underneath. **will be tried again** means the system is still retrying by itself, up to five times.

When every attempt has failed, the person who sent it and everyone with `admin.emails` are notified.

## Send one again

1. Find the email and click **Try again** (failed) or **Send again** (already sent).
2. Check the address and confirm.

**Result**: **On its way**. A failed email is tried again; one that was sent goes out again as a new email, with the same text and attachments. It is recorded in the [audit log](/help/admin/audit-log/).

It always goes to the same address. If the address was wrong, correct it and send the document again from its own record.

A password reset cannot be sent again: its link is for one person and soon expires. Ask them to use **Forgot password?** again.

## Troubleshooting

| The reason says | Usually | What to do |
| --- | --- | --- |
| `550`, mailbox unavailable or user unknown | The address is wrong or closed | Correct it on the customer, and send the document again from its record |
| `535`, authentication failed | The mail password was changed or expired | Whoever runs the server corrects the mail settings |
| Timeout, connection refused | The mail server cannot be reached | Check [System status](/help/admin/system-status/); try again later |
| Message too large | The attachments are too big for the mail server | Send the file another way |

## Related

- [System status](/help/admin/system-status/)
- [Email templates](/help/admin/email-templates/)
