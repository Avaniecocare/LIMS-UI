---
title: Licence and trials
description: See the licence this installation runs on, add a new one, and what happens when a trial or licence ends.
---

Some installations run on a licence or a trial. **Admin** → **Licence** shows which one, when it ends and how many days are left. If it says the installation does not need a licence, nothing on this page applies.

**Who can do it**: Admin (`admin.settings`). Everyone signed in sees a banner when the end is near.

## When it ends

Nothing is deleted. Everything stays readable, and PDFs and exports still work. Nothing new can be saved until a new licence is added, and automatic payment reminders pause.

| Badge | What it means |
| --- | --- |
| **Active** | Working normally. |
| **Ending soon** | 14 days or fewer are left. Administrators are told 14, 7, 3 and 1 days before. |
| **Ended, still working** | The licence has ended, but its extra days are not used up. Saving stops on the **Read-only from** date. |
| **Ended, read-only** | Nothing new can be saved. |
| **None** | No licence has been added yet, so nothing can be saved. |

A trial counts from the day it is added, and also ends on its own last day, whichever comes first.

## Add a licence

**Before you start**: send the **Installation** number on this page to your supplier, and they send back a licence, one long line of text.

1. Go to **Admin** → **Licence**.
2. Paste it into **Licence**.
3. Click **Add licence** and confirm your password if asked.

**Result**: **Licence added**. If the installation was read-only, work carries on at once.

Entering the same trial again does not start it again.

## Troubleshooting

| Message | Cause | What to do |
| --- | --- | --- |
| This licence was not issued for this product, or has been altered | Part of it is missing, or it was changed | Copy the whole line again |
| This licence is for another installation | It was issued for a different **Installation** number | Ask for one for this number |
| This licence has already ended | Its last day has passed, or this trial was used here before | Ask for a new one |

If the server's clock was once wrong by a long way, the licence can look ended. Put the clock right and ask for a newly issued licence, which sets this straight.

## Related

- [Settings](/help/admin/settings/)
- [Environment variables](/help/install/environment/)
