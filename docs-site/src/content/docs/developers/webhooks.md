---
title: Webhooks
description: The incoming WhatsApp status webhook (how it is verified and signed, and what it changes) and the outgoing error-tracking webhook.
sidebar:
  order: 6
---

The LIMS has one incoming webhook, for WhatsApp delivery receipts, and one outgoing webhook, for server errors.

## WhatsApp status webhook (incoming)

Meta's WhatsApp Cloud API calls this webhook when a message the lab sent is delivered, read or fails. The LIMS uses it only to move a message's status forwards. Without it, WhatsApp messages still send, but stay at "sent".

| | |
| --- | --- |
| Address | `<PUBLIC_API_URL>/api/v1/webhooks/whatsapp`, for example `https://api.lims.example.com/api/v1/webhooks/whatsapp`. Admin, WhatsApp shows it. |
| Needs | `WHATSAPP_VERIFY_TOKEN` and `WHATSAPP_APP_SECRET` set on the server |
| Sign-in | None. Calls are checked by the verify token and the signature instead. |
| In the API reference | No: it is for Meta only. |

### Set it up

**Goal:** have WhatsApp tell the LIMS when messages are delivered and read.

**Who can do it:** the server administrator, with access to the lab's Meta app.

**Before you start:** WhatsApp is already sending. See [WhatsApp](/help/integrations/whatsapp/).

**Steps:**

1. Choose a long random verify token.
2. Set `WHATSAPP_VERIFY_TOKEN` to it, and `WHATSAPP_APP_SECRET` to the app secret from the Meta app's **Settings > Basic**, in `deployment.env`. Run `deploy.sh`.
3. In the Meta app's WhatsApp webhook settings, enter the address above as the callback URL and the same verify token. Subscribe to message status updates.

**Result:** Meta verifies the address. From then on, messages in the LIMS move from "sent" to "delivered" and "read".

### Verification (GET)

When you save the webhook, Meta calls it once to prove you own it:

```http
GET /api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<your-verify-token>&hub.challenge=1158201444 HTTP/1.1
Host: api.lims.example.com
```

If `hub.mode` is `subscribe` and `hub.verify_token` matches `WHATSAPP_VERIFY_TOKEN`, the server answers `200` with the challenge, as plain text:

```http
HTTP/1.1 200 OK
Content-Type: text/plain

1158201444
```

Anything else, or no verify token configured, gets `403` ("Not accepted").

### Status updates (POST)

Each call carries Meta's signature of the raw body, made with the app secret, in the `X-Hub-Signature-256` header:

```http
POST /api/v1/webhooks/whatsapp HTTP/1.1
Host: api.lims.example.com
Content-Type: application/json
X-Hub-Signature-256: sha256=<hex HMAC-SHA256 of the body with WHATSAPP_APP_SECRET>

{"entry":[{"changes":[{"value":{"statuses":[{"id":"wamid.<id>","status":"delivered","timestamp":"1731400000"}]}}]}]}
```

The server computes `sha256=` plus the hex HMAC-SHA256 of the exact raw body with `WHATSAPP_APP_SECRET`, and compares it in constant time. An unsigned call, a wrong signature, or no app secret configured gets `403`. A good call gets `200` with `{"ok": true}`.

What the server does with each status:

| Status from Meta | Effect on the message |
| --- | --- |
| `sent` | Status becomes "sent", if it was not already further on. |
| `delivered` | Status becomes "delivered"; the delivery time is recorded once. |
| `read` | Status becomes "read"; the delivery and read times are recorded once. |
| `failed` | Status becomes "failed", with WhatsApp's reason and error code. |

A status only moves forwards (sent, then delivered, then read), so late or repeated receipts change nothing. Statuses for messages the LIMS does not know are ignored. Nothing else in the body is used.

To test the signature yourself:

```bash
body='{"entry":[]}'
sig=$(printf '%s' "$body" | openssl dgst -sha256 -hmac '<app-secret>' -hex | sed 's/^.* //')
curl -s -X POST -H 'Content-Type: application/json' -H "X-Hub-Signature-256: sha256=$sig" \
  -d "$body" https://api.lims.example.com/api/v1/webhooks/whatsapp
```

## Error-tracking webhook (outgoing)

When `ERROR_TRACKING_DSN` is set to an `https://` address, the API and the worker post each server error there as JSON. Any tool that accepts a JSON webhook can receive it: a Sentry relay, a Slack or Teams incoming webhook behind a small adapter, or a log collector.

```http
POST <ERROR_TRACKING_DSN> HTTP/1.1
Content-Type: application/json

{
  "service": "lims",
  "time": "2026-11-12T10:15:00.000Z",
  "name": "Error",
  "message": "…",
  "stack": "Error: …\n    at …",
  "context": { "requestId": "3f2a9c1e-…" }
}
```

| Field | Meaning |
| --- | --- |
| `service` | `lims` for the API, `lims-worker` for the worker. |
| `time` | When it happened (UTC, ISO 8601). |
| `name`, `message` | The error's name and message. |
| `stack` | The first 20 lines of the stack trace. |
| `context` | Ids only: the request id for API errors; the queue and job id for failed background jobs. |

What it sends:

- API errors with status 500 or more, and failed background jobs.
- At most 30 reports a minute per process; the rest are dropped.
- Never request bodies, and only ids from the context, so no customer data or passwords.

It is best effort: it never slows a request, gives up after 3 seconds, and a failed delivery is only logged as a warning. An address that is not `https://` turns reporting off, with a warning in the log.

See [Error tracking](/help/integrations/error-tracking/).

## Related

- [WhatsApp](/help/integrations/whatsapp/)
- [Environment variables](/help/install/environment/#whatsapp)
- [Operations](/help/install/operations/#monitoring)
