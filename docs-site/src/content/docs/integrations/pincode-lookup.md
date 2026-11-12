---
title: PIN code lookup
description: How address forms fill the city, state and area from a PIN code, and what happens when a PIN is not listed or the service is down.
sidebar:
  order: 5
---

On address forms (for example a customer's billing and report addresses), typing a six-digit PIN code fills the **City**, **State** and GST state code, and offers the post office names under that PIN as choices for **Area / locality**. The person can always correct what was filled.

The lookup runs through the LIMS server, which asks India Post's public PIN code directory. The browser never calls an outside service.

## Settings

| Variable | What it means | Default |
| --- | --- | --- |
| `PINCODE_LOOKUP_URL` | The PIN code directory's address; the PIN is added to the end. Set it empty to stop calling the directory: forms then fill only the state, worked out from the PIN itself. | `https://api.postalpincode.in/pincode/` |

The server needs outgoing internet access to reach the directory.

## How a PIN is looked up

1. **Exact.** If India Post lists the PIN, the district (used as the city), state and post office names are filled. The form says **Filled from the PIN code:** with the place.
2. **Nearby.** Newer PINs are often not listed yet. The server then tries the closest listed PINs in the same sorting district and uses the first one found for the district and state. Its post offices are not offered, because they belong to the other PIN. The form says the PIN is not in India Post's list yet and names the nearby PIN used.
3. **Region.** If nothing nearby is listed, or the directory cannot be reached, only the state is filled, from the PIN's first digits. The form asks the person to type the city and area.
4. **None.** If even the state cannot be worked out, the form says **No details found for this PIN code. Fill in the city and state by hand.**

A PIN must be six digits and cannot start with 0.

## Caching and outages

- Answers are cached on the server: 30 days for a listed PIN, one day for an unlisted one.
- Each call to the directory waits at most four seconds.
- If the directory is down, the server does not keep trying neighbouring PINs; it falls back to the state from the PIN at once. Forms always still work by hand.

## Who can use it

Anyone who edits addresses: people with `customers.view`, `customers.edit`, `jobs.create`, `jobs.edit`, `orders.edit`, `quotations.edit` or `admin.users`.

## GSTIN auto-fill

Typing a GSTIN fills the state, GST state code and PAN. This is worked out on the server from the GSTIN itself, with no outside call and no setting.

## Related

- [Integrations](/help/integrations/)
- [Lab profile](/help/admin/lab-profile/#tax-registration)
