---
title: Users and roles
description: Add and manage staff accounts, build roles from permissions, answer access requests and review who holds what.
sidebar:
  order: 3
---

Each person who uses the system has their own account and one or more roles. A role decides which menus, pages and buttons they see and what the server lets them do. This page covers the **Users**, **Roles**, **Access requests** and **Access review** tabs in **Admin**.

:::tip
Give each person the smallest role that covers their work. A technician needs only **Technician / Analyst**. See [Permissions](/help/admin/permissions/) for what each built-in role holds.
:::

## Users

The **Users** tab lists everyone with their **Name**, **Email**, **Roles**, **Status** (**Active** or **Inactive**) and **Last sign-in**. Use **Search name or email** to find someone. Click a row to edit that person.

<!-- screenshot: admin-users -->

### Add a user

**Goal**: give a new member of staff their own sign-in.

**Who can do it**: Admin (`admin.users`).

**Steps**:

1. In **Admin** → **Users**, click **Add user**.
2. Fill in **Name** and **Email**.
3. Optionally fill in **Designation** (printed on reports this person signs) and **Phone**.
4. Enter a **Temporary password**. It must follow the [password rules](/help/security/#password-rules).
5. Under **Roles**, tick one or more roles.
6. Click **Save user**. If asked, confirm your password.

**Result**: the message **User saved** appears and the person is in the list. Tell them their email and temporary password; they must change the password at first sign-in.

:::note
You can only give a role whose permissions you hold yourself, unless you hold both `admin.users` and `admin.roles` (a full administrator). Every role you give is recorded in the audit log, and the other administrators get a security notification.
:::

### Edit a user or switch an account off

**Goal**: change someone's details or roles, or stop them signing in.

**Who can do it**: Admin (`admin.users`).

**Steps**:

1. In **Admin** → **Users**, click the person's row.
2. Change **Name**, **Email**, **Designation**, **Phone** or the ticked **Roles**. A new email is what they sign in with from then on: they are signed out, and both addresses are told. Their password stays the same.
3. To stop the person signing in, untick **Active**.
4. Click **Save user**. Changing roles or switching an account off asks you to confirm your password.

**Result**: **User saved**. An account switched off is signed out everywhere at once.

:::caution
You cannot switch off your own account, and you cannot remove your own access to user management. Accounts are never deleted, so their history stays in the audit log.
:::

### Reset a password

**Goal**: let someone back in who has forgotten their password.

**Who can do it**: Admin (`admin.users`).

**Steps**:

1. In **Admin** → **Users**, click **Reset password** on the person's row.
2. Enter a **Temporary password**.
3. Click **Reset password** and confirm your own password if asked.

**Result**: **Password reset. The user must change it at next sign-in.** The reset also ends all of that person's current sessions and unlocks the account if it was locked.

People can also reset their own password with **Forgot password** on the sign-in page. They get an email with a link that works for one hour.

### Turn off two-factor sign-in for a lost phone

**Goal**: let someone back in who has lost the phone that makes their codes.

**Who can do it**: Admin (`admin.users`). You cannot do it for someone who holds permissions you don't have, unless you are a full administrator.

**Steps**:

1. Check that it is really the person asking.
2. In **Admin** → **Users**, open the person.
3. Under **Two-factor sign-in is on**, click **Turn off**, and confirm your own password if asked.

**Result**: they are signed out everywhere and can sign in with their password alone. They should set two-factor up again from their account page. The change is in the audit log, and other administrators are told.

If the only administrator loses their phone, whoever runs the server can do it: `node dist/recover.js reset-2fa <email>` in the API container.

### Upload a signature image

**Goal**: print a person's signature on the reports they sign.

**Who can do it**: Admin (`admin.users`).

**Before you start**: scan or photograph the signature as a PNG or JPEG.

**Steps**:

1. In **Admin** → **Users**, click the person's row.
2. Under **Signature image**, click **Upload signature** (or **Replace signature**).
3. Choose the image file.

**Result**: **Signature saved**, and the section shows **Signature on file** with a preview. Reports this person approves from now on carry the image.

## Roles

The **Roles** tab lists each role with its **Description**, number of **Users** and number of **Permissions**.

### Create or edit a role

**Goal**: make a role that fits a job in your lab.

**Who can do it**: Admin (`admin.roles`).

**Steps**:

1. In **Admin** → **Roles**, click **Add role**, or click an existing role's row.
2. Enter a **Role name** and, optionally, a **Description**.
3. Tick the permissions. They are grouped by area; each shows a short description.
4. Click **Save role**. Creating a role or changing its permissions asks you to confirm your password.

**Result**: **Role saved**. Everyone holding the role gets the change.

:::note
- Unless you are a full administrator, you can only add permissions you hold yourself.
- At least one role that is in use must keep **Manage users** (`admin.users`), so the lab cannot lock itself out.
- When permissions are added to a role, the other administrators get a security notification.
:::

### Preview the app as a role

**Goal**: check what a role sees before you give it to someone.

**Who can do it**: Admin (`admin.roles`).

**Steps**:

1. In **Admin** → **Roles**, click **Preview** on the role's row.
2. You go to the dashboard. A bar says **Previewing as** the role: you see the menus and buttons that role sees.
3. Click **Exit preview** when done.

**Result**: you see the interface as that role. Your own access is unchanged: the server still checks your own permissions, so this is a view, not a way to test what the server allows.

## Access requests

When someone opens a page their roles do not include, they see **You don't have access to this page**. They can explain **Why do you need it?** and click **Request access**. People with `admin.users` get a notification, and the request appears in **Admin** → **Access requests**.

The tab has three lists: **Waiting**, **Approved** and **Declined**. Each request shows the **Person** and their current roles, the page they **Asked for**, their **Reason** and when they **Asked**.

### Approve or decline a request

**Goal**: answer a request for access.

**Who can do it**: Admin (`admin.users`).

**Steps**:

1. In **Admin** → **Access requests**, find the request under **Waiting**.
2. To approve, click **Approve**, choose a role in **Give this role**, optionally write a **Note to them**, and click **Approve and give role**. Confirm your password if asked.
3. To decline, click **Decline**, write the reason, and click **Decline**.

**Result**: the person is notified either way. An approval adds the role to their account; a decline sends them your reason. They can see their requests and answers on **My account**.

:::tip
The role list in the approval dialog shows only active roles you could give, with their number of permissions. Choose the smallest role that covers what they need.
:::

## Access review

**Admin** → **Access review** is a regular check of who holds what. It shows:

- **Active accounts**, the number that **Can manage users or roles**, and **Dormant accounts to review**.
- **People and their access**: each person's roles, number of permissions, last sign-in, and flags under **Look at**. People who can manage users or roles come first, then dormant accounts.
- **Who holds each permission**: for every permission, how many active accounts hold it.

| Flag | Meaning |
| --- | --- |
| **Can manage users or roles** | The account holds `admin.users` or `admin.roles`. |
| **No sign-in for 90 days** / **Never signed in** | A dormant account. Switch it off if the person no longer needs it. |
| **Locked** | Locked after too many wrong passwords. |
| **Inactive** | Switched off. |
| **Must change password** | Has a temporary password not yet changed. |

Click a person to go to **Users**, where you can change their roles or switch the account off.

## Related

- [Permissions](/help/admin/permissions/)
- [Security for administrators](/help/security/)
- [Audit log](/help/admin/audit-log/)
