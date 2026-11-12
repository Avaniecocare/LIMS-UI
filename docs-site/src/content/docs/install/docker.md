---
title: Install with Docker
description: Set up a server and add a laboratory to it with the deployment scripts, step by step, plus a short note on running the system locally without Docker.
sidebar:
  order: 3
---

Production installs use the deployment repository (LIMS-Deploy). It holds the Compose files, the reverse proxy and the scripts for provisioning, deploying, backing up, restoring, upgrading and rolling back. It holds no application code and no customer data.

Allow about 30 minutes per laboratory once the server is ready. Check the [server requirements](/help/install/requirements/) first.

## Set up the server (once per server)

**Goal:** prepare a server so it can hold one or more laboratories.

**Who can do it:** the server administrator, with `sudo` and Docker access.

**Before you start:** Docker Engine with the Compose plugin, `cron`, ports 80 and 443 open. The user who runs the scripts must be in the `docker` group.

**Steps:**

1. Sign in to the container registry once, with a token that can read packages:

   ```bash
   docker login ghcr.io
   ```

2. Get the deployment repository:

   ```bash
   git clone <deployment-repository-url> /opt/lims-deploy
   ```

3. Create the shared proxy network and the folders for proxy sites and company folders:

   ```bash
   docker network create lims-proxy
   sudo mkdir -p /srv/lims-proxy/sites /srv/lims-clients
   sudo chown -R "$USER" /srv/lims-proxy /srv/lims-clients
   touch /srv/lims-proxy/sites/_global.caddy
   ```

4. Start the reverse proxy:

   ```bash
   cd /opt/lims-deploy/proxy
   PROXY_SITES_DIR=/srv/lims-proxy/sites docker compose up -d
   ```

**Result:** `docker ps` shows the `lims-proxy-caddy-1` container running.

:::tip
`_global.caddy` is where you put Caddy's global options, such as the email address for the certificate authority account.
:::

## Add a laboratory

**Goal:** create a complete, separate installation for one laboratory.

**Who can do it:** the server administrator.

**Before you start:**

- The product name to show before the lab sets its own (`BRAND_NAME`).
- Three domain names (`app.`, `api.` and `files.`) pointing at the server.
- SMTP details: host, port, user, password and sender address.
- The S3-compatible storage image your organisation has chosen (`S3_IMAGE`).

:::caution
`S3_IMAGE` has no default. Official MinIO images are no longer published, so each deployment must name an S3-compatible image, pinned to an exact version, that stores its data under `/data` and listens on port 9000. Test your choice with the lifecycle check before you trust it. See [Upgrades](/help/install/upgrades/#check-a-new-image-before-you-trust-it).
:::

**Steps:**

1. Make the company's folder **outside** the deployment repository. The scripts refuse a folder inside it.

   ```bash
   SLUG=acme
   mkdir -p /srv/lims-clients/$SLUG
   cd /opt/lims-deploy/clients/_template
   cp deployment.env.example /srv/lims-clients/$SLUG/deployment.env
   cp versions.env.example   /srv/lims-clients/$SLUG/versions.env
   ```

2. Edit `deployment.env`. Double-quote every value. Set at least:

   ```bash
   BRAND_NAME="LIMS"
   CLIENT_SLUG="acme"                     # lowercase letters, digits and hyphens
   APP_DOMAIN="app.lims.example.com"
   API_DOMAIN="api.lims.example.com"
   FILES_DOMAIN="files.lims.example.com"
   S3_IMAGE="<registry/image:exact-version>"
   SMTP_HOST="smtp.example.com"
   SMTP_PORT="587"
   SMTP_SECURE="false"
   SMTP_USER="<smtp-user>"
   SMTP_PASSWORD="<smtp-password>"
   SMTP_FROM="lab@example.com"
   ```

   All settings are listed in [Environment variables](/help/install/environment/#deploymentenv).

3. Edit `versions.env` to the exact image versions to run:

   ```bash
   LIMS_VERSION="0.1.0"
   LIMS_UI_VERSION="0.1.0"
   ```

4. Put a logo and a favicon in a `branding/` folder inside the company folder. `provision.sh` stops if that folder is empty.
   <!-- TODO(verify): for a new install the logo is set in the app's Branding page; confirm whether files in branding/ are used at all when there is no company.env. -->

5. Point DNS for the three names at the server, if you have not already. On a cloud server the proxy needs them to resolve before it can get certificates.

6. Run provisioning:

   ```bash
   /opt/lims-deploy/scripts/provision.sh --client-dir /srv/lims-clients/$SLUG
   ```

   This generates the passwords and keys into `secrets.env`, writes the proxy site for the three domains and reloads the proxy, pulls the images, starts PostgreSQL, Redis and storage, runs the database migrations, starts the API, worker and UI, waits until the API is healthy, and installs the nightly backup.

7. Copy `secrets.env` to your secrets store.

8. Set backup encryption and an off-site copy in `deployment.env` (`BACKUP_AGE_RECIPIENT`, `BACKUP_OFFSITE_CMD`, `BACKUP_PING_URL`), then run one backup and check that it does not end with `BACKUP FAILED`:

   ```bash
   /opt/lims-deploy/scripts/backup.sh --client-dir /srv/lims-clients/$SLUG
   ```

   See [Backup and restore](/help/install/backup-restore/).

**Result:** the script ends with `Provisioned. Open https://<app domain>` and reminds you that the first-run setup token is in `secrets.env` as `SETUP_TOKEN`. Continue with [First run](/help/install/first-run/).

:::caution
Keep a copy of `secrets.env`. If the company folder is lost, the app cannot reach its own database and storage until those passwords are reset by hand.
:::

### Provisioning options

| Option | Effect |
| --- | --- |
| `--with-demo-data` | Loads fictional demo users, customers and masters. For trials only. A demo install skips the setup wizard. |
| `--offline` | Uses images already on the server instead of pulling them. |

Provisioning is safe to re-run: existing secrets are kept.

## The company folder

| File | Written by | Contains |
| --- | --- | --- |
| `deployment.env` | You | Domains, mail settings, storage image, memory caps, backup settings |
| `versions.env` | You, then `upgrade.sh` | Exact image versions |
| `branding/` | You | Logo and favicon |
| `company.env` | You, older installs only | The lab's details, for installs set up before the admin panel. Imported once, then ignored |
| `secrets.env` | `provision.sh` | Generated passwords and keys. Keep a copy in your secrets store |
| `generated.env` | The scripts, on every deploy | Settings for the API and worker, derived from the files above |
| `migrate.env` | The scripts, on every deploy | The table-owner database address. Loaded only by the one-off `migrate` container |
| `versions.history` | `upgrade.sh` | Earlier versions and their pre-upgrade backups |
| `backup.log` | The nightly backup | Output of the cron job, rotated at 5 MB |
| `backups/` | `backup.sh` | Local backups, unless `LIMS_BACKUP_DIR` points elsewhere |

Restrict access to this folder: it holds secrets. Secret files are created with mode 600. The scripts read `deployment.env` and `secrets.env` as shell, so only trusted operators should be able to edit them.

## Change server settings

1. Edit `deployment.env` in the company folder.
2. Run:

   ```bash
   /opt/lims-deploy/scripts/deploy.sh --client-dir /srv/lims-clients/$SLUG
   ```

`deploy.sh` rewrites `generated.env`, runs any pending migrations, recreates the API, worker and UI, and waits until the API is healthy. If a value is invalid, the API refuses to start and its log names the variable. The script then prints the last 40 lines of the API log.

The lab's own details (name, GSTIN, bank, logo, colours) are changed in the app, not here. See [Settings](/help/admin/settings/).

## Everyday scripts

All scripts take `--client-dir PATH`.

| Script | Purpose |
| --- | --- |
| `provision.sh` | Add a company and install its nightly backup |
| `deploy.sh` | Apply changed server settings or versions |
| `migrate.sh` | Run pending database migrations |
| `upgrade.sh --lims X --ui Y` | Back up, change versions, migrate, restart. Rolls back by itself if it fails |
| `rollback.sh --yes` | Go back to the versions before the last upgrade, restoring that backup |
| `backup.sh` | Back up the database, files and company settings now |
| `install-backup-cron.sh` | Reinstall the nightly backup. `--check-only` reports whether it is installed |
| `restore.sh --from BACKUP --yes` | Replace all data with a backup |
| `remove-demo.sh --yes` | Remove demo data |
| `status.sh` | Show versions and container state |
| `proxy-sync.sh` | Rewrite the company's proxy site and reload the proxy |

## Run locally without Docker (developers)

For development on your own machine. You need Node 24 or later, PostgreSQL and Redis.

```bash
cp .env.example .env
npm ci
npx playwright install chromium
npx prisma migrate deploy
node scripts/dev-s3.mjs &           # local S3-compatible store
npm run build
node --env-file=.env dist/main.js api
node --env-file=.env dist/main.js worker
```

Then, in the UI repository:

```bash
npm ci
npm run dev      # http://localhost:5173
```

In development the UI reads the API address from `public/config.js`.

The backend repository also has a `docker compose up` quick start that runs PostgreSQL, Redis, a local S3 store, a mail viewer on port 8025, the API on port 3000 and the worker, and loads fictional demo data. Demo users are `<role>@demo.example`, for example `admin@demo.example`.

:::caution
The local quick start uses the public example session secret and demo passwords. Never expose it to a network.
:::

## Related

- [First run](/help/install/first-run/)
- [Environment variables](/help/install/environment/)
- [Install troubleshooting](/help/install/troubleshooting/)
