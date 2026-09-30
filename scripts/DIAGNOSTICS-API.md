# Diagnostics API contract (frontend)

Base path: `/api/Diagnostics`  
Auth: `Authorization: Bearer <JWT>` on all endpoints.

When `Diagnostics:Enabled` is **false** (default): all routes return **404**.  
When enabled: non-Admin/SuperAdmin returns **403**.

Enable on server for test window only:

```json
"Diagnostics": {
  "Enabled": true,
  "MaxLines": 100,
  "MaxRepeat": 10,
  "MaxBenchmarkRequestSeconds": 45
}
```

---

## Real-request mode (any existing API)

Send header on **any** authenticated request:

| Header | Value |
|--------|--------|
| `X-Diag` | `1` |

Requirements: `Diagnostics:Enabled=true`, user is Admin or SuperAdmin.

Response headers (also listed in CORS `Access-Control-Expose-Headers`):

| Header | Meaning |
|--------|---------|
| `X-Diag-ServerMs` | Server wall time for the request (ms) |
| `X-Diag-Commands` | EF SQL command count (excluding auth phase) |
| `X-Diag-SaveChanges` | SaveChanges call count |
| `X-Diag-DbMs` | Total SQL wait time (ms) |
| `X-Diag-TransactionMs` | First transaction begin → last commit (ms) |
| `X-Diag-N1Top` | Top 3 repeated query shapes: `count:urlencodedSql\|count:...` (SQL cut to 200 chars) |
| `X-Diag-AuthCommands` | SQL commands during Admin permission check only |

Example: `POST /api/PurTransH` with `X-Diag: 1` and a body from `sample-payload`.

---

## GET `/api/Diagnostics/ping`

No database.

**Response 200**

```json
{
  "utcNow": "2026-09-29T11:00:00Z",
  "serverTicks": 638942760000000000
}
```

---

## GET `/api/Diagnostics/db-ping?count=20`

`count` clamped 1–100.

**Response 200**

```json
{
  "count": 20,
  "sqlServer": { "count": 20, "minMs": 1.1, "avgMs": 2.0, "maxMs": 4.5, "p95Ms": 3.8 },
  "sqlite": { "count": 20, "minMs": 0.2, "avgMs": 0.4, "maxMs": 1.0, "p95Ms": 0.9 }
}
```

---

## GET `/api/Diagnostics/options`

Returns the first **50** entries of each picker list (same sources as the real transaction pages).

| Picker | Source (same as production UI) |
|--------|--------------------------------|
| vendors | `GET /api/Vendor/lookup` — supplier accounts (`AccountsChart.PARENTCode = 2140`); `id`/`code` = account code for `PurTransUpsertDto.VenId` |
| customers | `GET /api/Customer/lookup` — customer accounts (`PARENTCode = 1143`) |
| stores | `GET /api/Stor` paged list |
| items | `GET /api/ItemCatalog` paged catalog |
| movements | `GET /api/Movment/lookup?parentId=1` — purchase parent movements |

**Response 200**

```json
{
  "items": [{ "id": 1, "name": "Item name", "code": "ITM-001" }],
  "stores": [{ "id": 3, "name": "Main pharmacy", "code": "3101" }],
  "vendors": [{ "id": "2140001", "name": "Vendor name", "code": "2140001" }],
  "customers": [{ "id": 1001, "name": "Customer", "code": "1143001" }],
  "movements": [{ "id": 12, "name": "Purchase movement", "code": "101" }],
  "operations": [
    {
      "key": "Purchase.Create",
      "label": "Purchase — create draft",
      "needsVendor": true,
      "needsCustomer": false,
      "needsPharmacyScope": false,
      "needsStock": false,
      "needsMovement": true,
      "needsEmployee": false
    }
  ],
  "hasPharmacyScope": true,
  "pharmacyScopeMessage": null
}
```

---

## GET `/api/Diagnostics/lookup`

Search a picker by name or code (contains, case-insensitive).

**Query**

| Param | Required | Default | Notes |
|-------|----------|---------|-------|
| `kind` | yes | — | `vendor` \| `customer` \| `store` \| `item` \| `movement` |
| `q` | no | — | Search term; empty returns first `take` rows |
| `take` | no | 50 | Clamped 1–100 |

**Response 200** — array of `{ id, name, code }` (`id` is string; vendors use account code).

**Response 400** — unknown `kind` or missing `kind`.

Same **404** (disabled) and **403** (non-admin) rules as other diagnostics routes.

---

## Diagnostics error responses

When `Diagnostics:Enabled=true` and the caller is Admin/SuperAdmin, unhandled failures on `/api/Diagnostics/*` return **500**:

```json
{
  "message": "Human-readable exception message",
  "exceptionType": "System.InvalidOperationException",
  "innerMessage": "Optional inner exception message",
  "stackTop": [" at Alfa.service...", "..."]
}
```

Benchmark runs that throw put the same formatted text in `runs[].error` (does not abort the HTTP 200 response unless validation fails first).

Validation errors remain **400** with `{ "message": "..." }` — e.g. `repeat exceeds MaxRepeat (10).`, missing `vendorId`, `movmentRowId`, or `itemIds`.

Other API routes keep the generic production error message.

---

## POST `/api/Diagnostics/benchmark`

Runs real services in-process. **Creates real documents and changes stock.** Tags `[BENCH]`.

Does **not** wait for reporting jobs — poll `queue-lag` separately.

**Request body**

```json
{
  "operation": "Purchase.Create",
  "lines": 3,
  "repeat": 1,
  "itemIds": [101, 102],
  "storeId": 3,
  "vendorId": "VENDOR_ACC_CODE",
  "customerId": 1001,
  "movmentRowId": 12,
  "employeeId": 5,
  "stockIds": [501, 502],
  "destinationStoreId": 4,
  "salesServiceId": 1,
  "paymentMethodId": 2,
  "salesKindId": 1,
  "deliveryCodeOrPassword": "1234"
}
```

| Field | Required for |
|-------|----------------|
| `operation` | Always |
| `lines` | Always (≤ MaxLines) |
| `repeat` | Always (≤ MaxRepeat); stops early after 45s total → `truncated: true` |
| `itemIds` | Most create/update/post ops |
| `movmentRowId` | Purchase, Return, Inventory, PharmReceive, PharmStoreReturn send |
| `vendorId` | Purchase, PharmacyPurchase, Return (vendor account code) |
| `storeId` | Sales, StockTransfer, PharmStoreReturn |
| `stockIds` | Sales, SalesReturn, StockTransfer (optional — falls back to any stock in store) |
| `customerId` | SalesReturn (required); Sales optional |
| `employeeId` | Sales, SalesReturn |
| `destinationStoreId` | StockTransfer, PharmStoreReturn send |
| `salesServiceId` | Sales.Delivery |
| `paymentMethodId` | Sales.PaymentFinalize |
| `deliveryCodeOrPassword` | Sales with delivery |

**Response 200** — header `Server-Timing: total;dur=…, db;dur=…`

```json
{
  "operation": "Purchase.Create",
  "lines": 3,
  "truncated": false,
  "runs": [
    {
      "runIndex": 1,
      "phase": "cold",
      "serverMs": 842,
      "commandCount": 47,
      "saveChangesCount": 2,
      "dbWaitMs": 610,
      "transactionMs": 580,
      "n1Top": [{ "count": 10, "sql": "select ..." }],
      "jobKind": "PurchasePublish",
      "headerId": 456,
      "jobId": null,
      "error": null
    }
  ],
  "warmSummary": null
}
```

If a run fails, `error` is set and later repeats are skipped.

**Supported `operation` values**

- `Purchase.Create`, `Purchase.Update`, `Purchase.Post`
- `PharmacyPurchase.Create`, `PharmacyPurchase.Update`, `PharmacyPurchase.Post`
- `Sales.Create`, `Sales.Delivery`, `Sales.PaymentFinalize`
- `SalesReturn.Create`
- `Return.Create`, `Return.Update`, `Return.Post`
- `PharmacyReceive.Create`, `PharmacyReceive.Update`, `PharmacyReceive.Accept`
- `StockTransfer.Create`, `StockTransfer.Update`, `StockTransfer.Accept`
- `PharmacyStoreReturn.Send`, `PharmacyStoreReturn.Accept`
- `InventoryAdjustment.Create`, `InventoryAdjustment.Update`, `InventoryAdjustment.Post`

Accept operations return a clear `error` if pharmacy/store scope is missing (no scope faking).

---

## GET `/api/Diagnostics/queue-lag?jobKind=PurchasePublish&headerId=456&timeoutSeconds=60`

Polls `dbo.InventoryReportingJob` by identity `{jobKind}:{headerId}`.

`timeoutSeconds` clamped 1–60.

**Response 200**

```json
{
  "jobKind": "PurchasePublish",
  "headerId": 456,
  "queueStatus": "Completed",
  "queueLagMs": 1200,
  "jobId": 789,
  "lastError": null
}
```

`queueStatus`: `Completed` | `Failed` | `Pending` | `Timeout`

- **Timeout**: no job row found before timeout, or still pending after timeout.
- **Failed**: job row status Failed.

---

## GET `/api/Diagnostics/sample-payload`

Ready JSON for normal HTTP + `X-Diag: 1`.

**Query:** `operation`, `lines`, `itemIds[]`, `movmentRowId`, `vendorId` (`storeId` ignored)

Supported: `Purchase.Create`, `Return.Create`, `InventoryAdjustment.Create`

**Response 200**

```json
{
  "operation": "Purchase.Create",
  "payload": { "header": { "pthNotice": "[BENCH] purchase", "venBillNo": "BENCH-..." }, "details": [] },
  "targetRoute": "/api/PurTransH",
  "httpMethod": "POST"
}
```

---

## Error responses

| Status | When | Body |
|--------|------|------|
| 404 | Diagnostics disabled | empty |
| 401 | No user id in token | `{ "message": "User id not found in token." }` |
| 403 | Not Admin/SuperAdmin | `{ "message": "Only Admin roles can use diagnostics endpoints." }` |
| 400 | Validation | `{ "message": "..." }` |

Common 400 messages: `lines exceeds MaxLines (100).`, `repeat exceeds MaxRepeat (10).`, `Unsupported operation '...'.`, `vendorId is required.`, `movmentRowId is required.`, `Pharmacy scope is not configured...`

---

## `[BENCH]` tagging

| Document | Tag field |
|----------|-----------|
| Purchase / PharmacyPurchase | `header.pthNotice`, unique `header.venBillNo` |
| Return | `header.pthNotice`, unique `header.venBillNo` |
| Inventory | `header.invNotice` |
| PharmacyReceive | `header.monNote` |
| StockTransfer | `header.note` |
| PharmStoreReturn | `note` |
| Sales / SalesReturn | `CustomerName` → delivery contact; post-save `SalesTransH.SthNotice` update |

---

## Frontend flow

1. `GET options` — fill pickers.
2. Latency: loop `GET ping` (browser timing) + `GET db-ping`.
3. Benchmark: `POST benchmark` with `repeat: 1` → read `Server-Timing` + body metrics.
4. For each run with `jobKind` + `headerId`: `GET queue-lag` until Completed/Failed/Timeout.
5. Optional HTTP compare: `GET sample-payload` → `POST targetRoute` with `X-Diag: 1`.
