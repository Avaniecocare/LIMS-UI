---
title: Email (SMTP)
description: Connect the LIMS to a mail server, send a test email, read the delivery logs and fix common sending problems.
sidebar:
  order: 2
---

The LIMS sends email through any SMTP mail server: your own, your email provider's, or a transactional mail service. Emails to customers (acknowledgements, quotations, reports, invoices, payment reminders), password resets and staff notification emails all go through it.

## Settings

Set these in the server's `.env` file, then restart the server.

| Variable | What it means | Default |
| --- | --- | --- |
| `SMTP_HOST` | The mail server's address. | `localhost` |
| `SMTP_PORT` | The port, usually 587 (STARTTLS) or 465 (TLS). | `1025` |
| `SMTP_SECURE` | `true` for a TLS connection from the start (port 465); `false` otherwise. | `false` |
| `SMTP_USER` | The mail account's user name, if the server needs a login. | empty |
| `SMTP_PASSWORD` | The mail account's password or app password. | empty |
| `SMTP_FROM` | The sender address, for example `lab@example.com`. **Required.** | none |
| `SMTP_TRANSPORT` | `json` keeps mail in memory instead of sending, for development and tests only. | `smtp` |

The sender's display name is the **Laboratory name** from **Admin** → **Lab profile**, so emails arrive as "Your Lab Name &lt;lab@example.com&gt;". The wording comes from [Email templates](/help/admin/email-templates/) and the layout from [Branding](/help/admin/branding/).

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=lab@example.com
SMTP_PASSWORD=<your-app-password>
SMTP_FROM=lab@example.com
```

:::tip
Ask your mail provider to set up SPF, DKIM and DMARC for the sender's domain. Without them, reports and invoices are more likely to land in spam.
:::

## Send a test email

**Goal**: check that emails go out.

**Who can do it**: Admin (`admin.company.edit`).

**Steps**:

1. Open the [lab setup wizard](/help/admin/setup-wizard/) (**Continue setup** on the banner, or the address `/setup/lab`) and go to the **Email** step.
2. In **Send a test email to**, enter an address you can read.
3. Click **Send test email**.

**Result**: **Sent to** *address*. Check the inbox and the spam folder: it should carry your lab's name and colours. If sending fails, the message shows what the mail server said.

The wizard stays available at `/setup/lab` after setup is finished, so you can send a test email at any time.

## How sending works

- Each email is written to a delivery log first, then sent in the background by the worker process.
- A failed send is retried automatically, up to five attempts with growing waits.
- Emails written as part of a larger change (for example booking a job) are sent only after the change is saved, so a failed change never sends mail. A sweep every minute sends anything left waiting.
- The test email in the wizard is sent at once, without the queue, so you see the result straight away.
- One-time links (password resets) are blanked from the stored copy once the email is sent.

## Delivery logs

Quotations, jobs, reports and invoices each show the emails sent for them: on reports and invoices in the **Delivery** tab. The **Email delivery log** shows:

| Column | What it shows |
| --- | --- |
| **To** / **Cc** | Recipients. |
| **Subject** | |
| **Status** | **Queued**, **Sent** or **Failed**, with the mail server's error under a failure. |
| **Attempts** | How many times sending was tried. |
| **Sent or queued** | When it was sent, or when it was queued if not yet sent. |

<!-- TODO(verify): where the job and quotation pages place the delivery log (reports and invoices use a Delivery tab). -->

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Test email fails: the server "refused or could not be reached" | `SMTP_HOST` and `SMTP_PORT` are right, and the server can reach the mail server (firewalls often block outgoing ports 25, 465 and 587). |
| Authentication error | `SMTP_USER` and `SMTP_PASSWORD`. Many providers need an app password when two-step login is on. |
| TLS or certificate error | `SMTP_SECURE=true` only with port 465; use `false` with port 587. |
| Sender rejected | Many providers only allow sending as the logged-in account. Make `SMTP_FROM` the same address or an allowed alias. |
| Emails show **Failed** in the delivery log | Read the error under the status. Fix the cause; new emails then send normally. |
| Emails stay queued | The worker process is not running, or cannot reach Redis. See [Installation](/help/install/). |
| Emails arrive in spam | Set up SPF, DKIM and DMARC; avoid a free-mail sender address. |
| Nothing is sent and there is no error | Check `SMTP_TRANSPORT` is not `json`. |

## Related

- [Email templates](/help/admin/email-templates/)
- [Lab setup wizard](/help/admin/setup-wizard/)
- [Integrations](/help/integrations/)
