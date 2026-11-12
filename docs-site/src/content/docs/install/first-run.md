---
title: First run
description: What happens the first time a new installation starts - migrations, creating the first administrator, demo data, and handing over to the lab's setup wizard.
sidebar:
  order: 5
---

After [provisioning](/help/install/docker/#add-a-laboratory), the installation is running but has no users. This page takes you from there to a lab that is ready for its administrator.

## Database migrations

Migrations create and update the database tables. You do not run them by hand on a new install: `provision.sh`, `deploy.sh`, `upgrade.sh` and `restore.sh` all run them through the one-off `migrate` container before the API and worker start. The API and worker do not start until migrations finish successfully.

To run pending migrations on their own:

```bash
/opt/lims-deploy/scripts/migrate.sh --client-dir /srv/lims-clients/<slug>
```

Migrations only go forward. There is no "down" migration; to go back to an older version, you restore a backup. See [Upgrades](/help/install/upgrades/).

## Create the first administrator

**Goal:** create the first user, who becomes the lab's administrator, and set the lab's basic operating settings.

**Who can do it:** whoever installs the system. The first-run screen is public only while no user exists.

**Before you start:** the `SETUP_TOKEN` value from the company's `secrets.env`.

**Steps:**

1. Open `https://<app domain>` in a browser. With no users yet, the app opens the first-run screen, **Set up your laboratory**.
2. In **Setup token**, paste the `SETUP_TOKEN` value. (This field shows only when a token is configured; `provision.sh` always configures one.)
3. Under **First Admin user**, fill in **Name**, **Email** and **Password**. The password needs at least 10 characters, with upper and lower case, a digit and a symbol.
4. Under **Operating settings**, check **GST rate (%)** (default 18), **Default credit days** (30), **Sample retention (days)** (90), **Report retention (years)** (5) and the **Working days** (Monday to Saturday by default).
5. Optionally, enter **Quotation terms**, **Invoice terms** and **Report terms** under **Terms and conditions**.
6. Select **Finish setup**.

<!-- screenshot: first-run-setup -->

**Result:** the app takes you to the sign-in page. Give the administrator their email and password.

:::note
Once any user exists, the first-run screen refuses for good with "Setup has already been completed". Two people submitting it at the same moment cannot both succeed.
:::

All operating settings can be changed later in **Admin**. See [Settings](/help/admin/settings/).

## The lab's setup wizard

When the administrator signs in for the first time, the app opens **Set up your laboratory**, a short wizard:

1. **Lab profile**: names, addresses, GSTIN (fills state and PAN), bank account, accreditation and NABL mode, document number prefix, support and legal links.
2. **Branding**: app name, colours, sign-in line, "Powered by", logo, browser icon and sign-in picture.
3. **Lab type**: optional starting test catalogues built from public standards (water and wastewater, ambient air and stack, soil, noise, materials and metals). They add tests, parameters, methods and limits, with no prices and nothing marked accredited.
4. **Team**: add users and give them roles.
5. **Email**: send a test email to confirm the mail settings work.
6. **Review**: see what is done and what is left.

Anything skipped can be done later; until setup is finished, administrators see a reminder. The lab's details are stored in the database and need no restart or redeploy. See [Setup wizard](/help/admin/setup-wizard/).

:::tip
Send the lab's administrator the list of what the wizard asks for in advance: legal and trading names, addresses, GSTIN and PAN, bank details for invoices, NABL certificate number and ULR format if accredited, logo and colours.
:::

## Hand over

As the administrator, before the lab goes live:

1. Add prices (**Masters**, standard rates) and mark accredited tests and methods from the lab's NABL scope.
2. Add the lab's own tests, instruments and specifications, or import them from Excel.
3. Book one job all the way to an issued report and an invoice, and check the PDFs and emails with the lab.

## Demo data

For trials, provision with demo data:

```bash
/opt/lims-deploy/scripts/provision.sh --client-dir /srv/lims-clients/<slug> --with-demo-data
```

Demo data adds fictional users for each role, customers and masters. A demo install skips the first-run screen and the setup wizard.

### Remove demo data before going live

**Goal:** delete all demo records in one step.

**Who can do it:** the server administrator.

**Steps:**

1. Run:

   ```bash
   /opt/lims-deploy/scripts/remove-demo.sh --client-dir /srv/lims-clients/<slug> --yes
   ```

**Result:** demo users, customers, masters and everything recorded against them are removed. The script prints `Demo data removed from <slug>`.

:::caution
This cannot be undone. Take a backup first if you are unsure. The audit log keeps its history of the demo records, because it is append-only.
:::

<!-- TODO(verify): after remove-demo.sh no user is left; confirm that the first-run screen then appears again so a real administrator can be created. -->

In a development checkout, `npm run db:seed` loads the demo data and `npm run db:seed:remove` removes it.

## Installs from before the admin panel

Older installs kept the lab's details in `company.env` and a `branding/` folder. On the first start of a version with the admin panel, those are checked and imported into the app once (logo and favicon included), and the setup wizard is skipped. From then on the app is the place to change them.

## Related

- [Install with Docker](/help/install/docker/)
- [Setup wizard](/help/admin/setup-wizard/)
- [Install troubleshooting](/help/install/troubleshooting/)
