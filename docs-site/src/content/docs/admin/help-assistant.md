---
title: Help assistant
description: See what people ask the "Ask AI" help assistant, which questions the documentation does not answer, answers marked not helpful, page feedback and cost.
sidebar:
  order: 15
---

The help assistant is the **Ask AI** button on these help pages. It answers questions about using the LIMS from this documentation only, with links to the pages it used. The **Help assistant** tab in Admin shows how it is used, so you can find gaps in the documentation and keep an eye on cost. Turning it on and its limits are environment settings: see [AI help assistant](/help/integrations/ai-assistant/).

## See how the assistant is used

**Goal:** find out what people ask and what the documentation does not answer.
**Who can do it:** anyone with `admin.settings` (the Admin role).

1. Open **Admin**, then the **Help assistant** tab.
2. Choose the period: **Last 7 days**, **Last 30 days** or **Last 90 days**.

**Result:** the tab shows:

| Section | What it shows |
| --- | --- |
| Summary | Whether the assistant is **On** or **Off**, the model, the daily and monthly budget; the number of questions, how many were not in the docs, the cost in the period and on the last day, and refused requests. |
| Questions by outcome | Answered, Answered from cache, Not in the docs, Off topic, Blocked, Too many questions, Failed the human check, Paused: budget reached, Error. |
| **Not answered by the docs** | Recent questions the documentation could not answer: the pages worth writing next. |
| **Most asked** | The questions asked most often. |
| **Answers marked not helpful** | Questions whose answer got 👎, with the pages the answer used. Check those pages: they may be unclear or out of date. |
| **Page feedback** | Pages with "Was this page helpful?" answers, most 👎 first. |
| **By day** | Questions and cost per day. |

<!-- screenshot: admin-help-assistant -->

:::note
Questions are stored with email addresses, phone numbers and other long numbers replaced by placeholders, and without any IP address or account. Blocked requests are counted but their text is not kept. Everything is deleted after 90 days (set by `HELP_LOG_RETENTION_DAYS`).
:::

## When it pauses itself

The assistant stops answering when the day's or month's budget is spent, and starts again the next day or month. Search keeps working throughout. When 80% of the day's budget is used, everyone with `admin.settings` gets a notification.

## Related

- [AI help assistant settings](/help/integrations/ai-assistant/)
- [Admin](/help/admin/)
