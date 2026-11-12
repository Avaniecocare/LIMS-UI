---
title: Errors
description: The single error shape every endpoint uses, every error code with its HTTP status and meaning, field errors and request IDs.
sidebar:
  order: 3
---

Every failed request, from every endpoint, answers with the same JSON shape. Read the `code` to decide what to do, and show the `message` to people: it is written for them.

## The error envelope

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Please check the highlighted fields",
    "requestId": "3f2a9c1e-…",
    "fields": [
      { "field": "contacts.0.email", "message": "email must be an email" }
    ]
  }
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `code` | string | A stable, upper-case code. Use it in your code. |
| `message` | string | A plain sentence for the person using your integration. It may change wording between releases; do not match on it. |
| `requestId` | string or null | The id of this request, also sent in the `X-Request-Id` response header. |
| `fields` | array | Problems with particular fields. Empty when the error is not about one field. |

## Field errors

`fields` lists each field with a problem, by its path in the request body: `name`, `contacts.0.email`, `params.email`. Nested objects are joined with dots and array items by their index.

Show each message next to its field. A field can appear more than once if it breaks more than one rule.

When result entry is refused (`RESULT_INVALID`), `field` is the **parameter id** of each refused entry, so you can mark the right input. The whole save is refused; nothing in it is stored.

## Request IDs

Each request gets an id. The server uses yours if you send `X-Request-Id` (8 to 64 letters, digits, `_` or `-`), and otherwise makes one. It comes back in the `X-Request-Id` header and in `error.requestId`, and it is in every server log line for that request.

When you report a problem, quote the request id. For server errors (status 500 and above) the web app shows it to the user as "Request ID: …".

## Conflicts and versions

Records you can edit carry a `version` number. Send back the version you last read when you save. If someone else saved in between, the save is refused with `409 CONFLICT`, "This record was changed by someone else. Reload and try again." Nothing is saved. Read the record again, apply the change to the new version, and save again.

A database deadlock or serialisation failure also answers `409 CONFLICT`, with "Someone else changed this at the same moment. Nothing was saved, so please try again." Retrying normally works.

## General codes

These can come from any endpoint.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | The request body or query broke a rule: a missing or badly formed field, or a field that is not allowed. See `fields`. |
| 400 | `BAD_REQUEST` | The request does not make sense for this record, for example a sample that is not on this job. The `message` says why; `fields` may name the field. |
| 401 | `UNAUTHENTICATED` | No session, or the session ended. Sign in again. |
| 403 | `FORBIDDEN` | The user does not have permission: "You do not have permission to do this". |
| 404 | `NOT_FOUND` | The record does not exist or was deleted: "Customer not found", "Record not found". |
| 409 | `CONFLICT` | Someone else changed the record. See above. |
| 409 | `DUPLICATE` | "A record with this value already exists", for example a master code that is already used. |
| 409 | `IN_USE` | "This record is linked to other records, so it cannot be changed this way." |
| 413 | `PAYLOAD_TOO_LARGE` | The request body or file is too large. |
| 422 | `INVALID_TRANSITION` | The record cannot move from its current status to the one asked for: "Cannot move from … to …". |
| 422 | `REASON_REQUIRED` | This change needs a reason. `fields` names `reason`. |
| 422 | `LOCKED` | The record can no longer be changed, for example an issued invoice or a test no longer in progress. |
| 429 | `RATE_LIMITED` | Too many requests. Wait, then try again. |
| 500 | `INTERNAL_ERROR` | Something went wrong on the server. Nothing you can fix; quote the request id. |
| 503 | `BUSY` | "The system is busy and could not finish in time. Nothing was saved, so please try again." |
| Other | `ERROR` | Any other HTTP error without a more specific code. |

Status `422` always means a **business rule** refused the request: the request was well formed, but the lab's workflow does not allow it now.

## Sign-in and security

| Status | Code | Meaning |
| --- | --- | --- |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password, or the account is locked. One answer for all three. |
| 401 | `INVALID_TOTP` | The two-factor code is wrong. |
| 401 | `TOTP_EXPIRED` | The two-factor sign-in took too long. Start again. |
| 403 | `CSRF_FAILED` | The `X-CSRF-Token` header is missing or wrong. |
| 403 | `REAUTH_REQUIRED` | Confirm the password, then repeat the request. See [Authentication](/help/developers/authentication/#confirm-the-password-for-sensitive-actions). |
| 403 | `INVALID_PASSWORD` | The password given to confirm an action is wrong. |
| 403 | `PASSWORD_CHANGE_REQUIRED` | The user has a temporary password and must change it first. |
| 403 | `MODULE_OFF` | The lab has turned this module off, or it is not set up yet. |
| 409 | `SETUP_DONE` | First-run setup was already completed. |
| 410 | `LINK_EXPIRED` | A phone-upload link has expired, been used up or been closed. |
| 422 | `ALREADY_REQUESTED` | The user already asked for access to this page. |
| 422 | `TOO_MANY_REQUESTS` | The user has made several access requests today. |
| 422 | `ALREADY_DECIDED` | The access request was already answered. |

## Separation of duties

| Status | Code | Meaning |
| --- | --- | --- |
| 403 | `SELF_APPROVAL` | "You cannot approve results you entered". |
| 403 | `SAME_REVIEWER` | The reviewer and the signatory of a report must be different people. |
| 403 | `NOT_ASSIGNEE` | The test is assigned to someone else. |
| 422 | `SELF_VERIFY` | Someone other than the owner must verify and close a non-conformance. |

## Quotations and booking

| Status | Code | Meaning |
| --- | --- | --- |
| 422 | `NOT_EDITABLE` | Only a draft quotation can be edited. Revise it instead. |
| 422 | `EXPIRED` | The quotation's validity date has passed. |
| 422 | `NOT_ACCEPTED` | Only an accepted quotation can be converted to a job. |
| 422 | `ALREADY_CONVERTED` | The quotation was already converted. |
| 422 | `NOT_ON_HOLD` | The job or test is not on hold. |

## Planning and testing

| Status | Code | Meaning |
| --- | --- | --- |
| 422 | `JOB_NOT_ACTIVE` | The job is not active. |
| 422 | `JOB_NOT_PLANNABLE` | The job's status does not allow planning. |
| 422 | `JOB_ON_HOLD` | The job is on hold. |
| 422 | `JOB_CANCELLED` | The job has been cancelled. |
| 422 | `SAMPLE_CANCELLED` | A cancelled sample cannot be planned. |
| 422 | `ALREADY_PLANNED` | The test is already planned on that sample. |
| 422 | `NOT_PLANNED` | A test must be planned before it is assigned. |
| 422 | `NOT_ASSIGNABLE` | The test's status does not allow reassignment. |
| 422 | `NOT_AUTHORISED` | The analyst is not authorised for the test (when the lab requires authorisation). |
| 422 | `NO_PARAMETERS` | The test has no parameters. Add them in Masters. |
| 422 | `INSTRUMENT_OVERDUE` | The instrument is past its calibration due date. |
| 422 | `NOT_IN_PROGRESS` | Start the test before completing stages. |
| 422 | `STAGE_ORDER` | Complete the earlier stages first. |
| 422 | `STAGE_DONE` | The stage is already complete. |
| 422 | `STAGES_INCOMPLETE` | Complete every stage before submitting. |
| 422 | `RESULTS_MISSING` | Some parameters have no result. The message lists them. |
| 400 | `RESULT_INVALID` | Some entered results are not valid. `fields` holds the parameter ids. |
| 422 | `RESULTS_INVALID` | Calculated results could not be worked out. The message lists the parameters. |

## Reports

| Status | Code | Meaning |
| --- | --- | --- |
| 422 | `TESTS_OPEN` | Some tests are still being re-tested. |
| 422 | `NOT_ISSUED` | Only an issued report can be emailed, sent, revised or dispatched. Also used for invoices. |
| 422 | `PDF_PENDING` | The final PDF is still being prepared. Try again in a moment. |
| 422 | `PDF_NOT_MISSING` | Only an approved report with no final PDF can have it prepared again. |
| 422 | `WITHHELD` | The customer's reports are withheld until payment is received. |
| 422 | `CANNOT_CANCEL` | The test or sample has an approved report. Revise the report instead. |

## Dispatch

| Status | Code | Meaning |
| --- | --- | --- |
| 422 | `NOT_RETURNABLE` | The sample is not marked as returnable. |
| 422 | `RETURNED` | The sample was already returned to the customer. |
| 422 | `DISPOSED` | The sample was already disposed of. |

## Invoices and payments

| Status | Code | Meaning |
| --- | --- | --- |
| 422 | `NOTHING_TO_BILL` | The jobs have no approved tests left to bill. |
| 422 | `RATE_MISSING` | A test has no rate. Add one in Masters. |
| 422 | `NOT_PAYABLE` | The invoice cannot take a payment. |
| 422 | `OVERPAYMENT` | The amount is more than the invoice's balance. |
| 422 | `OVER_APPLIED` | Less is left on the payment than you tried to apply. |
| 422 | `OVERCREDIT` | The credit note is more than the invoice's balance. |
| 422 | `HAS_PAYMENTS` | The invoice has payments or credit notes. Reverse them first. |
| 422 | `NOT_DUE` | Only unpaid invoices can be reminded. |

## Quality and privacy

| Status | Code | Meaning |
| --- | --- | --- |
| 422 | `BAD_STEP` | A non-conformance cannot move to that step from its current one. |
| 422 | `INCOMPLETE` | Record the required part (correction, root cause, corrective action or verification) first. |
| 422 | `ALREADY_AUTHORISED` | The person is already authorised for that test. |
| 422 | `ALREADY_WITHDRAWN` | The authorisation was already withdrawn. |
| 422 | `ALREADY_ANSWERED` | The privacy request was already answered. |
| 422 | `NOT_ERASURE` | Only an erasure request or a withdrawal of consent can erase data. |

## Exports, email and WhatsApp

| Status | Code | Meaning |
| --- | --- | --- |
| 422 | `TOO_MANY_ROWS` | The report has too many rows for a PDF. Narrow the filters or export to Excel. |
| 502 | `EMAIL_FAILED` | A test email failed: the mail server refused or could not be reached. |
| 422 | `WHATSAPP_OFF` | WhatsApp is not set up for this laboratory. |
| 502 | `WHATSAPP_FAILED` | A WhatsApp test message failed, or WhatsApp could not be reached. |

## Handling errors well

- Branch on `code` and the HTTP status, never on `message`.
- For `400` with `fields`, show each message on its field.
- For `401`, sign in again. For `403 REAUTH_REQUIRED`, confirm the password and retry.
- For `409 CONFLICT`, reload the record and let the person redo the change.
- For `429`, `503 BUSY` and deadlock conflicts, wait and retry.
- Treat an unknown `code` like `BAD_REQUEST` and show the `message`.

## Related

- [Authentication](/help/developers/authentication/)
- [Error messages for users](/help/troubleshooting/error-messages/)
- [API reference](/help/developers/api/)
