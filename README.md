# WLTH Client Hub API

A Nuxt 4 + TypeScript (Nitro) API modelling the seven loan-servicing options
from the WLTH Client Hub screen. Each option maps to a request type that can be
submitted, listed, fetched, and advanced through a status lifecycle.

Brand tokens from the design (`appConfig.brand`): background `#1F232D`,
text `#FFFFFF`, button `#1445C7`, accent `#2EC4C9`. The landing page at `/`
renders the hub from the live `/api/hub` endpoint.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # vue-tsc
```

## Request types

| Type | Title | Endpoint |
|------|-------|----------|
| `direct-debit` | Direct Debit Request | `/api/requests/direct-debit` |
| `linked-account` | Linked Account Nomination | `/api/requests/linked-account` |
| `repayment-change` | Repayment Change | `/api/requests/repayment-change` |
| `redraw` | Redraw Request | `/api/requests/redraw` |
| `open-offset` | Open Offset | `/api/requests/open-offset` |
| `principal-reduction` | Permanent Principal Reduction | `/api/requests/principal-reduction` |
| `product-switch` | Product Switch | `/api/requests/product-switch` |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/hub` | The seven hub options (mirrors the landing screen) |
| `GET` | `/api/requests` | List all requests (`?status=` filter) + counts by type |
| `POST` | `/api/requests/:type` | Submit a new request of `:type` → `201` |
| `GET` | `/api/requests/:type` | List requests of `:type` (newest first) |
| `GET` | `/api/requests/:type/:id` | Fetch one request |
| `PATCH` | `/api/requests/:type/:id` | Update status |

Statuses: `submitted` → `in_review` → `approved` / `rejected` → `completed` / `cancelled`.

## Example

```bash
curl -X POST http://localhost:3000/api/requests/direct-debit \
  -H 'Content-Type: application/json' \
  -d '{
    "customer": {"firstName":"Ada","lastName":"Lovelace","email":"ada@example.com","phone":"0400000000"},
    "loanAccountNumber": "LN12345",
    "action": "setup",
    "bankAccount": {"accountName":"Ada L","bsb":"062-000","accountNumber":"12345678"},
    "amount": 1500.50,
    "frequency": "monthly",
    "startDate": "2026-07-01"
  }'
```

Returns a stored record with a generated `id`, a human reference
(`WLTH-DD-XXXXXX`), `status: "submitted"`, and timestamps. Validation failures
return `422` with field-level errors; unknown types return `404`.

## Structure

```
server/
  types/requests.ts        # RequestType union, statuses, hub options, domain types
  utils/validation.ts      # Zod schemas per request type (BSB/account/amount rules)
  utils/store.ts           # in-memory repository (swap for a real datastore)
  utils/guards.ts          # :type route-param validation
  api/
    hub.get.ts
    requests/
      index.get.ts                 # list all + counts
      [type]/index.post.ts         # create
      [type]/index.get.ts          # list by type
      [type]/[id].get.ts           # fetch one
      [type]/[id].patch.ts         # status transition
app/app.vue                # branded landing page driven by /api/hub
```

## Notes

- Storage is in-memory (`Map`), so data resets when the process restarts.
  Replace `server/utils/store.ts` with a real datastore to persist.
- BSBs are accepted as `062-000` or `062000` and normalised to 6 digits.
- Validation is centralised in `bodySchemas`, keyed by request type, so adding
  a new servicing form is: add the type to `REQUEST_TYPES`, a schema to
  `bodySchemas`, an option to `HUB_OPTIONS`, and a reference prefix in the store.
