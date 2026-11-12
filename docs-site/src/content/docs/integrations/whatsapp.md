---
title: WhatsApp
description: Connect the laboratory's WhatsApp Business number through Meta's Cloud API, set up message templates, delivered and read receipts, and send a test message.
sidebar:
  order: 3
---

The LIMS can send test reports, tax invoices, sample-received letters and payment reminders to customers on WhatsApp, from the laboratory's own WhatsApp Business number. It uses Meta's official **WhatsApp Business Cloud API** only. Unofficial gateways break Meta's terms and get numbers banned, so they are not supported.

There is no SMS.

## What you need

- A Meta Business account (Meta Business Suite) for the laboratory.
- A phone number for WhatsApp Business that is not already used on the WhatsApp app.
- A Meta app with the WhatsApp product, and a permanent system-user access token.
- An approved message template for each kind of message you want to send.
- Access to the server's `.env` file (whoever runs the server).

Steps in Meta's own screens change from time to time. Follow Meta's current WhatsApp Cloud API guide for exact clicks; the steps below say what the LIMS needs from each.

## Step 1: Set up the WhatsApp Business account

1. In Meta Business Suite, create or choose the laboratory's business, and create a WhatsApp Business account.
2. Create a Meta app (type Business) at Meta for Developers and add the **WhatsApp** product to it.
3. Add and verify the laboratory's phone number in WhatsApp Manager.
4. In WhatsApp Manager → **API setup**, note the **Phone number ID** of that number.
5. In Business settings, create a **system user**, give it the WhatsApp app and account, and generate a **permanent** access token with the WhatsApp messaging permissions.

:::caution
Use a permanent system-user token, not the temporary token shown on the API setup page: that one expires within a day.
:::

## Step 2: Set the server variables

Add these to the server's `.env` file and restart the server:

| Variable | What it is | Required |
| --- | --- | --- |
| `WHATSAPP_TOKEN` | The permanent system-user access token. | Yes |
| `WHATSAPP_PHONE_NUMBER_ID` | The phone number ID from WhatsApp Manager → API setup (not the phone number itself). | Yes |
| `WHATSAPP_APP_SECRET` | The Meta app's **App secret**, from the app's **Settings** → **Basic**. Needed for delivered and read receipts. | For receipts |
| `WHATSAPP_VERIFY_TOKEN` | Any long random text you make up. You enter the same text in Meta when you set up the webhook. Needed for receipts. | For receipts |
| `WHATSAPP_API_URL` | Meta's Graph API address. Change only if told to. | No (default `https://graph.facebook.com/v21.0`) |
| `WHATSAPP_TRANSPORT` | `json` records messages instead of sending them, for development and tests only. | No |

```bash
WHATSAPP_TOKEN=<your-token>
WHATSAPP_PHONE_NUMBER_ID=<your-phone-number-id>
WHATSAPP_APP_SECRET=<your-app-secret>
WHATSAPP_VERIFY_TOKEN=<long-random-text>
```

**Result**: in **Admin** → **WhatsApp**, **Connection** shows **Connected** (or **Connected, module off**) and the last four digits of the phone number ID. Until both required variables are set it shows **Not set up**, and the **WhatsApp** module cannot be turned on.

## Step 3: Turn the module on

**Who can do it**: Admin (`admin.company.edit`).

1. Open **Admin** → **Modules**.
2. Tick **WhatsApp** and click **Save modules**.

The WhatsApp send buttons now appear for people who may send each kind of message. See [Modules](/help/admin/modules/).

## Step 4: Create and approve message templates

WhatsApp only lets a business start a conversation with a template Meta has approved. You need one template per kind of message.

1. In WhatsApp Manager → **Message templates**, create a template for each message below (category **Utility** is usual for these).
2. For reports, invoices and sample-received letters, add a **Document** header: the PDF is sent there.
3. Write the body with placeholders `{{1}}`, `{{2}}` and so on, where the values should go.
4. Submit and wait for approval.

Suggested names, which the LIMS fills in by default:

| Message | Suggested template name | Header | Default order of values |
| --- | --- | --- | --- |
| Test report | `lims_test_report` | Document (the PDF) | Customer contact name, Report number, Laboratory name |
| Tax invoice | `lims_tax_invoice` | Document (the PDF) | Customer contact name, Invoice number, Amount, Due date, Laboratory name |
| Samples received | `lims_samples_received` | Document (the PDF) | Customer contact name, Job number, Laboratory name |
| Payment reminder | `lims_payment_reminder` | None | Customer contact name, Invoice number, Balance due, Due date, Laboratory name |

An example body for the test report template, matching the default order:

```text
Dear {{1}}, please find attached test report {{2}}. Regards, {{3}}
```

### The values each message offers

Every message offers **Customer contact name**, **Customer (company) name**, **Laboratory name** and **Laboratory phone**, plus:

| Message | Other values |
| --- | --- |
| Test report | Report number, Sample number, Issue date |
| Tax invoice | Invoice number, Amount (e.g. ₹15,576.00), Invoice date, Due date |
| Samples received | Job number, Number of samples, Date received |
| Payment reminder | Invoice number, Balance due (e.g. ₹15,576.00), Due date, Days overdue |

## Step 5: Match the templates in Admin → WhatsApp

**Goal**: tell the LIMS which approved template to use for each message, and which value goes in each placeholder.

**Who can do it**: Admin (`admin.company.edit`).

**Steps**:

1. Open **Admin** → **WhatsApp** and scroll to **Message templates**.
2. For each message, enter the **Template name** exactly as in WhatsApp Manager (lower-case letters, digits and underscores) and its **Language** code, for example `en` or `en_US`.
3. Under **Body values, in order**, arrange the values so they match `{{1}}`, `{{2}}`... in the approved wording:
   - use the up and down arrows to move a value,
   - the cross to remove one,
   - **Add a value…** to add one.
   If the template has no placeholders, remove all values: the page shows **No values: the template's wording is fixed.**
4. Click **Save templates**. Click **Undo changes** to go back.

**Result**: **WhatsApp templates saved**. Each value can be used once, and a message can have at most 10 values.

<!-- screenshot: admin-whatsapp-templates -->

:::caution
The number and order of values must match the approved template exactly, and the language must be the one the template was approved in. Otherwise Meta refuses the message and it shows as failed with Meta's reason.
:::

## Step 6: Delivered and read receipts

Without receipts, messages still send but stay at **Sent**. With them, a message moves to delivered and then read as WhatsApp reports it.

1. Make sure `WHATSAPP_APP_SECRET` and `WHATSAPP_VERIFY_TOKEN` are set and the server restarted.
2. In **Admin** → **WhatsApp** → **Delivered and read**, click **Copy** next to the **Callback URL**. It is `https://lims.example.com/api/v1/webhooks/whatsapp` on your own server's API address.
3. In your Meta app, open **WhatsApp** → **Configuration** and edit the webhook.
4. Paste the **Callback URL**, and enter your `WHATSAPP_VERIFY_TOKEN` as the **Verify token**. Save.
5. Subscribe to the `messages` field.

**Result**: **Delivered and read** shows **Receiving**.

The server accepts status calls only when they carry Meta's signature made with the app secret; unsigned or wrongly signed calls are refused. A message's status only ever moves forward, so late or repeated receipts change nothing. A failed message records WhatsApp's reason.

## Step 7: Send a test message

**Goal**: check that the connection works before customers rely on it.

**Who can do it**: Admin (`admin.company.edit`).

**Steps**:

1. In **Admin** → **WhatsApp** → **Connection**, type a mobile number in **Send a test message to**, for example `98765 43210`.
2. Click **Send test**.

**Result**: **Test message sent. It should arrive on that WhatsApp in a few seconds.** The test uses Meta's `hello_world` template, which every account has, so it works before your own templates are approved.

**Recent messages** on the same page lists the latest messages with their status, kind, number and document, and Meta's error under any failure.

## Numbers

Indian mobile numbers can be typed with spaces, a leading 0, or without +91. Numbers from other countries need the country code with `+` or `00`. Anything that cannot be a mobile number is refused.

## Consent and who may send

- The sender must tick **The customer agreed to receive messages from us on WhatsApp**. The sender's name is stored with the message as the person who confirmed consent, and the send is recorded in the audit log.
- Whoever may email a document may also send it on WhatsApp: reports (`reports.issue`), invoices (`invoices.edit`), payment reminders (`reminders.send`), and sample-received letters (`jobs.create` or `jobs.edit`).
- Contacts' phone numbers are suggested only to people with `customers.view`; others see earlier numbers masked.
- Messages are queued and sent by the worker, which retries on failure. PDFs not yet stored are rendered first.


## Troubleshooting

| Problem | What to check |
| --- | --- |
| **Not set up** | Both `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are set, and the server was restarted. |
| **Connected, module off** | Turn on **WhatsApp** in **Admin** → **Modules**. |
| **Test mode: messages are recorded but not sent.** | `WHATSAPP_TRANSPORT=json` is set. Remove it on a real installation. |
| Messages fail with a template error | Template name, language, number of values and order match the approved template; the template is approved, not pending. |
| Messages fail with an authentication error | The token has expired or lost permissions. Generate a new permanent system-user token. |
| Messages stay at **Sent** | Receipts are not set up: check the app secret, verify token, callback URL and the `messages` subscription. |

## Related

- [Modules](/help/admin/modules/)
- [Integrations](/help/integrations/)
- [Data protection](/help/security/data-protection/)
