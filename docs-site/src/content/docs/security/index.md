---
title: Security for administrators
description: How the LIMS protects access and records - roles, passwords, lockout, sessions, password confirmation, audit log, signatures, report verification, storage and backups.
sidebar:
  order: 1
---

This page explains the security controls an administrator sets up and relies on, and what to check during an audit. It describes how the system behaves, not how to attack it.

## Roles and least privilege

- Every person has their own account. Never share sign-ins: the audit log and electronic signatures depend on knowing who did what.
- Access comes only from roles, and roles are made of permissions. The server checks permissions on every request; hidden menus are only a convenience. See [Permissions](/help/admin/permissions/).
- Give the smallest role that covers each person's work. Use **Admin** → **Access review** regularly to find accounts that can manage users or roles, and accounts with no sign-in for 90 days. See [Users and roles](/help/admin/users-roles/#access-review).
- Nobody can widen their own access. A person who manages users but not roles (or the other way round) can only give what they hold themselves. Every widening of access notifies the other administrators.
- At least one role in use always keeps user management, and an administrator cannot remove their own, so the lab cannot lock itself out.
- The built-in **Admin** role cannot enter test results (it lacks `tests.work`), which keeps administration apart from bench work.
- Someone refused 20 times in ten minutes triggers a security notification to administrators.

## Technicians never see customer identity or prices

ISO/IEC 17025 asks laboratories to protect impartiality. The LIMS does this in two layers:

1. **Permissions.** Customer names, contacts, and documents and attachments that show them need `customers.view`. Prices need `rates.view`, `quotations.view` or `invoices.view`. The **Technician / Analyst** role has none of these: it works only on assigned tests, by sample code. Notifications carry codes only, because they reach technicians.
2. **The impartiality control.** **Hide customer identity from technicians** (`controls.impartiality`, on by default) keeps the customer off test lists and test screens even for people who could otherwise see it. It is a sensitive setting: turning it off needs a recorded reason. See [Settings](/help/admin/settings/#controls).

Other separation-of-duties controls, both off by default and sensitive: **Allow self-approval of results** and **Allow same reviewer and signatory**.

## Password rules

- At least 10 characters, with upper case, lower case, a digit and a symbol.
- New accounts and passwords reset by an administrator are temporary: the person must change them at first sign-in.
- **Forgot password** emails a one-time link that works for one hour. Using it makes any other reset link for that person stop working. The link is blanked from the stored copy of the email once sent.
- Passwords are stored only as strong one-way hashes, never in the audit log.
- Optional **Two-factor login** with an authenticator app is offered on **My account** to people holding the **Admin**, **Authorised Signatory** or **Accounts** role (by role name).

## Lockout

- Five wrong passwords lock an account for 15 minutes. Wrong passwords when confirming a sensitive action count too.
- Sign-in is also limited per network address and email, and too many failures from one network make it wait ten minutes.
- The sign-in page gives the same answer for a wrong password, an unknown email and a locked account, so it never reveals which emails have accounts.
- An administrator's **Reset password** unlocks the account at once.
- Each person can see their **Recent sign-ins** (their last 50 sign-ins and failed attempts) on **My account**.

## Sessions

- A session ends after 30 minutes without activity (`SESSION_IDLE_MINUTES`) and 12 hours after sign-in however active it is (`SESSION_MAX_HOURS`). The person who runs the server can change both.
- Each person sees **Where you're signed in** on **My account** and can **Sign out** one device or **Sign out everywhere else**.
- Changing a password signs the person out. Resetting someone's password or switching their account off ends all their sessions at once.
- Sessions are held on the server. The browser keeps only a session cookie (HttpOnly, same-site, and secure over HTTPS), and requests that change data must also carry a per-session token held in memory.

## Re-confirming your password

Actions that change who can see or do what, or that export data in bulk, ask **Confirm your password**. After you confirm, you are not asked again for ten minutes. These actions include:

- adding a user, changing someone's roles, switching an account off, resetting a password,
- creating a role or changing its permissions, approving an access request,
- saving the lab profile (it prints on every invoice and report),
- erasing personal data,
- bulk exports of all customers and contacts, or all due invoices (which also notify administrators).

A failed confirmation is recorded and counts towards the lockout.

## Audit log

Every change is recorded with who, when, from which address, before and after, and the reason where one is required. Nobody can edit or delete entries, and the database refuses changes to the audit table. See [Audit log](/help/admin/audit-log/).

## Signatures on reports

- Final approval of a report is an electronic signature by an **Authorised Signatory** (`reports.approve`), using the person's own account. Their **Signature image** and **Designation** print on the report. See [Users and roles](/help/admin/users-roles/#upload-a-signature-image).
- The reviewer and the signatory must be different people unless **Allow same reviewer and signatory** is on.
- At signature the report content is frozen. A fingerprint (hash) of that content prints on the report, and the fingerprint of the PDF is recorded too. A signed report is never edited: a correction is a new revision.

## Report verification

Each approved report revision gets a random verification code, printed on page 1 as a QR code and a link to `https://lims.example.com/verify/<code>`. Anyone holding the report can check it is genuine.

- The code cannot be guessed from the report number, so only someone holding the report can look it up.
- The public answer shows only the laboratory, report and sample identity, the customer's name, results, the approver and the fingerprints. It never shows addresses, contacts, customer numbers, prices, or the lab's tax or bank details.
- A revision gets its own code; the old code then reads as replaced.

## Data storage

- Records live in the server's database; files (reports, invoices, photos, attachments, logos) in private S3-compatible storage. Files are reached only through links that expire after five minutes. See [File storage](/help/integrations/storage/).
- Uploads are checked by their content, not their name, and limited in size.
- No sensitive data is kept in browser storage. The only thing the app stores in the browser is the person's light or dark display choice. The session cookie cannot be read by page scripts.
- Integration secrets (SMTP password, storage keys, WhatsApp token, AI key) live only in the server's environment, never in the browser or the database.

## Backups

Back up the database and the file storage together, on a schedule, and test restoring them. The audit log, issued reports and invoices must survive for your retention periods. See [Installation](/help/install/) for the backup and restore scripts.

## Related

- [Data protection](/help/security/data-protection/)
- [Users and roles](/help/admin/users-roles/)
- [Permissions](/help/admin/permissions/)
- [Audit log](/help/admin/audit-log/)
