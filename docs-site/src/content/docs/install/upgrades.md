---
title: Upgrades and rollback
description: Move a laboratory to new versions safely, go back if something is wrong, and check new images before you trust them.
sidebar:
  order: 6
---

Each laboratory runs exact image versions, pinned in its `versions.env`. You upgrade one laboratory at a time; the others stay where they are.

## Versions

`versions.env` in the company folder names the two images:

```bash
LIMS_VERSION="0.1.0"      # backend: API, worker and migrations
LIMS_UI_VERSION="0.1.0"   # web app
```

Change these through `upgrade.sh`, not by hand. `upgrade.sh` records each change in `versions.history`, together with the backup it took, so `rollback.sh` can go back.

`status.sh` shows the versions a company is running:

```bash
/opt/lims-deploy/scripts/status.sh --client-dir /srv/lims-clients/<slug>
```

## Upgrade a laboratory

**Goal:** move one laboratory to new image versions.

**Who can do it:** the server administrator.

**Before you start:**

- Read the [release notes](/help/changelog/) for the new version.
- Pick a quiet time. The app is unavailable for a short while as containers restart.
- Make sure the disk has room for one more full backup.

**Steps:**

1. Run `upgrade.sh` with the new versions. You can give one or both:

   ```bash
   /opt/lims-deploy/scripts/upgrade.sh --client-dir /srv/lims-clients/<slug> --lims 0.2.0 --ui 0.2.0
   ```

2. Watch the output. The script:
   1. Pulls the new images first. A wrong or missing version stops it here, with "Nothing was changed".
   2. Takes a backup and keeps it as a plain folder, so an automatic rollback works even when the backup decryption key is off the server.
   3. Records the old versions and that backup in `versions.history`.
   4. Writes the new versions to `versions.env`.
   5. Runs `deploy.sh`: migrations, then restarts the API, worker and UI, and waits for the API to be healthy.
3. Sign in and check a recent job and an issued report's PDF.

**Result:** the script ends with `Upgraded.`

If the new version will not start, `upgrade.sh` rolls back by itself and ends with "failed and was rolled back".

:::note
Labs' own settings, branding, email templates and catalogues are never overwritten by an upgrade. New built-in permissions are added to built-in roles once; an administrator's own role changes are kept.
:::

## Roll back

**Goal:** return a laboratory to the versions it ran before its last upgrade.

**Who can do it:** the server administrator.

**Before you start:** understand that migrations only go forward. Rolling back means **restoring the backup taken just before the upgrade**.

:::caution
Anything entered after the upgrade is lost: jobs, results, invoices, payments. Roll back soon after an upgrade, or fix forward instead.
:::

**Steps:**

1. Run:

   ```bash
   /opt/lims-deploy/scripts/rollback.sh --client-dir /srv/lims-clients/<slug> --yes
   ```

   Without `--yes`, the script only tells you which versions and backup it would use.

**Result:** `versions.env` returns to the previous versions, the pre-upgrade backup is restored (see [Restore](/help/install/backup-restore/#restore-a-backup)), the last line of `versions.history` is removed, and the script ends with `Rolled back to <versions>`.

## Run migrations

`deploy.sh` and `upgrade.sh` run migrations for you. To run only pending migrations:

```bash
/opt/lims-deploy/scripts/migrate.sh --client-dir /srv/lims-clients/<slug>
```

Migrations run as the table-owner database role, in a one-off `migrate` container. The running app never holds that role's password.

## Check a new image before you trust it

Before you roll out a new version, or a different storage image (`S3_IMAGE`), run the lifecycle check on any machine with Docker:

```bash
LIMS_VERSION=0.1.0 LIMS_UI_VERSION=0.1.0 NEXT_LIMS_VERSION=0.2.0 \
S3_IMAGE=<registry/image:exact-version> LIMS_S3_ACCESS_KEY=<key> LIMS_S3_SECRET_KEY=<secret> \
/opt/lims-deploy/scripts/lifecycle-check.sh
```

It provisions two fictional companies and does real work through the images: first-run setup, sign-in, and a PDF rendered by the worker and stored. Then it checks that the companies are isolated, that only the migration container holds the owner credentials, that the app role cannot touch the audit log's protection, and runs backup, restore, upgrade and rollback. It removes everything at the end (add `--keep` to keep the work folder). Without `S3_IMAGE` it uses a small test storage server that is for checks only.

`white-label-check.sh` confirms that one image serves two companies, each showing only its own details.

## The API contract check

The API is described by an OpenAPI document generated from the code. Every change to the backend is compared with the last released contract. The build fails on a **breaking change** to `/api/v1` unless that exact change is approved in the same change. A breaking change is any of:

- an endpoint, response code or parameter removed
- a parameter or request field that becomes required
- a request or response field removed or changed in type

So integrations that call the API keep working across upgrades unless the release notes say otherwise. See [API overview](/help/developers/#versioning-and-breaking-changes).

## Related

- [Backup and restore](/help/install/backup-restore/)
- [Operations](/help/install/operations/)
- [Release notes](/help/changelog/)
