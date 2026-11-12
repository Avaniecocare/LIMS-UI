---
title: Lists and paging
description: How list endpoints page, sort, search and filter, and the limits on page size.
sidebar:
  order: 4
---

Every list endpoint uses the same query parameters and returns the same shape, so one piece of code can page through any of them.

## The response

```json
{
  "data": [ { "id": "…", "name": "…" } ],
  "meta": { "page": 1, "pageSize": 25, "total": 312, "totalPages": 13 }
}
```

| Field | Meaning |
| --- | --- |
| `data` | The rows on this page. |
| `meta.page` | The page you asked for, starting at 1. |
| `meta.pageSize` | Rows per page. |
| `meta.total` | Rows that match, across all pages. |
| `meta.totalPages` | Number of pages. Always at least 1, even when there are no rows. |

## Query parameters

| Parameter | Default | Rules | What it does |
| --- | --- | --- | --- |
| `page` | `1` | Whole number, 1 or more | Which page to return. |
| `pageSize` | `25` | Whole number, 1 to **200** | Rows per page. |
| `sort` | Each list's own default | Up to 120 characters | Field to sort by. Each list allows only certain fields; anything else falls back to the default. |
| `order` | See below | `asc` or `desc` | Sort direction. |
| `q` | None | Up to 200 characters | Free-text search, where the list supports it. |

A `pageSize` over 200, a `page` of 0 or an `order` other than `asc` or `desc` is refused with `400 VALIDATION_FAILED`.

```http
GET /api/v1/customers?page=2&pageSize=50&sort=name&order=asc&q=industries HTTP/1.1
Cookie: lims_sid=<session-cookie>
```

### Sorting

Each list has a fixed set of sortable fields and a default. For example, customers sort by `name`, `crn`, `stateName` or `creditDays` (default `name`, ascending), and invoices by `invoiceNo`, `invoiceDate`, `dueDate`, `grandTotal`, `status` or `createdAt` (default `createdAt`, newest first). A `sort` value that the list does not allow is ignored and the default is used, without an error.

When you do not give `order`, the default field uses its own default direction and any other field sorts ascending.

The [API reference](/help/developers/api/) lists the parameters of each endpoint.

## Filters

Lists add their own filters as more query parameters. Unknown parameters are refused. Some examples:

| Endpoint | Filters |
| --- | --- |
| `GET /api/v1/customers` | `active`, `stateCode` |
| `GET /api/v1/invoices` | `status`, `customerId`, `from`, `to` (dates) |
| `GET /api/v1/invoices/due` | `customerId`, `bucket` (`Not Due`, `0-30`, `31-60`, `61-90`, `90+`), `overdue` (`true` or `false`) |

Dates are `YYYY-MM-DD`. Yes-or-no filters are the strings `true` and `false`.

:::note
MIS report endpoints (`GET /api/v1/mis/{key}`) accept `q` and `sort` but do not use them.
:::

## Reading every page

To load a whole list, request page 1, then each page up to `meta.totalPages`:

```bash
page=1
while :; do
  body=$(curl -s -b cookies.txt "https://api.lims.example.com/api/v1/customers?page=$page&pageSize=200")
  echo "$body" | jq -c '.data[]'
  total=$(echo "$body" | jq '.meta.totalPages')
  [ "$page" -ge "$total" ] && break
  page=$((page + 1))
done
```

Keep a sensible upper limit on the number of pages. For large exports, prefer the Excel exports, which run as background [documents](/help/developers/documents/).

## Related

- [API overview](/help/developers/)
- [Documents](/help/developers/documents/)
