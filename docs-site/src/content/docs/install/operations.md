---
title: Operations
description: Keep an installation healthy - health checks, logs, the status script, scheduled jobs, background queues, monitoring and memory limits.
sidebar:
  order: 8
---

This page is for whoever looks after the server day to day.

## Status

```bash
/opt/lims-deploy/scripts/status.sh --client-dir /srv/lims-clients/<slug>
```

It prints the versions the company runs and the state of each container, including its health.

## Health checks

| Part | Check | Healthy when |
| --- | --- | --- |
| API | `GET /health/live` | The process is up. Answers `{"status":"ok"}`. |
| API | `GET /health/ready` | The API can reach PostgreSQL and Redis. Otherwise answers `503`. |
| Worker | A Docker check that connects to Redis | The worker's settings can reach Redis, where its queues are. The worker serves no HTTP. |
| UI | `GET /healthz` | nginx answers `ok`. |
| PostgreSQL | `pg_isready` | The database accepts connections. |
| Redis | `PING` | Redis answers. |
| Storage | Any HTTP answer on port 9000 | The storage server is up. |

The health paths are not under `/api/v1`: use `https://api.lims.example.com/health/ready`.

The API and worker start only once migrations have finished and Redis and storage are healthy.

## Monitoring

Set up at least these:

1. **Uptime monitor** on `https://<api domain>/health/ready` and on the app domain.
2. **Backup alert:** set `BACKUP_PING_URL` to a dead-man's-switch service. See [Backup and restore](/help/install/backup-restore/#get-alerted).
3. **Error tracking:** set `ERROR_TRACKING_DSN` to an HTTPS webhook. The API and worker post server errors to it as JSON: the error's name, message, the first lines of its stack and ids such as the request id. Never request bodies. At most 30 a minute per process. See [Error tracking](/help/integrations/error-tracking/).
4. **Disk space** on the server, for the database, stored files and local backups.

## Logs

Every container logs to Docker's `json-file` driver, at most 3 files of 10 MB each, so logs cannot fill the disk.

```bash
docker logs --tail 100 lims-<slug>-api-1
docker logs --tail 100 lims-<slug>-worker-1
```

The API and worker write structured JSON logs. Passwords, cookies and the CSRF token are redacted.

- Every API request is logged with its **request id**, method, path, status and time taken. The same id is returned to the browser in the `X-Request-Id` header and shown to users on server errors ("Request ID: ..."). Search the logs for it to find what happened.
- Every failed background job is logged as `job failed`, with the queue, the job id, the attempt count and the error.
- Every finished scheduled task is logged as `scheduled task finished`, with its name and result.

Set `LOG_LEVEL` to `debug` for more detail while you investigate, then set it back.

## Background queues

The worker runs four queues, kept in Redis:

| Queue | What it does | Runs at once | Attempts |
| --- | --- | --- | --- |
| `email` | Sends email through your SMTP server | 5 | 5, waiting longer each time |
| `documents` | Renders PDFs with Chromium and builds Excel exports | 2 | 2 |
| `whatsapp` | Sends WhatsApp messages | 3 | 5, waiting longer each time |
| `scheduled` | Runs the scheduled jobs below | 1 | 2 |

Finished jobs are cleared after an hour. Failed jobs are kept for 7 days.

When the worker is stopped, it finishes the jobs it is running before it exits (it is forced to stop after 60 seconds).

:::note
Redis runs with append-only persistence and never evicts keys, so queued jobs and sessions survive a Redis restart.
:::

## Scheduled jobs

The worker runs these on Indian Standard Time (Asia/Kolkata):

| Job | When | What it does |
| --- | --- | --- |
| `email-sweep` | Every minute | Sends email that was queued inside a database transaction, once that transaction has committed. |
| `report-pdf-sweep` | Every 10 minutes | Prepares again the final PDF of any signed report whose PDF failed. |
| `quotations-expire` | 00:05 daily | Marks quotations past their validity date as expired. |
| `tat-check` | 08:00 daily | Tells the assigned analyst about tests due within the warning period (a setting), and also planners (`planning.edit`) once a test is past its due date. |
| `equipment-due` | 08:00 daily | Tells the quality team about instruments due for calibration or maintenance. Only when the Quality module is on. |
| `quotations-expiring` | 08:15 daily | Tells the quotation's creator about sent quotations that expire within 3 days. |
| `invoices-overdue` | 08:30 daily | Tells accounts (`invoices.edit`) about issued or part-paid invoices past their due date. |
| `invoice-reminders` | 09:30 daily | Sends the automatic payment reminders the lab has set up. Only when the billing module is on. |

If several workers run, each job still runs once per schedule.

## Memory limits

Each container has a memory cap. These are the defaults, about 2.8 GB per company:

| Container | Setting | Default |
| --- | --- | --- |
| PostgreSQL | `POSTGRES_MEM_LIMIT` | `512m` |
| Redis | `REDIS_MEM_LIMIT` | `128m` |
| Storage | `S3_MEM_LIMIT` | `256m` |
| API | `API_MEM_LIMIT` | `768m` |
| Worker | `WORKER_MEM_LIMIT` | `1g` |
| UI | `UI_MEM_LIMIT` | `64m` |
| Proxy (once per server) | `CADDY_MEM_LIMIT` | `128m` |

A container that reaches its cap is killed and restarted by Docker. `docker inspect` then shows `OOMKilled`:

```bash
docker inspect --format '{{.State.OOMKilled}}' lims-<slug>-worker-1
```

To raise a cap, set it in `deployment.env` and run `deploy.sh`. If large PDFs fail, raise `WORKER_MEM_LIMIT` first.

## Performance

The backend is load tested against a database with 500,000 tests. The test fails if any endpoint's 95th-percentile response time is over 800 ms. Large report exports to PDF are capped; the app asks people to narrow the filters or export to Excel instead.

If reports and dashboards slow down everyday work, add a PostgreSQL read replica and set `DATABASE_READ_URL`. Reports and dashboards then read from it.

## Security checklist

- Only the proxy publishes ports (80 and 443).
- Keep `secrets.env` and backups readable only by the operator account.
- Rotate the SMTP password and WhatsApp token in `deployment.env`, then run `deploy.sh`.
- Keep Docker and the server's operating system updated.

## Related

- [Install troubleshooting](/help/install/troubleshooting/)
- [Backup and restore](/help/install/backup-restore/)
- [Environment variables](/help/install/environment/)
