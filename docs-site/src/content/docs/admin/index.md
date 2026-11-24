---
title: Administration
description: What the Admin page holds, who can open each tab, and what to set up first.
sidebar:
  order: 1
---

The **Admin** page is where the laboratory's administrator sets up and runs the system: people and their access, the lab's details and look, operating settings, and the records that auditors ask for. Open it from the side menu.

You see only the tabs your roles allow. If you hold none of the permissions below, the **Admin** menu item does not appear.

<!-- screenshot: admin-tabs -->

## The tabs

| Tab | What it is for | Permission needed |
| --- | --- | --- |
| **Users** | Add people, give them roles, reset passwords, upload signature images. | `admin.users` |
| **Roles** | Create and edit roles and their permissions, preview the app as a role. | `admin.roles` |
| **Access requests** | Answer people who asked for a page they cannot open. | `admin.users` |
| **Access review** | Who holds what, with powerful and dormant accounts first. | `admin.users` |
| **Settings** | Operating settings: GST rate, numbering, working days, controls and more. | `admin.settings` |
| **Terms** | Terms and conditions printed on quotations, invoices and reports. | `admin.settings` |
| **Holidays** | Days that due dates skip. | `admin.settings` |
| **Audit log** | Every recorded change, with who, when and why. | `admin.audit` |
| **System status** | Whether each part is working. See [System status](/help/admin/system-status/). | `admin.settings` |
| **Emails** | Every email sent and failed, and sending one again. See [Emails](/help/admin/emails/). | `admin.emails` |
| **Data export** | A copy of all records and files. See [Export all data](/help/admin/data-export/). | `admin.dataExport` |
| **Lab profile** | Names, addresses, GSTIN, bank account, accreditation, document prefix, privacy contact. | `admin.company.view` to see, `admin.company.edit` to change |
| **Branding** | App name, colours, logo, browser tab icon, sign-in picture. | `admin.company.view` to see, `admin.company.edit` to change |
| **Email templates** | The wording of emails to customers. | `admin.company.view` to see, `admin.company.edit` to change |
| **Modules** | Turn off parts of the product your lab does not use. | `admin.company.view` to see, `admin.company.edit` to change |
| **WhatsApp** | Connection status, message templates, test message, recent messages. | `admin.company.view` to see, `admin.company.edit` to change |
| **Help assistant** | What people ask the help site's **Ask AI**, unanswered questions, feedback and cost. See [Help assistant](/help/admin/help-assistant/). | `admin.settings` |
| **Privacy** | DPDP Act requests and the data breach log. | `privacy.manage` |

The built-in **Admin** role holds all of these. See [Permissions](/help/admin/permissions/).

:::note
If you have unsaved changes on a tab and switch to another tab, the app asks **Discard your changes?** first.
:::


## What to set up first

On a new installation the first administrator is taken to the [lab setup wizard](/help/admin/setup-wizard/) after signing in. It covers the first five items below. Every step can also be done later from **Admin**.

1. **Lab profile**: the laboratory's name, address, email and state, GSTIN and bank account. These print on every report and invoice. See [Lab profile](/help/admin/lab-profile/).
2. **Branding**: logo and colours. See [Branding](/help/admin/branding/).
3. **Test catalogue**: start from a lab-type template, or add tests in **Masters**. See [Masters](/help/admin/masters/).
4. **Team**: add each person with the smallest role that covers their work. See [Users and roles](/help/admin/users-roles/).
5. **Email**: send a test email to check that mail goes out. See [Email (SMTP)](/help/integrations/email-smtp/).
6. **Prices**: add standard rates in **Masters**. See [Masters](/help/admin/masters/#rates).
7. **Operating settings**: GST rate, working days, holidays and document numbers. See [Settings](/help/admin/settings/), [Terms and holidays](/help/admin/terms-holidays/) and [Document numbers](/help/admin/numbering/).
8. **Terms and conditions** for quotations, invoices and reports. See [Terms and holidays](/help/admin/terms-holidays/).
9. **Modules**: turn off what you do not use. See [Modules](/help/admin/modules/).

## Changes that ask for your password

Some changes ask you to **Confirm your password** before they go through: adding a user, changing someone's roles, switching an account off, resetting a password, creating a role or changing its permissions, approving an access request, saving the lab profile, erasing personal data, and bulk exports. After you confirm, you are not asked again for ten minutes. See [Security](/help/security/#re-confirming-your-password).

## Related

- [Lab setup wizard](/help/admin/setup-wizard/)
- [Security for administrators](/help/security/)
- [Integrations](/help/integrations/)
