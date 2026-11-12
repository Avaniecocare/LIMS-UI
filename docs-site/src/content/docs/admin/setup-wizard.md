---
title: Lab setup wizard
description: Set up a new laboratory step by step - profile, branding, test catalogue, team, email - and finish setup.
sidebar:
  order: 2
---

The lab setup wizard, **Set up your laboratory**, walks a new installation through the details every report and invoice needs. It has six steps: **Lab profile**, **Branding**, **Lab type**, **Team**, **Email** and **Review**. You can change everything later in **Admin**, and nothing needs a restart.

<!-- screenshot: setup-wizard-steps -->

:::note
This wizard is not the first-run screen. The first-run screen appears only while the installation has no user at all; it creates the first administrator account. The person who installs the server sees it. See [Installation](/help/install/).
:::

## When the wizard appears

- **Who sees it**: people with `admin.company.edit` (the **Admin** role).
- Until setup is finished, these people are taken to the wizard once per visit when they open the dashboard, the first sign-in included.
- On every other page they see a banner: **Finish setting up your laboratory: 3 of 5 steps done.** with a **Continue setup** button.
- The banner goes away when someone clicks **Finish setup** on the last step.

You can jump to any step by clicking its name at the top. A step with a tick is done.

## Set up your laboratory

**Goal**: get the laboratory ready to book samples and issue reports.

**Who can do it**: Admin (`admin.company.edit`).

**Before you start**: have the laboratory's legal details (GSTIN, PAN, bank account, accreditation certificate if any) and a logo file to hand.

**Steps**:

1. On **Lab profile**, fill in the laboratory's details. Entering the **GSTIN** fills the state, GST state code and PAN. Click **Save and continue**. You are asked to confirm your password. See [Lab profile](/help/admin/lab-profile/) for each field.
2. On **Branding**, choose a ready-made palette or your own colours, and upload the logo. Click **Save and continue**, or **Skip for now**. See [Branding](/help/admin/branding/).
3. On **Lab type** (**What does your laboratory test?**), tick one or more lab types and click **Add 2 to my catalogue** (the number is how many you ticked). Or click **Skip for now** and add tests in **Masters** or by Excel import later. See [Lab-type templates](#lab-type-templates) below.
4. On **Team** (**Bring in your team**), click **Open Users in a new tab** to add people now, or **Continue** to do it later. Each person gets a temporary password to change at first sign-in.
5. On **Email** (**Check that emails go out**), enter an address in **Send a test email to** and click **Send test email**. Check the inbox and the spam folder. Then click **Continue**.
6. On **Review**, look at the list. Anything not done has a **Do it now** button. Click **Finish setup**.

**Result**: the message **Your laboratory is set up.** appears and you go to the dashboard. The banner no longer shows.

## How a step counts as done

The ticks and the banner's count come from the server:

| Step | Done when |
| --- | --- |
| **Lab profile** | The laboratory address, email and state are all filled in. |
| **Branding** | Branding has been saved at least once after installation. <!-- TODO(verify): the server checks brandingVersion > 1; confirm a fresh install starts at version 1 so one save counts. --> |
| **Lab type** (test catalogue) | At least one test exists (demo data does not count). |
| **Team** | More than one active user exists. |
| **Email** | A test email was sent successfully from the wizard. |

**Review** has no tick. Clicking **Finish setup** ends the wizard even if some steps are not done.

## Lab-type templates

A template is a starting test catalogue built from public Indian standards: departments, units, methods, tests with their parameters, regulatory limits (specifications), packages (test groups) and remark templates.

| Template | What it covers |
| --- | --- |
| Water and wastewater | Drinking water to IS 10500, effluent to the Environment (Protection) Rules, with microbiology. |
| Ambient air and stack emission | NAAQS 2009 ambient air monitoring and stack emission testing. |
| Soil, sludge and solid waste | Soil fertility and characterisation, metals and TCLP. |
| Noise monitoring | Ambient and workplace noise with the limits of the Noise Rules 2000. |
| Materials and metals | Mechanical testing, chemical analysis by OES, metallography and coatings. |

Each card shows how many tests and packages it adds, which limits it includes, and a few example tests.

:::caution
Templates set no prices and mark nothing as accredited. You must add rates in **Masters** and tick **In accreditation scope** on the tests, methods and parameters in your scope.
:::

Templates only add. Anything whose code already exists is left exactly as it is, so applying a template twice, or after you have edited your catalogue, changes nothing you already have. An existing test keeps its own parameters.

Templates are offered only in the wizard. To add tests later, use **Masters** or Excel import. See [Masters](/help/admin/masters/).

## If the test email fails

The wizard shows what the mail server said, for example that it refused the login or could not be reached. The mail server settings are in the server's environment file (`SMTP_HOST` and the rest), so ask whoever installed the system. See [Email (SMTP)](/help/integrations/email-smtp/#troubleshooting).

## Related

- [Administration](/help/admin/)
- [Lab profile](/help/admin/lab-profile/)
- [Branding](/help/admin/branding/)
- [Users and roles](/help/admin/users-roles/)
- [Masters](/help/admin/masters/)
