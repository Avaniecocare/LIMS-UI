---
title: Server requirements
description: What a server needs before you install the LIMS on it - memory, disk, software, domain names, certificates and network access.
sidebar:
  order: 2
---

Check these before you start. You can run the LIMS on a cloud virtual machine or on a server at the lab. One server can hold several companies; size it for all of them together.

## Memory

Every container has a memory cap, so one company's PDF rendering or a large query cannot starve another company's database. The defaults add up to about **2.8 GB per company**:

| Container | Setting | Default cap |
| --- | --- | --- |
| PostgreSQL | `POSTGRES_MEM_LIMIT` | 512 MB |
| Redis | `REDIS_MEM_LIMIT` | 128 MB |
| Storage | `S3_MEM_LIMIT` | 256 MB |
| API | `API_MEM_LIMIT` | 768 MB |
| Worker (runs Chromium for PDFs, with 256 MB of shared memory) | `WORKER_MEM_LIMIT` | 1 GB |
| UI | `UI_MEM_LIMIT` | 64 MB |
| Reverse proxy (once per server) | `CADDY_MEM_LIMIT` | 128 MB |

Size the server for the sum over all companies, plus the operating system. For example, two companies need about 5.6 GB for the containers, plus 128 MB for the proxy, plus room for the OS.

You can change any cap in the company's `deployment.env`. See [Operations](/help/install/operations/#memory-limits).

## CPU

The sources set no CPU limit. PDF rendering in the worker is the heaviest work.
<!-- TODO(verify): recommended CPU count per company; not stated in the deployment repository. -->

## Disk

| What | Size |
| --- | --- |
| Backend image (API and worker) | About 4.8 GB, because it carries Chromium and its libraries |
| UI, PostgreSQL, Redis, proxy and storage images | Small in comparison |
| Database and stored files | Grows with use: PDFs, photos and attachments are the largest part |
| Local backups | One copy of the database and all files per night, kept for `BACKUP_RETENTION_DAYS` (default 30) |

:::caution
Local backups keep a full copy of the files every night. Thirty nights of backups can be many times the size of the live data. Plan the disk, or shorten the retention and rely on off-site copies.
:::

A restore needs room for two copies of the stored files for a moment, because it unpacks the backup next to the live files before swapping them.

Container logs cannot fill the disk: each container keeps at most 3 files of 10 MB.

## Operating system and software

- A Linux server that runs **Docker Engine** with the **Compose plugin**.
  <!-- TODO(verify): minimum Docker Compose version; the compose file uses env_file entries with `required: false`. -->
- **cron**, for the nightly backup.
- **age** (recommended) or **gpg**, if you encrypt backups.
- The tool your off-site copy command uses, for example `rclone` or the AWS CLI.
- `curl`, if you set a backup alert URL.
- The user who runs the scripts must be in the `docker` group, because the nightly backup runs from that user's crontab.

The images are kept in a private container registry. Sign in once with `docker login` and a token that can read packages, or load the images by hand and provision with `--offline`.

## Domain names

Each company needs three names, usually under one parent domain:

- `app.` for the web app, for example `app.lims.example.com`
- `api.` for the API, for example `api.lims.example.com`
- `files.` for signed file links, for example `files.lims.example.com`

The app and API must share the same parent domain, because the sign-in cookie is sent only between sites that count as the same site.

**Cloud:** create DNS records for all three names pointing at the server before you provision. The proxy cannot get certificates until they resolve.

**On-premise (lab network):** add the three names to the lab's DNS server, or to each computer's hosts file, pointing at the server's address.

## Certificates (TLS)

The app must be served over HTTPS. Browsers allow the camera and the "Use phone" photo upload only on HTTPS pages, and the session cookie is marked secure in production.

- **Cloud:** the reverse proxy (Caddy) gets and renews certificates automatically. Ports 80 and 443 must be open to the internet.
- **On-premise:** use the lab's own certificates, or an internal certificate authority that the lab's computers and phones trust.
<!-- TODO(verify): how to give Caddy the lab's own certificates on an on-premise install; the repository does not show it. -->

## Network access

Open **ports 80 and 443** inbound to the server. Nothing else needs to be published.

Outbound access the server may need:

| To | Why | Needed |
| --- | --- | --- |
| Your container registry | Pull the images at install and upgrade | Yes, unless you load images by hand |
| Your SMTP server | Send all email | Yes |
| Your certificate authority (for example Let's Encrypt) | Get and renew TLS certificates | Cloud installs |
| India Post PIN code directory (`PINCODE_LOOKUP_URL`) | Fill city and state from a PIN code | Optional. See [PIN code lookup](/help/integrations/pincode-lookup/) |
| Your error tracker's HTTPS webhook (`ERROR_TRACKING_DSN`) | Report server errors | Optional. See [Error tracking](/help/integrations/error-tracking/) |
| Meta's WhatsApp Cloud API | Send WhatsApp messages | Optional. See [WhatsApp](/help/integrations/whatsapp/) |
| Your AI provider | The help assistant | Optional. See [AI help assistant](/help/integrations/ai-assistant/) |
| Your off-site backup store | Copy backups off the server | Strongly recommended |

Everything else runs without internet access. On a server with no internet access, set `PINCODE_LOOKUP_URL` to an empty value to turn the PIN code lookup off.

## Related

- [How the system is built](/help/install/)
- [Install with Docker](/help/install/docker/)
