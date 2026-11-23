---
description: Generate an expiry alert report for policies expiring within N days
argument-hint: <days>
---

Generate an expiry alert report for Active policies expiring within the next **$ARGUMENTS** days.

Steps — follow in order, do NOT edit any other file:

## 1. Validate input

- `$ARGUMENTS` must be a whole number from 1 to 365. If it is empty, use 30. If it is anything else, stop and tell the user the expected form (`/expiry-alert 30`). Do not guess.
- Call the validated value `N`. Today's date is `today`; the window is `today` to `today + N days`, both inclusive.

## 2. Fetch data

The API runs at `http://localhost:8080`. Use `curl -s` and check the HTTP status. If the server is not reachable, stop and tell the user to start the backend. Do not invent data or fall back to the database.

1. `GET /api/v1/policies/summary` gives `totalPolicies`, `countByStatus` and `expiringSoonCount`.
2. `GET /api/v1/policies?status=Active&size=2000&sort=expiryDate,asc` gives the Active policies. Read `totalPages` from the response and fetch every page (`&page=1`, `&page=2`, and so on), so no policy is missed.

## 3. Filter and group

- Keep Active policies whose `expiryDate` is within the window. Filter on the client side, because the API has no expiry filter.
- Group the kept policies by `region`, sorted alphabetically. Within each region, order by `expiryDate` ascending, then `policyNumber`.
- Note which policies have `flaggedForReview = true`.
- Never add premiums across currencies. Report a premium total per region only per currency, for example `SGD 120,000.00, USD 45,000.50`.

## 4. Cross-check

`expiringSoonCount` in the summary is always a 30-day figure and counts every status, not only Active. Treat it as context only:

- If `N` is 30, show the summary figure next to your count and explain that the two may differ because the summary is not limited to Active policies. If your count is higher than the summary's, flag it as an unexpected mismatch.
- If `N` is not 30, show the summary figure labelled "30-day figure, all statuses" and do not compare.

## 5. Write the report

Write `output/expiry_alert.md` with the Write tool, overwriting any previous version. Do not use a shell redirect. Use this structure:

```markdown
# Policy Expiry Alert

**Generated:** <today's date>
**Window:** <today> to <today + N days> (<N> days)
**Scope:** Active policies

## Overview
- Total policies: <totalPolicies>
- Active policies: <countByStatus.Active>
- Active policies expiring in window: <count>
- Flagged for review among those: <count>
- Summary endpoint 30-day expiring figure (all statuses): <expiringSoonCount>

| Region | Expiring | Flagged | Premium at risk (per currency) |
|---|---|---|---|

## <Region name> (<count> expiring)
| Policy # | Policyholder | Line | Expiry | Days left | Premium | Underwriter | Flagged |
|---|---|---|---|---|---|---|---|

(one section per region that has at least one policy)
```

If no policies expire in the window, still write the file with the overview and the line "No Active policies expire within N days." Do not create empty region sections.

## 6. Report back

Give a short reply with the output path, the window, the number of policies per region, and anything that needs attention (flagged policies, a mismatch with the summary, or a region with many expiries). Do not paste the whole report.
