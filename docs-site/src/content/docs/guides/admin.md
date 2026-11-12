---
title: Admin
description: The day of the LIMS administrator, with step-by-step tasks for users, roles, access requests, role previews, modules, settings, holidays and the audit log.
sidebar:
  order: 2
---

The Admin sets the LIMS up for the laboratory and keeps it running: people and their roles, the test catalogue and rates, settings, branding and templates. The Admin can see every record. Detailed reference for each admin screen is in [Administration](/help/admin/).

## Your day

- When the laboratory is new, you finish the lab setup: profile, branding and catalogue.
- You add people when they join, give them roles, and switch accounts off when they leave.
- You answer access requests from people who opened a page their role does not include.
- You keep masters up to date: tests, parameters, specifications, instruments, rates.
- You change operating settings when the lab's practice changes, with a reason for each change.
- You check the audit log and the access review from time to time.

## Screens you use

| Screen | What for |
| --- | --- |
| **Admin** | Tabs **Users**, **Roles**, **Access requests**, **Access review**, **Settings**, **Terms**, **Holidays**, **Audit log**, **Lab profile**, **Branding**, **Email templates**, **Modules**, **WhatsApp**, **Privacy** |
| **Masters** | The test catalogue, specifications, instruments, rates and lookups |
| Every other screen | The Admin can open all records |

The Admin role holds every permission except `tests.work`, so an administrator cannot enter test results. Admin screens are wide; use a computer.

:::caution
Giving roles, changing role permissions, deactivating someone and exporting every customer ask you to **Confirm your password**. You are not asked again for ten minutes.
:::

## How to finish setting up the laboratory

**Goal**: Complete the lab's profile, branding and catalogue after installation.

**Who can do it**: Admin (`admin.company.edit`).

**Steps**:

1. Sign in. Until setup is finished, the setup wizard opens when you arrive at the dashboard, and a banner says "Finish setting up your laboratory: … of … steps done."
2. Select **Continue setup** on the banner if the wizard is not open.
3. Work through the steps **Lab profile**, **Branding**, **Lab type** (what your laboratory tests), **Team** and **Email**. Select **Continue** after each, or **Skip for now** where offered.
4. On **Review**, check what is done and select **Finish setup**.

**Result**: Anything not done yet can be finished later; the banner reminds you until it is. When every step is done, the banner disappears. Setup is best done on a computer.

**Related**: [Setup wizard](/help/admin/setup-wizard/), [Branding](/help/admin/branding/), [Masters](/help/admin/masters/)

## How to add a user

**Goal**: Give a new member of staff an account with the right roles.

**Who can do it**: Admin (`admin.users`).

**Steps**:

1. Select **Admin**. The **Users** tab opens.
2. Select **Add user**.
3. Enter the **Name**, **Email**, **Designation** (printed on signed reports) and **Phone**.
4. Enter a **Temporary password**. The user must change it at first sign-in.
5. Under **Roles**, tick each role the person needs.
6. Select **Save user**. Confirm your password if asked.

**Result**: The message "User saved" appears. Give the person the LIMS address, their email and the temporary password.

For an authorised signatory, open the user again and select **Upload signature** under **Signature image**. It is printed on the reports they sign.

<!-- screenshot: admin-add-user -->

**Related**: [Users and roles](/help/admin/users-roles/)

## How to reset a user's password or switch an account off

**Goal**: Help someone who is locked out, or stop a leaver signing in.

**Who can do it**: Admin (`admin.users`).

**Steps**:

1. Select **Admin**, then **Users**, and find the person with **Search name or email**.
2. To reset the password, select **Reset password** on their row, enter a **Temporary password**, and select **Reset password**. This ends their current sessions.
3. To switch the account off, open the person, untick **Active**, and select **Save user**.

**Result**: After a reset, the message "Password reset. The user must change it at next sign-in." appears. An inactive account cannot sign in.

**Related**: [Users and roles](/help/admin/users-roles/)

## How to answer an access request

**Goal**: Decide on a request from someone who needs a page their role does not include.

**Who can do it**: Admin (`admin.users`).

**Steps**:

1. You get a notification. Select **Admin**, then **Access requests**. The **Waiting** tab lists open requests with the page and reason.
2. To approve, select **Approve**, choose a role in **Give this role** (the smallest role that covers what they need), add a **Note to them** if useful, and select **Approve and give role**.
3. To decline, select **Decline**, and confirm with **Decline**.

**Result**: The person is notified either way, and sees the answer under **My access requests** in **My account**.

**Related**: [Users and roles](/help/admin/users-roles/)

## How to preview what a role sees

**Goal**: Check the menus and buttons a role gets before you give it to someone.

**Who can do it**: Admin (`admin.roles`).

**Steps**:

1. Select **Admin**, then **Roles**.
2. Select **Preview** on the role's row.
3. Look around the LIMS. A bar says "Previewing as …".
4. Select **Exit preview** when you are done.

**Result**: You see the menus and buttons that role sees. Your own access is unchanged, and the server still checks your real permissions.

**Related**: [Users and roles](/help/admin/users-roles/)

## How to change what a role can do

**Goal**: Add or remove permissions from a role, or create a new role.

**Who can do it**: Admin (`admin.roles`).

**Steps**:

1. Select **Admin**, then **Roles**.
2. Open the role, or select **Add role** for a new one.
3. Enter or change the **Role name** and **Description**.
4. Tick or untick permissions. They are grouped by module.
5. Select **Save role**. Confirm your password if asked.

**Result**: The message "Role saved" appears. Everyone with the role gets the change.

:::tip
Built-in roles keep the changes you make. Later upgrades only add new permissions to them; they never undo yours.
:::

**Related**: [Users and roles](/help/admin/users-roles/)

## How to turn a module on or off

**Goal**: Hide parts of the product your lab does not use.

**Who can do it**: Admin (`admin.company.edit`).

**Steps**:

1. Select **Admin**, then **Modules**.
2. Tick or untick the modules: orders and quotations, dispatch, billing, file library, photos from a phone, analytics and MIS reports, quality management, WhatsApp.
3. Select **Save modules**.

**Result**: The message "Modules saved. Menus and pages follow at once." appears. Turning a module off deletes nothing. WhatsApp stays off until the server is also set up for it.

**Related**: [Modules](/help/admin/modules/), [WhatsApp](/help/features/whatsapp/)

## How to change a setting

**Goal**: Change how the lab operates, for example the GST rate, credit days, number formats or controls.

**Who can do it**: Admin (`admin.settings`).

**Steps**:

1. Select **Admin**, then **Settings**.
2. Find the setting in its group.
3. Change the value.
4. Enter the **Reason for this change**. It is written to the audit log.
5. Select **Save** next to the setting.

**Result**: The message "… saved" appears.

**Related**: [Settings](/help/admin/settings/)

## How to add a holiday

**Goal**: Mark a day the lab is closed, so due dates skip it.

**Who can do it**: Admin (`admin.settings`).

**Steps**:

1. Select **Admin**, then **Holidays**.
2. Enter the **Date** and the **Holiday** name.
3. Select **Add holiday**.

**Result**: The holiday is listed. Tests planned from now on skip it when their due date is worked out.

**Related**: [Terms and holidays](/help/admin/terms-holidays/), [Key concepts](/help/getting-started/concepts/)

## How to search the audit log

**Goal**: Find who changed what, and when.

**Who can do it**: Admin (`admin.audit`).

**Steps**:

1. Select **Admin**, then **Audit log**.
2. Filter by **Record type**, **Action starts with**, **From** and **To**.
3. Open an entry to see its details.

**Result**: You see the matching changes with who made them and when.

**Related**: [Audit log](/help/admin/audit-log/), [Security](/help/security/)
