---
title: Error tracking
description: Send server errors to any error tracker, chat channel or log collector through an HTTPS webhook.
sidebar:
  order: 6
---

The LIMS can send its server errors to an HTTPS address of your choice as JSON: an error-tracking relay, a chat webhook (after a small adapter), or a log collector. No vendor library is built in, so you can use any tracker that accepts a webhook.

## Settings

| Variable | What it means | Default |
| --- | --- | --- |
| `ERROR_TRACKING_DSN` | The HTTPS address that receives errors. Empty turns error reporting off. | empty (off) |

The address must start with `https://`. Anything else is ignored, and the server logs a warning that error reporting is off.

```bash
ERROR_TRACKING_DSN=https://errors.example.com/hooks/<your-token>
```

Both the API server and the background worker report errors. Restart both after changing the variable.

## What is sent

Each error is one `POST` with a JSON body:

```json
{
  "service": "lims",
  "time": "2026-11-12T09:30:00.000Z",
  "name": "Error",
  "message": "What went wrong",
  "stack": "Error: What went wrong\n    at ...",
  "context": { "requestId": "<request-id>" }
}
```

| Field | Meaning |
| --- | --- |
| `service` | `lims` for the API server, `lims-worker` for the background worker. |
| `time` | When the error happened (UTC). |
| `name`, `message` | The error's name and message. |
| `stack` | The first 20 lines of the stack trace. |
| `context` | Only identifiers from the moment of the error (names ending in `Id`, and the queue name). |

Request bodies, form contents, passwords and documents are never sent.

## Limits

- At most 30 errors a minute are sent; the rest in that minute are dropped.
- Each send waits at most three seconds and never holds up a request. If the webhook is down, the server logs a warning and carries on.

## Related

- [Integrations](/help/integrations/)
- [Installation](/help/install/)
