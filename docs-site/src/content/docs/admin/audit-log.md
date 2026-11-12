---
title: Audit log
description: What the audit log records, how to filter it, how long it is kept, and why nobody can change it.
sidebar:
  order: 13
---

The audit log is the permanent record of who changed what, when, from where, and why. Auditors and assessors use it to check that records were not altered without trace. Open it in **Admin** → **Audit log**.

<!-- screenshot: admin-audit-log -->

## What is recorded

Each entry has:

| Column | What it shows |
| --- | --- |
| **When** | Date and time of the change. |
| **User** | Who made it, or **System** for automatic work (for example scheduled reminders). |
| **Action** | What happened, for example `user.update`, `setting.update`, `role.update`, `Job.status`. |
| **Record** | The kind of record, for example `User`, `Setting`, `Invoice`. |
| **Reason** | The reason given, where one was required (sensitive settings, cancellations, holds, revisions and so on). |
| **IP** | The network address the request came from. |

Click an entry to see the record **Before** and **After** the change.

Recorded events include, among others:

- **Sign-ins**: successful sign-ins, wrong passwords, attempts while locked, accounts locked, password confirmations and failed confirmations, password resets.
- **People and access**: users created or changed, roles given, role permission changes, password resets by an administrator, signature images, access requests and their answers, security alerts.
- **Configuration**: every setting change with old and new value, the lab profile (with the previous values, including bank details), branding and pictures, modules, email and WhatsApp templates, terms versions, holidays, lab-type templates applied.
- **Work records**: every status change of jobs, samples, tests, reports, invoices and other records, master data changes, every changed result value with before and after, file downloads, WhatsApp messages queued.
- **Privacy**: privacy requests received and answered, erasures, breaches logged and updated.

Passwords, password hashes, two-factor secrets and token hashes are removed before anything is written to the log.

## Find entries

**Goal**: find the changes you need to look at.

**Who can do it**: Admin (`admin.audit`).

**Steps**:

1. Open **Admin** → **Audit log**. The newest entries are first.
2. To narrow the list, fill in any of:
   - **Record type**: the exact kind of record, for example `Setting` or `User`.
   - **Action starts with**: the start of the action, for example `auth.` for all sign-in events or `user.` for user changes.
   - **From** and **To**: a date range.
3. Click an entry to see **Before** and **After**.

**Result**: the list shows only matching entries, in pages.

:::tip
Every record with a **History** tab (master records, jobs, reports, invoices and others) shows its own audit entries, so you can often start from the record instead.
:::

## Why it cannot be edited

- Nobody can change or delete an entry, from the app or the API. There is no edit button for any role.
- The database itself refuses to update, delete or empty the audit table.
- An entry is written in the same transaction as the change it records: if the change is saved, so is its entry; if the change fails, neither is kept.

<!-- TODO(verify): the database rule could still be switched off by someone with full database owner rights; the deployment can run the app under a non-owner database role to close this. Confirm what the installation guide recommends. -->

## Retention

Audit entries are kept for as long as the database is kept. The system never deletes them, and there is no setting to purge them. Include the database in your backups. See [Installation](/help/install/).

## Security alerts

Some events also notify everyone with `admin.users`, with a link to the audit log:

- someone's access widens (a role given, permissions added to a role),
- a person is refused 20 times in ten minutes,
- a bulk export of all customers and contacts, or of all due invoices.

## Related

- [Security for administrators](/help/security/)
- [Users and roles](/help/admin/users-roles/)
- [Settings](/help/admin/settings/)
