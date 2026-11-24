---
title: Export all data
description: Download a copy of every record and file, to keep or to move to another system.
sidebar:
  order: 18
---

**Admin** → **Data export** makes a copy of everything the laboratory has: every record and every stored file. It works when a licence has ended, too.

It is not a backup: it cannot be restored into the LIMS. Backups are made on the server. See [Installation](/help/install/).

**Who can do it**: Admin (`admin.dataExport`). Your password is confirmed first, everyone with `admin.users` is told, and each download is in the [audit log](/help/admin/audit-log/).

## Make an export

1. Click **Make an export** and confirm your password if asked.
2. Wait. A large laboratory can take an hour or more; you can leave the page, and are notified when it is ready.
3. Click each part to download it. With several parts, unpack them all into the same folder.

**Result**: ZIP files that stay for seven days and are then removed. Only one export is made at a time.

:::caution
The export holds personal data, customers' results and invoices, in plain form. Keep it as carefully as the LIMS itself, and delete copies you no longer need.
:::

## What is in it

| Folder | What it holds |
| --- | --- |
| `tables/` | One CSV file per table, for Excel and similar |
| `data/` | The same rows as JSON Lines, exactly as the database holds them, for loading into another system |
| `files/` | Every stored file: reports, invoices, photographs, certificates, the file library |
| `README.txt` | The same, with how to match files to records |
| `missing-files.csv` | Only if there are any: files the records name but the store no longer has |

Left out: passwords, two-factor secrets, one-time links and password reset emails.

To check that a download is complete, compare its SHA-256 with the one shown beside it.

## Troubleshooting

| Message | What to do |
| --- | --- |
| An export is already being made | Wait for it to finish |
| It was interrupted | The server restarted while it was being made. Start it again |
| The export could not be made | Start it again. If it keeps failing, whoever runs the server looks in the worker's log; a full disk is the usual cause |

## Related

- [Privacy](/help/admin/privacy/)
- [Licence and trials](/help/admin/licence/)
