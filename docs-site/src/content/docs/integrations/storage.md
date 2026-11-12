---
title: File storage
description: Connect the LIMS to S3-compatible file storage, and what it stores there.
sidebar:
  order: 4
---

The LIMS keeps files in S3-compatible object storage: Amazon S3, or any service or on-premise server that speaks the S3 protocol. The database holds only each file's details and its place in storage.

## Settings

Set these in the server's `.env` file, then restart the server.

| Variable | What it means | Required | Default |
| --- | --- | --- | --- |
| `S3_ENDPOINT` | The storage service's address, for example `https://s3.ap-south-1.amazonaws.com` or your own server's. | Yes | none |
| `S3_PUBLIC_ENDPOINT` | The address browsers use for file links, if different from `S3_ENDPOINT` (for example when the server reaches storage on an internal address). | No | same as `S3_ENDPOINT` |
| `S3_REGION` | The region. | No | `us-east-1` |
| `S3_BUCKET` | The bucket name. Create it before starting the server. | Yes | none |
| `S3_ACCESS_KEY` | Access key of an account allowed to read and write the bucket. | Yes | none |
| `S3_SECRET_KEY` | Its secret key. | Yes | none |
| `S3_FORCE_PATH_STYLE` | `true` for most self-hosted services (addresses like `endpoint/bucket/file`); `false` for virtual-host style. | No | `true` |
| `MAX_UPLOAD_BYTES` | The largest upload accepted, in bytes. | No | 15728640 (15 MB) |

```bash
S3_ENDPOINT=https://storage.example.com
S3_REGION=ap-south-1
S3_BUCKET=lims
S3_ACCESS_KEY=<your-access-key>
S3_SECRET_KEY=<your-secret-key>
S3_FORCE_PATH_STYLE=true
```

:::caution
Keep the bucket private: no public access. Give the access key rights to this bucket only.
:::

<!-- TODO(verify): which S3-compatible image the production deployment uses; it is an open decision in the deployment repository. -->

## What is stored

- Generated documents: test reports (including each signed report's final PDF), quotations, invoices, acknowledgements, dispatch challans, labels and Excel or PDF exports.
- Uploads: sample photographs, report photos, test result images and attachments, customer letter pages, instrument calibration certificates, staff signature images.
- The file library: SOPs, certificates and other controlled documents (PDF, images, Word, Excel, CSV).
- Branding: logo, browser tab icon and sign-in picture.

Files are grouped by category and year in the bucket, under random names.

## How files are protected

- The bucket stays private. Browsers get a link that is signed for one file and expires after five minutes, and only after the server has checked that the person may see the record the file belongs to.
- PDFs and images open in the browser; other files (Word, Excel, CSV) download.
- Uploads are checked by their content, not their name or claimed type. Ordinary uploads accept PNG, JPEG, WebP and PDF; the file library also accepts Word, Excel and CSV. Branding pictures are limited to 2 MB.
- Downloads from the file library are recorded in the audit log.

## Backups

Back up the bucket together with the database: a database restored without its files, or the other way round, leaves broken links. See [Installation](/help/install/).

## Related

- [Integrations](/help/integrations/)
- [Security for administrators](/help/security/#data-storage)
