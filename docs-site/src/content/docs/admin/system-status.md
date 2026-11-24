---
title: System status
description: See whether the database, file store, background worker, email and other parts are working, and what to do when one is not.
sidebar:
  order: 16
---

**Admin** → **System status** measures each part of the system when you open it, and every minute while it stays open.

**Who can do it**: Admin (`admin.settings`).

| Badge | What it means |
| --- | --- |
| **Working** | It answered just now, and nothing needs a look. |
| **Needs a look** | It works, but something failed recently or is running late. |
| **Not working** | It did not answer, or has stopped. |
| **Off** | It is not set up here. This is not a fault. |

## What each line tells you

| Line | If it is not working |
| --- | --- |
| **Database**, **Sessions and queues**, **File store** | The server cannot reach it. Tell whoever runs the server. |
| **Background worker** | Emails, PDFs and reminders wait. Nothing is lost: they go out once the worker runs again. |
| **Scheduled checks** | Reminders, due-date notices and email sweeps have stopped. Usually the worker is not running. |
| **Mail server** | Signing in to it failed. Check the mail settings on the server. See [Email (SMTP)](/help/integrations/email-smtp/). **Test mode** means emails are recorded but never sent. |
| **Emails** | Some failed in the last day. See [Emails](/help/admin/emails/). |
| **PDFs and exports** | Some failed in the last day. Make them again from their record. |
| **WhatsApp**, **GST e-invoices** | Some messages failed, or some documents are not registered. Open **Admin** → **WhatsApp**, or the invoices concerned. |
| **Licence** | It has ended or soon will. See [Licence and trials](/help/admin/licence/). |

This page works only while the server does. To be told when the server itself is down, whoever runs it sets up monitoring from outside. See [Installation](/help/install/).

## Related

- [Emails](/help/admin/emails/)
- [Troubleshooting](/help/troubleshooting/)
