---
title: Backup and restore
description: What the nightly backup contains, how to encrypt it and copy it off the server, how to restore it, and how to test a restore.
sidebar:
  order: 7
---

Every laboratory is backed up on its own, every night. A backup holds the database, every stored file and the company's server settings, so it can bring the laboratory back on the same server or a new one.

## What is backed up

Each run of `backup.sh` writes a timestamped folder under the company's `backups/` folder (or `LIMS_BACKUP_DIR`):

| Item | Contents |
| --- | --- |
| `database.dump` | The whole database, in PostgreSQL's custom format. Checked with `pg_restore --list` before the backup counts as good. |
| `files.tar.gz` | Everything in the storage volume: report PDFs, invoices, photos, attachments, logos. |
| `config.tar.gz` | `deployment.env`, `secrets.env`, `versions.env` and, where present, `company.env`, `versions.history`, `migrate.env` and `branding/`: what a new server needs. |
| `manifest.txt` | The company, the image versions, and SHA-256 checksums of the three files. |

The lab profile, branding, settings and email templates live in the database, so they are in `database.dump`.

The database and the files are captured one after the other, not as one snapshot. Stored files are only ever added, so at worst a file uploaded during the backup is present without its record.

## Schedule

`provision.sh` installs a nightly backup at **02:00 server time** in the crontab of the user who ran it. Output goes to `backup.log` in the company folder (rotated at 5 MB).

To check or reinstall it:

```bash
/opt/lims-deploy/scripts/install-backup-cron.sh --client-dir /srv/lims-clients/<slug> --check-only
/opt/lims-deploy/scripts/install-backup-cron.sh --client-dir /srv/lims-clients/<slug>
```

Reinstalling replaces that company's line; it never adds a second one. The user must be able to run Docker.

To back up now:

```bash
/opt/lims-deploy/scripts/backup.sh --client-dir /srv/lims-clients/<slug>
```

The last line it prints is the path of the backup.

### When a backup fails

If any step fails, `backup.sh` removes the partial backup, prints a line starting `BACKUP FAILED` with the step that failed, and exits with an error. Old backups past `BACKUP_RETENTION_DAYS` (default 30) are deleted only after a good backup, so a run of failures never deletes your last good one.

## Encrypt backups

A backup holds customer data, password hashes and `secrets.env`. Encrypt it. Set **one** of these in `deployment.env`:

| Setting | Effect |
| --- | --- |
| `BACKUP_AGE_RECIPIENT="age1..."` | Encrypt to one or more age public keys (space-separated). Recommended. |
| `BACKUP_GPG_RECIPIENT="ops@example.com"` | Encrypt to a gpg public key in the backup user's keyring. |
| `BACKUP_GPG_PASSPHRASE_FILE="/path"` | Symmetric gpg, with the passphrase in that file (mode 600). |

With encryption on, each backup becomes one file, `<timestamp>.tar.age` or `<timestamp>.tar.gpg`, and the plain folder is removed. The server needs only the public key. Keep the **private** key (age identity or gpg secret key) off the server, in your secrets store.

Create an age key pair on your own machine:

```bash
age-keygen -o lims-backup-key.txt
```

It prints the public key to put in `BACKUP_AGE_RECIPIENT`.

:::note
The backup `upgrade.sh` takes just before an upgrade stays as a plain folder, so an automatic rollback works without the private key. It is pruned with the rest.
:::

## Copy backups off the server

Set `BACKUP_OFFSITE_CMD` in `deployment.env`. It runs after each nightly backup with `$BACKUP_FILE` (the encrypted archive), `$BACKUP_NAME` and `$CLIENT_SLUG` set. Use **single quotes** so those are filled in when it runs:

```bash
BACKUP_OFFSITE_CMD='rclone copy "$BACKUP_FILE" offsite:lims-backups/$CLIENT_SLUG/'
BACKUP_OFFSITE_CMD='aws s3 cp "$BACKUP_FILE" "s3://example-lims-backups/$CLIENT_SLUG/"'
```

- An off-site copy of an unencrypted backup is refused unless `BACKUP_OFFSITE_ALLOW_PLAINTEXT="true"`.
- If the copy fails, the local backup is kept and the run still ends with an error.
- Set retention for off-site copies at the destination (for example a bucket lifecycle rule), and use credentials that can write but not delete.

## Get alerted

Set `BACKUP_PING_URL` to a dead-man's-switch service. It is fetched after every fully successful run (local backup and off-site copy). The service alerts you when the daily ping does not arrive. Failures are also in `backup.log`.

## Restore a backup

**Goal:** replace one laboratory's data with a backup.

**Who can do it:** the server administrator.

**Before you start:**

- The backup folder or encrypted archive, on the server.
- To decrypt: set `BACKUP_AGE_IDENTITY_FILE` (the age private key file), have the gpg secret key in the keyring, or set `BACKUP_GPG_PASSPHRASE_FILE`, in the environment or `deployment.env` of the machine doing the restore.
- If the backup was taken on **newer** images than the ones in `versions.env`, set `versions.env` to the versions in the backup's `manifest.txt` first. A database cannot be migrated backwards.

:::caution
A restore replaces **all** data for that laboratory with the backup. Anything entered since the backup was taken is lost.
:::

**Steps:**

1. Run:

   ```bash
   /opt/lims-deploy/scripts/restore.sh --client-dir /srv/lims-clients/<slug> --from <backup-folder-or-archive> --yes
   ```

   Add `--keep-previous` to keep the replaced database until you drop it yourself.

2. Sign in and check a recent job and an issued report's PDF.

**Result:** the script ends with `Restore complete from <backup>`.

What `restore.sh` does, in order, so a bad backup never costs the live data:

1. Refuses a backup that belongs to another company, and checks the checksums.
2. Restores the dump into a temporary database (`lims_restore`) while the app keeps running, and checks it: tables present, migrations recorded, the app's database role can read it. If anything fails, it stops. **The live database is never touched.**
3. Stops the app and swaps the databases by renaming. The live database becomes `lims_pre_restore_<time>`.
4. Unpacks the files next to the live ones in the storage volume, then swaps them in.
5. Runs migrations, because the backup may be older than the current images, starts the app and waits for it to be healthy.
6. Drops `lims_pre_restore_<time>`, unless `--keep-previous`. If step 5 fails, the old database is kept and the script prints the command that puts it back.

`restore.sh` does not change `deployment.env`, `secrets.env` or other settings in the company folder.

## Test a restore

**Goal:** prove your backups can actually bring a laboratory back.

**Who can do it:** the server administrator.

**Steps:**

1. Once a month, copy the latest **off-site** backup to a spare machine, or to a throwaway company folder.
2. Restore it there, using the steps in [Rebuild on a new server](#rebuild-on-a-new-server).
3. Sign in, open a recent job and an issued report's PDF.

**Result:** you know the backup, the decryption key and the procedure all work.

:::tip
A backup nobody has restored is not yet a backup.
:::

## Rebuild on a new server

1. Set up the new server. See [Install with Docker](/help/install/docker/#set-up-the-server-once-per-server).
2. Copy the latest backup from off-site and decrypt it on a trusted machine:

   ```bash
   age -d -i lims-backup-key.txt <timestamp>.tar.age | tar -x
   ```

   (or `gpg -d <timestamp>.tar.gpg | tar -x`)

3. Create the company folder and unpack the settings into it. This brings back `secrets.env`, so the same passwords are used:

   ```bash
   mkdir -p /srv/lims-clients/<slug>
   tar -xzf <timestamp>/config.tar.gz -C /srv/lims-clients/<slug>
   ```

4. Provision, then restore:

   ```bash
   /opt/lims-deploy/scripts/provision.sh --client-dir /srv/lims-clients/<slug>
   /opt/lims-deploy/scripts/restore.sh --client-dir /srv/lims-clients/<slug> --from <timestamp> --yes
   ```

5. Point DNS at the new server.

## Related

- [Upgrades and rollback](/help/install/upgrades/)
- [Environment variables](/help/install/environment/#deploymentenv)
- [Operations](/help/install/operations/)
