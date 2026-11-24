---
title: Permissions
description: Every permission in the system, and which permissions each built-in role has on a new installation.
sidebar:
  order: 4
---

A permission allows one kind of work. A role is a named set of permissions, and a person can hold several roles. You give roles in **Admin** → **Users** and edit them in **Admin** → **Roles**. See [Users and roles](/help/admin/users-roles/).

The server checks permissions on every request. Hiding a menu is only for convenience: a person without the permission is refused even if they type the address.

## All permissions

The **Area** column is the group heading you see when you edit a role.

| Code | Area | What it allows |
| --- | --- | --- |
| `admin.users` | Admin | Manage users |
| `admin.roles` | Admin | Manage roles and permissions |
| `admin.settings` | Admin | Change lab operating settings |
| `admin.audit` | Admin | View the audit log |
| `admin.emails` | Admin | View sent and failed emails, and send them again |
| `admin.dataExport` | Admin | Export all of the lab’s data and files |
| `admin.company.view` | Admin | View company details |
| `quality.view` | Quality | View equipment status, authorisations, training and non-conformances |
| `quality.manage` | Quality | Record calibration and maintenance, authorise staff, and work non-conformances |
| `privacy.manage` | Admin | Handle privacy requests and the data breach log (DPDP Act) |
| `admin.company.edit` | Admin | Edit the lab profile, branding, templates and modules |
| `masters.view` | Masters | View master data |
| `masters.edit` | Masters | Create and edit master data |
| `rates.view` | Masters | View standard and customer rates |
| `rates.edit` | Masters | Create and edit rates |
| `customers.view` | Customers | View customer identity and contacts |
| `customers.edit` | Customers | Create and edit customers |
| `orders.view` | Orders | View orders |
| `orders.edit` | Orders | Create and edit orders |
| `quotations.view` | Quotations | View quotations |
| `quotations.edit` | Quotations | Create and revise quotations |
| `quotations.send` | Quotations | Send quotations to customers |
| `quotations.decide` | Quotations | Mark quotations accepted or rejected |
| `quotations.rateOverride` | Quotations | Override a looked-up rate |
| `quotations.convert` | Quotations | Convert an accepted quotation to a job |
| `jobs.view` | Samples | View jobs and samples |
| `jobs.create` | Samples | Book jobs and samples |
| `jobs.createWithoutQuotation` | Samples | Book a job without a quotation |
| `jobs.edit` | Samples | Edit jobs and samples, record deviations |
| `jobs.hold` | Samples | Hold and release jobs |
| `jobs.cancel` | Samples | Cancel jobs, samples and tests |
| `planning.view` | Planning | View planning and workload |
| `planning.edit` | Planning | Plan tests and assign technicians |
| `tests.viewAll` | Testing | View all tests, not only assigned ones |
| `tests.work` | Testing | Work on assigned tests and enter results |
| `tests.approve` | Testing | Approve or reject test results |
| `tests.hold` | Testing | Hold and release tests |
| `reports.view` | Reports | View test reports |
| `reports.review` | Reports | Review draft reports |
| `reports.approve` | Reports | Final approval and electronic signature |
| `reports.issue` | Reports | Issue and email reports |
| `reports.revise` | Reports | Start a report revision |
| `dispatch.view` | Dispatch | View dispatches |
| `dispatch.edit` | Dispatch | Record dispatches and sample returns |
| `invoices.view` | Invoices | View invoices and amounts |
| `invoices.edit` | Invoices | Create, issue and cancel invoices |
| `payments.edit` | Invoices | Record payments and credit notes |
| `reminders.send` | Invoices | Send payment reminders |
| `analytics.operations` | Analytics | View operations dashboards |
| `analytics.quality` | Analytics | View quality dashboards |
| `analytics.people` | Analytics | View people and equipment dashboards |
| `analytics.commercial` | Analytics | View commercial dashboards |
| `mis.view` | Reports module | View operational reports |
| `mis.commercial` | Reports module | View commercial reports |
| `files.view` | Files | Browse the file library and download files |
| `files.manage` | Files | Upload, rename, move and remove library files and folders |

:::note
`customers.view` controls customer identity everywhere: names, contacts, and documents and attachments on jobs and samples. Planners and Heads of Department work from codes. The setting **Hide customer identity from technicians** adds a second layer for test screens. See [Security](/help/security/#technicians-never-see-customer-identity-or-prices).
:::

## Built-in roles

A new installation creates these roles once. After that the roles belong to you: an upgrade can add a new built-in role or give a new permission to a built-in role, but it never takes away or changes what you set.

| Short name | Role | Description |
| --- | --- | --- |
| Adm | Admin | Users, roles, masters, settings, audit log, all records |
| QM | Quality Manager | Equipment, staff competency, non-conformance and CAPA |
| DC | Document Controller | File library: folders, uploads, controlled documents |
| Sales | Sales / Business Development | Customers, orders, quotations |
| Rec | Sample Reception | Job booking, SRF, acknowledgements, labels, deviations |
| Plan | Lab Manager / Planner | Test planning, assignment, job cards, workload |
| Tech | Technician / Analyst | Assigned tests only: stages, results, attachments |
| HoD | Head of Department | Approves test results |
| Rev | Report Reviewer | Reviews draft reports |
| Sig | Authorised Signatory | Final approval or rejection, electronic signature |
| Disp | Dispatch | Dispatch records and challans |
| Acc | Accounts | Rates, invoices, payments, due invoices |
| Mgmt | Management | Read-only dashboards and reports |

## Which role has which permission

This is the matrix on a new installation, including the permissions that later versions added to built-in roles (file library, quality, privacy, emails and data export). Your installation may differ if an administrator has changed the roles.

| Permission | Adm | QM | DC | Sales | Rec | Plan | Tech | HoD | Rev | Sig | Disp | Acc | Mgmt |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `admin.users` | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `admin.roles` | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `admin.settings` | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `admin.audit` | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `admin.emails` | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `admin.dataExport` | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `admin.company.view` | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `quality.view` | ✓ | ✓ |  |  |  | ✓ |  | ✓ |  |  |  |  | ✓ |
| `quality.manage` | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |  |
| `privacy.manage` | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `admin.company.edit` | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `masters.view` | ✓ | ✓ |  | ✓ | ✓ | ✓ |  | ✓ |  |  | ✓ | ✓ | ✓ |
| `masters.edit` | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `rates.view` | ✓ |  |  | ✓ |  |  |  |  |  |  |  | ✓ | ✓ |
| `rates.edit` | ✓ |  |  |  |  |  |  |  |  |  |  | ✓ |  |
| `customers.view` | ✓ |  | ✓ | ✓ | ✓ |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ |
| `customers.edit` | ✓ |  |  | ✓ |  |  |  |  |  |  |  |  |  |
| `orders.view` | ✓ |  |  | ✓ |  |  |  |  |  |  |  |  | ✓ |
| `orders.edit` | ✓ |  |  | ✓ |  |  |  |  |  |  |  |  |  |
| `quotations.view` | ✓ |  |  | ✓ |  |  |  |  |  |  |  |  | ✓ |
| `quotations.edit` | ✓ |  |  | ✓ |  |  |  |  |  |  |  |  |  |
| `quotations.send` | ✓ |  |  | ✓ |  |  |  |  |  |  |  |  |  |
| `quotations.decide` | ✓ |  |  | ✓ |  |  |  |  |  |  |  |  |  |
| `quotations.rateOverride` | ✓ |  |  | ✓ |  |  |  |  |  |  |  |  |  |
| `quotations.convert` | ✓ |  |  | ✓ | ✓ |  |  |  |  |  |  |  |  |
| `jobs.view` | ✓ | ✓ |  | ✓ | ✓ | ✓ |  |  | ✓ | ✓ | ✓ | ✓ | ✓ |
| `jobs.create` | ✓ |  |  |  | ✓ |  |  |  |  |  |  |  |  |
| `jobs.createWithoutQuotation` | ✓ |  |  |  | ✓ |  |  |  |  |  |  |  |  |
| `jobs.edit` | ✓ |  |  |  | ✓ |  |  |  |  |  |  |  |  |
| `jobs.hold` | ✓ |  |  |  | ✓ | ✓ |  |  |  |  |  |  |  |
| `jobs.cancel` | ✓ |  |  |  |  | ✓ |  |  |  |  |  |  |  |
| `planning.view` | ✓ |  |  |  |  | ✓ |  |  |  |  |  |  | ✓ |
| `planning.edit` | ✓ |  |  |  |  | ✓ |  |  |  |  |  |  |  |
| `tests.viewAll` | ✓ | ✓ |  |  |  | ✓ |  | ✓ | ✓ | ✓ |  |  | ✓ |
| `tests.work` |  |  |  |  |  |  | ✓ |  |  |  |  |  |  |
| `tests.approve` | ✓ |  |  |  |  |  |  | ✓ |  |  |  |  |  |
| `tests.hold` | ✓ |  |  |  |  | ✓ |  | ✓ |  |  |  |  |  |
| `reports.view` | ✓ |  |  |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ |
| `reports.review` | ✓ |  |  |  |  |  |  |  | ✓ |  |  |  |  |
| `reports.approve` | ✓ |  |  |  |  |  |  |  |  | ✓ |  |  |  |
| `reports.issue` | ✓ |  |  |  |  |  |  |  |  | ✓ |  |  |  |
| `reports.revise` | ✓ |  |  |  |  |  |  |  |  | ✓ |  |  |  |
| `dispatch.view` | ✓ |  |  |  |  |  |  |  |  |  | ✓ |  | ✓ |
| `dispatch.edit` | ✓ |  |  |  |  |  |  |  |  |  | ✓ |  |  |
| `invoices.view` | ✓ |  |  |  |  |  |  |  |  |  |  | ✓ | ✓ |
| `invoices.edit` | ✓ |  |  |  |  |  |  |  |  |  |  | ✓ |  |
| `payments.edit` | ✓ |  |  |  |  |  |  |  |  |  |  | ✓ |  |
| `reminders.send` | ✓ |  |  |  |  |  |  |  |  |  |  | ✓ |  |
| `analytics.operations` | ✓ |  |  |  |  | ✓ |  |  |  |  |  |  | ✓ |
| `analytics.quality` | ✓ |  |  |  |  |  |  | ✓ | ✓ | ✓ |  |  | ✓ |
| `analytics.people` | ✓ |  |  |  |  | ✓ |  | ✓ |  |  |  |  | ✓ |
| `analytics.commercial` | ✓ |  |  |  |  |  |  |  |  |  |  | ✓ | ✓ |
| `mis.view` | ✓ |  |  |  | ✓ | ✓ |  | ✓ |  |  |  |  | ✓ |
| `mis.commercial` | ✓ |  |  |  |  |  |  |  |  |  |  | ✓ | ✓ |
| `files.view` | ✓ | ✓ | ✓ |  |  | ✓ |  |  |  |  |  |  | ✓ |
| `files.manage` | ✓ |  | ✓ |  |  |  |  |  |  |  |  |  |  |

:::note
Admin has every permission except `tests.work`, so an administrator cannot enter test results by default. This keeps administration and bench work apart.
:::

## Related

- [Users and roles](/help/admin/users-roles/)
- [Security for administrators](/help/security/)
- [Modules](/help/admin/modules/): a module that is off is refused even to people who hold its permissions.
