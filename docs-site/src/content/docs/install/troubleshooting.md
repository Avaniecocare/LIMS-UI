---
title: Install troubleshooting
description: Problems when installing, starting, backing up or upgrading the server, with the message you see and how to fix it.
sidebar:
  order: 9
---

Find the message you see, then follow the fix. For problems inside the app, see [Troubleshooting](/help/troubleshooting/).

:::tip
Start with `status.sh` to see which container is unhealthy, then read that container's log: `docker logs --tail 100 lims-<slug>-api-1`.
:::

## Provisioning and deploying

| Message | Why | Fix |
| --- | --- | --- |
| `--client-dir PATH is required` | The script needs the company folder. | Add `--client-dir /srv/lims-clients/<slug>`. |
| `Company files must stay outside this public repository` | The company folder is inside the deployment repository. | Move it, for example to `/srv/lims-clients/<slug>`, and pass that path. |
| `Missing .../deployment.env` or `Missing .../versions.env` | The folder lacks a required file. | Copy it from `clients/_template/` and fill it in. |
| `CLIENT_SLUG must be lowercase letters, digits and hyphens` | The slug has capitals, spaces or other characters. | Fix `CLIENT_SLUG` in `deployment.env`. |
| `Set S3_IMAGE in .../deployment.env` | No storage image is named. There is no default. | Set `S3_IMAGE` to your chosen S3-compatible image, pinned to a version. |
| `Put the logo and favicon in .../branding` | The `branding/` folder is empty. | Add `logo.png` and `favicon.png`. |
| `Could not pull the images` | Wrong version in `versions.env`, or not signed in to the registry. | Check the versions; run `docker login ghcr.io`; or pass `--offline` to use images already on the server. |
| `Not provisioned yet. Run scripts/provision.sh first.` | `secrets.env` does not exist yet. | Run `provision.sh` first. |
| `The API did not become healthy` | The API would not start. The script prints the last 40 lines of its log. | Read the log. It names the setting that is wrong; see below. |
| `Could not install the nightly backup` | `cron` is missing or the user cannot run Docker. | Install cron, add the user to the `docker` group, and re-run `provision.sh` (safe to re-run). |

## The API or worker will not start

The API and worker check their settings at start-up and stop with exit code 78 when one is wrong. The log line names the variable.

| Log message | Fix |
| --- | --- |
| `Missing required environment variables: ...` | Set each named variable. Without the deployment scripts, check your `.env`. See [Environment variables](/help/install/environment/). |
| `SESSION_SECRET must be at least 32 characters` | Generate a longer random secret, for example with `openssl rand -base64 48`. |
| `SESSION_SECRET is the public example value` | You copied the example file into production. Generate a new random secret. |
| `Unknown process "..."` | The container command must end in `api` or `worker`. |

The storage container must be healthy before the API and worker start. If it never becomes healthy, your `S3_IMAGE` may have none of curl, wget, node or nc for the built-in check. Set `S3_HEALTHCHECK_CMD` in `deployment.env`.

## The UI container will not start

| Log message | Fix |
| --- | --- |
| `API_URL is required` | Set `API_URL`. The deployment sets it from `API_DOMAIN`. |
| `API_URL contains invalid characters` | Remove quotes, backslashes and `<` from `API_URL`. |
| `APP_NAME contains invalid characters` | Remove double quotes, backslashes and `<` from `BRAND_NAME` (or `APP_NAME`). |

## Certificates and domains

- **The browser shows a certificate error on a cloud server.** The proxy could not get a certificate. Check that DNS for all three names points at the server and that ports 80 and 443 are open. Read the proxy's log: `docker logs lims-proxy-caddy-1`.
- **On-premise, the camera or "Use phone" does not work.** Browsers allow these only over HTTPS with a trusted certificate. Use the lab's certificates or an internal certificate authority that every computer and phone trusts.
- **The site does not change after editing domains.** Run `deploy.sh`, then `proxy-sync.sh` to rewrite the proxy site.
<!-- TODO(verify): whether deploy.sh also rewrites the proxy site; only provision.sh calls proxy-sync.sh. -->

## Signing in fails on a new install

- **The first-run screen says "Incorrect setup token".** Copy `SETUP_TOKEN` from `secrets.env` again, without the quotes.
- **"Setup has already been completed".** A user already exists. Sign in instead, or use **Forgot password**.
- **Sign-in succeeds, then the app asks you to sign in again.** The browser is not keeping the session cookie. Check that:
  - the app and API domains share the same parent domain (for example `app.lims.example.com` and `api.lims.example.com`);
  - the site is served over HTTPS, because the cookie is secure in production;
  - `FRONTEND_ORIGIN` is exactly the address in the browser, including `https://` and with no trailing path.
- **Every request fails in the browser console with a CORS error.** `FRONTEND_ORIGIN` does not match the address people use. Fix it and redeploy.

## PDFs, files and images

| Symptom | Fix |
| --- | --- |
| Documents never finish, and the app says "This is taking longer than expected" | Check the worker is running and healthy, and read its log. |
| Large PDFs fail, or the worker restarts | The worker may have hit its memory cap. Check `docker inspect --format '{{.State.OOMKilled}}' lims-<slug>-worker-1`. Raise `WORKER_MEM_LIMIT` and run `deploy.sh`. |
| Logos, photos or PDFs do not show, or links give `403` | Signed links go to the files domain. Check `FILES_DOMAIN` resolves to the server, and that the proxy site for it exists. Only signed `GET` and `HEAD` requests are allowed there, so a plain address without a signature always gives `403`. |
| A link that worked earlier now fails | Signed links last 5 minutes. Open the document again from the app. |

## Email

- **No email arrives.** Use the **Email** step of the setup wizard (**Send a test email to**) to send a test. The wizard is at `/setup/lab` on the app address. If it says "The mail server refused or could not be reached", check `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER` and `SMTP_PASSWORD`, and that the server can reach the mail server on that port.
- **The test works but nothing is delivered.** Check `SMTP_TRANSPORT`. `json` records mail instead of sending it, for trials.
- **Some emails show as failed.** Each email is tried 5 times with growing waits. The last error is kept against the email on the record it belongs to.

See [Email (SMTP)](/help/integrations/email-smtp/).

## Backups

| Message | Fix |
| --- | --- |
| `BACKUP FAILED for <slug> at step "..."` | The step tells you what failed. Read `backup.log` in the company folder. |
| `BACKUP_AGE_RECIPIENT is set but age is not installed` | Install age (for example `apt-get install age`). |
| `No gpg public key for ...` | Import the public key into the backup user's gpg keyring. |
| `BACKUP_OFFSITE_CMD is set but backups are not encrypted` | Set `BACKUP_AGE_RECIPIENT` (or a gpg option), or accept plain copies with `BACKUP_OFFSITE_ALLOW_PLAINTEXT="true"`. |
| `Off-site copy failed` | Your `BACKUP_OFFSITE_CMD` exited with an error. The local backup is kept. Run the command by hand to see why. |
| `Backup succeeded but BACKUP_PING_URL did not answer` | The alert service could not be reached. The backup itself is good. |
| `... cannot run docker, so a nightly backup from this crontab would fail` | Add the user to the `docker` group, or install the cron job as a user who can run Docker. |

## Restore

| Message | Fix |
| --- | --- |
| `That backup belongs to a different company` | You pointed one company's restore at another company's backup. Use the right backup. |
| `Backup failed its checksum` | The backup is damaged or incomplete. Use another copy. |
| `Set BACKUP_AGE_IDENTITY_FILE to the age private key file to decrypt ...` | Set it in the environment of the machine doing the restore. |
| `pg_restore failed. The live database was not touched.` | The dump could not be restored. Your live data is unchanged. Try an older backup. |
| `The restored database failed its checks` | The backup did not look like a working database. Your live data is unchanged. |
| `/data/.lims-restore-old exists from an earlier failed restore` | An earlier restore stopped half way. Look inside that folder in the storage volume before removing it. |
| `Migrations failed on the restored database` | The backup may come from newer images. Set `versions.env` to the versions in the backup's `manifest.txt`, then restore again. The script printed the command that puts the previous database back. |

## Upgrades

| Message | Fix |
| --- | --- |
| `Cannot pull ... Nothing was changed.` | The version is wrong or the registry login has expired. |
| `The pre-upgrade backup failed. Nothing was changed.` | Fix the backup problem first (see above). |
| `Upgrade to ... failed and was rolled back` | The new version would not start, so the script restored the old one. Read the API log from the attempt and the release notes. |
| `No upgrade history for <slug>` | `rollback.sh` found no earlier upgrade to go back to. |

## Related

- [Operations](/help/install/operations/)
- [Troubleshooting](/help/troubleshooting/)
- [Error messages](/help/troubleshooting/error-messages/)
