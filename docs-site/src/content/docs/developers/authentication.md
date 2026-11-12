---
title: Authentication
description: Sign in to the API, keep the session cookie, send the CSRF token, confirm the password for sensitive actions, and understand permission errors.
sidebar:
  order: 2
---

The API uses the same sign-in as the web app: a session cookie plus a CSRF token. There are no API keys or bearer tokens. An integration signs in as a user and can do exactly what that user's roles allow.

## Sign in

**Goal:** start a session.

**Who can do it:** any active user.

**Steps:**

1. Send the email and password:

   ```http
   POST /api/v1/auth/login HTTP/1.1
   Host: api.lims.example.com
   Content-Type: application/json

   {"email": "user@example.com", "password": "<your-password>"}
   ```

2. Keep the `lims_sid` cookie from the `Set-Cookie` header, and the `csrfToken` from the body.

**Result:** `200` with the user:

```json
{
  "user": {
    "id": "…",
    "name": "…",
    "email": "user@example.com",
    "designation": null,
    "roles": ["Accounts"],
    "permissions": ["invoices.view", "invoices.edit"],
    "csrfToken": "<csrf-token>",
    "totpEnabled": false,
    "mustChangePassword": false,
    "totpAvailable": true,
    "modules": ["billing", "dispatch"]
  }
}
```

With `curl`:

```bash
curl -s -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"<your-password>"}' \
  https://api.lims.example.com/api/v1/auth/login
```

A wrong password, an unknown email and a locked account all get the same answer, `401 INVALID_CREDENTIALS`, so the response never reveals which emails exist.

### Two-factor sign-in

Users with two-factor login turned on get a challenge instead of a session:

```json
{ "totpChallenge": "<challenge>" }
```

Send the 6-digit code from their authenticator app within 5 minutes:

```http
POST /api/v1/auth/login/totp HTTP/1.1
Content-Type: application/json

{"challenge": "<challenge>", "code": "123456"}
```

The answer is the same as a normal sign-in. A wrong code gives `401 INVALID_TOTP`; an expired challenge gives `401 TOTP_EXPIRED`; more than 5 tries gives `429 RATE_LIMITED`. Two-factor login is available to the Admin, Authorised Signatory and Accounts roles.

## The session cookie

| Property | Value |
| --- | --- |
| Name | `lims_sid` (setting `SESSION_COOKIE_NAME`) |
| Flags | `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/` |
| Idle timeout | 30 minutes without a request (`SESSION_IDLE_MINUTES`). Each request extends it. |
| Absolute limit | 12 hours after sign-in, however active (`SESSION_MAX_HOURS`) |

Send the cookie on every request. From a browser, use `credentials: 'include'`. The session ends early when the user signs out, changes their password, is deactivated, or ends it from their list of sessions.

## The CSRF token

Every request that is not `GET`, `HEAD` or `OPTIONS` must carry the session's CSRF token in this header:

```http
X-CSRF-Token: <csrf-token>
```

The token comes from the sign-in answer and from `GET /api/v1/auth/me`. It stays the same for the whole session. Without it, or with a wrong one, the server answers `403 CSRF_FAILED`.

```bash
curl -s -b cookies.txt -H 'Content-Type: application/json' \
  -H 'X-CSRF-Token: <csrf-token>' \
  -X POST -d '{"kind":"invoice-pdf","params":{"invoiceId":"<invoice-id>"}}' \
  https://api.lims.example.com/api/v1/documents
```

:::tip
Keep the token in memory, not in browser storage. After a page reload, get it again from `GET /api/v1/auth/me`.
:::

## Who am I

```http
GET /api/v1/auth/me HTTP/1.1
Cookie: lims_sid=<session-cookie>
```

Returns the same user object as sign-in: roles, permissions, the modules the lab has turned on and the CSRF token.

## Sign out

```http
POST /api/v1/auth/logout HTTP/1.1
Cookie: lims_sid=<session-cookie>
X-CSRF-Token: <csrf-token>
```

Ends this session and clears the cookie. `GET /api/v1/auth/sessions` lists where the user is signed in; `DELETE /api/v1/auth/sessions` ends all their other sessions and `DELETE /api/v1/auth/sessions/{id}` ends one.

## Temporary passwords

New users, and users whose password an administrator reset, must choose a new password at first sign-in (`mustChangePassword: true`). Until they do, every request outside `/api/v1/auth/` gets `403 PASSWORD_CHANGE_REQUIRED`. Change it with:

```http
POST /api/v1/auth/change-password HTTP/1.1
Content-Type: application/json
X-CSRF-Token: <csrf-token>

{"currentPassword": "<temporary-password>", "newPassword": "<new-password>"}
```

Passwords need at least 10 characters, with an uppercase letter, a lowercase letter, a digit and a symbol. A password change ends all of the user's sessions, this one included, so sign in again afterwards.

## Confirm the password for sensitive actions

Some actions need the user's password confirmed in the same session within the last **10 minutes**: for example granting roles, changing a role's permissions, deactivating users, editing the lab profile and bulk exports of personal or money data. Without a recent confirmation they answer:

```json
{
  "error": {
    "code": "REAUTH_REQUIRED",
    "message": "Confirm your password to continue with this change.",
    "requestId": "…",
    "fields": []
  }
}
```

with status `403`. To continue:

1. Confirm the password:

   ```http
   POST /api/v1/auth/confirm-password HTTP/1.1
   Content-Type: application/json
   X-CSRF-Token: <csrf-token>

   {"password": "<your-password>"}
   ```

2. Send the original request again, unchanged.

A wrong password gives `403 INVALID_PASSWORD` with a field error on `password`. Wrong attempts count towards the same rate limit as sign-in.

## Permissions

Every endpoint states who may call it. There are three kinds:

| Rule | Meaning |
| --- | --- |
| Public | No session needed: sign-in, password reset, public branding, first-run setup, report verification, phone-upload links, the WhatsApp webhook. |
| Signed in | Any signed-in user. The server limits what they get to their own records, for example their own notifications or document jobs. |
| Permission | The user must hold at least one of the listed permission codes, for example `invoices.view`. |

A route with no rule is refused for everyone, so a forgotten check fails closed.

Permissions come from the user's active roles. The codes a user holds are in `permissions` from `GET /api/v1/auth/me`. Some endpoints check more than the code, for example separation of duties: the person who entered results cannot approve them. See [Permissions](/help/admin/permissions/).

Some endpoints belong to a module the lab can turn off. When it is off, they answer `403 MODULE_OFF` for everyone, public phone links included.

## Errors

| Status | Code | Meaning | What to do |
| --- | --- | --- | --- |
| `401` | `UNAUTHENTICATED` | No session, or it ended | Sign in again |
| `401` | `INVALID_CREDENTIALS` | Wrong email or password, or account locked | Check the details; after 5 failures wait 15 minutes |
| `401` | `INVALID_TOTP`, `TOTP_EXPIRED` | Two-factor code wrong, or challenge expired | Try the code again, or sign in again |
| `403` | `CSRF_FAILED` | `X-CSRF-Token` missing or wrong | Get the token from `/auth/me` |
| `403` | `FORBIDDEN` | The user lacks the permission | Use a user with the right role |
| `403` | `REAUTH_REQUIRED` | Sensitive action needs the password confirmed | Confirm, then retry |
| `403` | `PASSWORD_CHANGE_REQUIRED` | Temporary password | Change the password |
| `403` | `MODULE_OFF` | The lab turned that module off | An administrator can turn it on |
| `429` | `RATE_LIMITED` | Too many attempts | Wait and try again |

See [Errors](/help/developers/errors/) for the full list.

## Related

- [API overview](/help/developers/)
- [Errors](/help/developers/errors/)
- [Permissions](/help/admin/permissions/)
