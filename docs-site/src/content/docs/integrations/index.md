---
title: Integrations
description: The outside services the LIMS connects to, which are required, and what each one needs.
sidebar:
  order: 1
---

The LIMS connects to a few outside services. Each is set up by whoever runs the server, through environment variables in the server's `.env` file, and needs a restart to change. Nothing here is set in the browser, and no secret is ever sent to the browser.

| Integration | Required? | What it is for | What it needs |
| --- | --- | --- | --- |
| [Email (SMTP)](/help/integrations/email-smtp/) | Yes | Acknowledgements, quotations, reports, invoices, reminders, password resets, notifications by email. | An SMTP mail account: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. |
| [File storage](/help/integrations/storage/) | Yes | Reports, invoices, photos, attachments, logos and exports. | An S3-compatible bucket: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` and others. |
| [WhatsApp](/help/integrations/whatsapp/) | No | Send reports, invoices, sample-received letters and payment reminders on WhatsApp. | A WhatsApp Business account on Meta's Cloud API, approved message templates, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`; for delivered and read receipts also `WHATSAPP_APP_SECRET` and `WHATSAPP_VERIFY_TOKEN`. |
| [PIN code lookup](/help/integrations/pincode-lookup/) | No (on by default) | Fill the city, state and area from a PIN code on address forms. | Internet access from the server; `PINCODE_LOOKUP_URL`. |
| [Error tracking](/help/integrations/error-tracking/) | No | Send server errors to your error tracker or chat. | An HTTPS webhook: `ERROR_TRACKING_DSN`. |
| [AI help assistant](/help/integrations/ai-assistant/) | No | The **Ask AI** button on the help pages. | An AI provider API key and limits: `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` and others. |

GSTIN auto-fill (state, GST state code and PAN from a GSTIN) works on the server with no outside call and needs no setup.

:::caution
Keep the `.env` file private. Never paste real tokens, keys or passwords into tickets, chats or these docs. Use a separate key for each service and each installation, so one can be withdrawn without affecting the others.
:::

## Related

- [Installation](/help/install/)
- [Security for administrators](/help/security/)
