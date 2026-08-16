# Voucher Documents / Attachments — Phase 1 Analysis

**Status:** Analysis only. No code, migration, or database changes were made.  
**Date:** 2026-08-16  
**Scope:** Collect Voucher (`CollectedVoucher`) and Paid Voucher (`PaymentVoucher`).

---

## 1. Executive summary

| Question | Finding |
|----------|---------|
| Same parent table for Collect & Paid? | **No** — two separate tables |
| Common voucher identifier? | **No shared Id.** Each table has its own `ReceiptNO` (int Identity) |
| Business reference? | `RecRef` — different prefixes: `CV-*` vs `PV-*` |
| Existing attachment feature? | **None** for vouchers |
| Existing file upload pattern? | Excel import only (`ExcelController` + `IFormFile`) |
| Persistent disk pattern? | `AuditFileStorage` / `ReportingFileStorage` under API `ContentRootPath` via `appsettings` |
| Next.js Collect page? | Yes — `/dashboard/collection-voucher` |
| Next.js Paid page? | **Does not exist yet** (API only) |
| Store binaries in SQL? | Must **not** — project has no blob columns for vouchers; design should use disk + metadata table |

---

## 2. Collect Voucher (CollectedVoucher)

### 2.1 Entity / model

| Item | Value |
|------|--------|
| File | `Alfa/Models/CollectedVoucher.cs` |
| Table | `dbo.CollectedVoucher` |
| **PK** | `ReceiptNO` (`int`, SQL Server **Identity**) |
| Business ref | `RecRef` (`nvarchar(50)`, nullable) — e.g. `CV-C2`, `CV-B1` |
| Soft “posted” flag | `Approved` (`bool?`) |
| User field style | `AddedUser` (`string?`) — **username string**, not int user Id |

Key fields: `ReceiptDate`, `SaveCode`, `Amount`, `Currency`, `Rate`, `Type` (Cash/Cheque/Transfer), `VSource`, `CollectedCode`, `CollectedName`, `Description`, `ChequeNO`, `BankCode`, `DueDate`, `AccountNO`, `TotalString`, `CostCenter`.

There is **no** `AddedDate` / `CreatedAt` on the entity today.

### 2.2 DTOs

| File | Types |
|------|--------|
| `Alfa/DTO/CollectedVoucher_DTO.cs` | `CollectedVoucherUpsertDto`, `CollectedVoucherDetailDto`, plus shared post/journal DTOs (`VoucherPostDto`, `VoucherLedgerLineDto`, `VoucherJournalLineDto`, …) |

Create/update body does **not** include `ReceiptNO` or `Approved` (set by service).

### 2.3 Controller

| Item | Value |
|------|--------|
| File | `Alfa/Controllers/CollectedVoucherController.cs` |
| Route | `api/CollectedVoucher` |
| Auth attribute | **None** (`[Authorize]` not applied) |

Endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Paged list |
| GET | `/last` | Latest by `ReceiptNO` |
| GET | `/{id}/adjacent` | Navigation |
| GET | `/{id}/journal` | GL lines (`TransType = CJ`) |
| GET | `/{id}` | By `ReceiptNO` |
| POST | `/` | Create header |
| PUT | `/{id}` | Update header (blocked if approved) |
| POST | `/{id}/post` | Post journal + set `Approved = true` |

### 2.4 Service — save / update / ID generation

| Item | Value |
|------|--------|
| Interface | `Alfa/service/CollectedVoucher/ICollectedVoucherService.cs` |
| Implementation | `Alfa/service/CollectedVoucher/CollectedVoucherService.cs` |

**Create (`CreateAsync`):**

1. Validates header (date, method, amount, TotalString, description, Cash/Cheque/Transfer rules, Collected From).
2. Sets `Approved = false`.
3. Assigns `RecRef` (client value or generated).
4. EF `Add` + `SaveChanges` → **identity assigns `ReceiptNO`**.

**RecRef generation:**

```text
Cash              → "CV-C" + (count of Type == Cash) + 1
Cheque / Transfer → "CV-B" + (count of Cheque|Transfer) + 1
```

**Update:** Allowed only if not approved.  
**Post:** Inserts `GeneralLedger` rows with `TransType = "CJ"`, then `Approved = true`. EF only — **no stored procedure call**.

### 2.5 Database / migrations / SPs

| Item | Finding |
|------|---------|
| DbSet | `ApplicationDbContext.CollectedVoucher` |
| Create migration | `Migrations/ApplicationDb/20260815121210_account.cs` |
| Widen strings | `20260816120000_WidenCollectedVoucherStringColumns.cs` |
| Stored procedures | **Not used by new API.** Old Web Forms used `CollectedVoucherProc` + `AddLadger` (documented in `COLLECT_MIGRATION_ANALYSIS.md` only). |

### 2.6 Next.js

| Item | Path / note |
|------|-------------|
| Page | `src/app/dashboard/collection-voucher/page.tsx` |
| UI | `src/components/admin/collection-voucher-page-content.tsx` |
| Types | `src/types/collected-voucher.ts` |
| API client | `src/lib/api-client.ts` (`createCollectedVoucher`, `postCollectedVoucher`, journal/nav helpers) |
| Route permission | `route-permissions.ts` → `null` (no page permission gate) |
| Sidebar | Collection Voucher under Accounts |

Auth on client: Bearer JWT from session (`apiFetch`).

### 2.7 Authentication / authorization (current)

- API has JWT configured globally in `Program.cs`.
- **No fallback policy** requiring auth for all controllers.
- `CollectedVoucherController` has **no** `[Authorize]` and **no** permission checks.
- Contrast: `ExcelController`, `UsersController`, `PermissionsController` use `[Authorize]` (+ permission service where needed).

**Implication for documents:** Attachment endpoints should **introduce** authorization (at least `[Authorize]` + verify voucher exists + voucher-type/id ownership check). Do not inherit the current open voucher controller pattern for file download.

---

## 3. Paid Voucher (PaymentVoucher)

### 3.1 Entity / model

| Item | Value |
|------|--------|
| File | `Alfa/Models/PaymentVoucher.cs` |
| Table | `dbo.PaymentVoucher` |
| **PK** | `ReceiptNO` (`int`, Identity) — **separate sequence from Collect** |
| Business ref | `RecRef` — e.g. `PV-C1`, `PV-B1` |
| Shape | Near-identical column set to `CollectedVoucher` |

### 3.2 DTOs / controller / service

| Item | Path |
|------|------|
| DTOs | `Alfa/DTO/PaymentVoucher_DTO.cs` |
| Controller | `Alfa/Controllers/PaymentVoucherController.cs` → `api/PaymentVoucher` |
| Service | `Alfa/service/PaymentVoucher/PaymentVoucherService.cs` |
| Auth | **None** on controller (same as Collect) |

Endpoints present: paged GET, GET by id, POST create, PUT update, POST `{id}/post`.  
**Missing vs Collect:** `/last`, `/{id}/adjacent`, `/{id}/journal`.

**RecRef:**

```text
Cash     → "PV-C" + count(Cash) + 1
Non-cash → "PV-B" + count(Cheque|Transfer|TRansfer) + 1
```

**Post:** `GeneralLedger` with `TransType = "PJ"`, then `Approved = true`.

Validation is **lighter** than Collect (fewer required-header checks).

### 3.3 Next.js

| Item | Finding |
|------|---------|
| Paid / Payment voucher page | **Not implemented** |
| API client helpers | **None** for PaymentVoucher |
| Types | **None** |
| Sidebar entry | **None** |

Phase later for UI: Collect can get Attachments immediately; Paid needs either a new page first or Attachments only after Paid UI exists.

---

## 4. Relationship between Collect and Paid

```text
dbo.CollectedVoucher          dbo.PaymentVoucher
  PK ReceiptNO (Identity)       PK ReceiptNO (Identity)
  RecRef CV-C* / CV-B*          RecRef PV-C* / PV-B*
         │                              │
         │   NO FK / NO shared parent   │
         └──────────┬───────────────────┘
                    │
                    ▼
            dbo.GeneralLedger
         (ReceiptNO stored as string on GL rows;
          TransType CJ vs PJ distinguishes source)
```

**Critical for documents:**  
`VoucherId` alone is **ambiguous** (both tables can have `ReceiptNO = 4`).  
Documents **must** store **`VoucherType` + `VoucherId`** (e.g. `Collect`/`Payment` + `ReceiptNO`), or use `RecRef` plus type. Prefer **type + ReceiptNO** because PK is stable and used by APIs.

There is **no** common voucher base table or inheritance in EF.

---

## 5. Existing file / upload conventions (project)

| Feature | Pattern |
|---------|---------|
| Excel import | `[Authorize]`, `IFormFile`, extension check (`.xlsx`/`.xlsm`), empty-file check |
| Audit logs | `AuditFileSettings.FolderPath` under `ContentRootPath` (`AuditLogs/`) |
| Reporting logs | `ReportingFileSettings.FolderPath` (`ReportingLogs/`) |
| Static files | **No** `UseStaticFiles` for user uploads in `Program.cs` |
| Multipart size | **No** dedicated voucher upload size config today |
| Vercel | Frontend on Vercel — **must not** store permanent files in Next.js / Vercel FS |

**Conclusion:** Attachments should be handled by the **Alfa API host** (persistent disk or future blob storage), configured like `AuditFileSettings` via `appsettings`.

---

## 6. Project conventions relevant to a future `VoucherDocument` model

| Convention | Observed practice | Recommendation for documents |
|------------|-------------------|------------------------------|
| PK naming | Mixed: `ReceiptNO`, `CostCenter.id`, etc. | Prefer clear `VoucherDocumentId` (`int` Identity) |
| User identity | Vouchers use `AddedUser` **string** (name/email), not int FK | Prefer `UploadedBy` as `string?` to match vouchers; optional later link to Identity |
| Dates | `DateTime?` on vouchers | `UploadedDate` as `DateTime` (UTC) non-null on insert |
| Strings | `[MaxLength]` on codes/names | MaxLength on type, file names, content type, path |
| Nullable | Most business fields nullable | Require metadata fields that identify the file |
| Table naming | Entity ≈ table (`CollectedVoucher`) | Table `VoucherDocuments` or entity `VoucherDocument` → pluralize via EF |
| No binary in SQL | No voucher file blobs today | Metadata only |
| Auth | Opt-in `[Authorize]` | **Require** auth on document endpoints |

---

## 7. Proposed design (for approval — **not implemented**)

### 7.1 Proposed entity (adapted to conventions)

```csharp
// Proposed — do not implement until approved
public class VoucherDocument
{
    [Key]
    public int VoucherDocumentId { get; set; }

    /// <summary>Parent voucher PK (CollectedVoucher.ReceiptNO or PaymentVoucher.ReceiptNO).</summary>
    public int VoucherId { get; set; }

    /// <summary>"Collect" | "Payment" (required discriminator).</summary>
    [MaxLength(20)]
    public string VoucherType { get; set; } = string.Empty;

    /// <summary>Optional display aid; not a substitute for Type+Id.</summary>
    [MaxLength(50)]
    public string? VoucherRef { get; set; }

    [MaxLength(260)]
    public string OriginalFileName { get; set; } = string.Empty;

    [MaxLength(80)]
    public string StoredFileName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string FilePath { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    public long FileSize { get; set; }

    public DateTime UploadedDate { get; set; }

    /// <summary>Matches voucher AddedUser style (username/email string).</summary>
    [MaxLength(50)]
    public string? UploadedBy { get; set; }
}
```

**Note:** Suggested starter used `int? UploadedBy`. Project vouchers use **string** user names → recommend `string? UploadedBy` instead.

### 7.2 Proposed table

```text
dbo.VoucherDocuments
────────────────────
VoucherDocumentId  int IDENTITY PK
VoucherId          int NOT NULL          -- ReceiptNO of parent
VoucherType        nvarchar(20) NOT NULL -- Collect | Payment
VoucherRef         nvarchar(50) NULL     -- e.g. CV-C2 (optional)
OriginalFileName   nvarchar(260) NOT NULL
StoredFileName     nvarchar(80) NOT NULL
FilePath           nvarchar(500) NOT NULL
ContentType        nvarchar(100) NOT NULL
FileSize           bigint NOT NULL
UploadedDate       datetime2 NOT NULL
UploadedBy         nvarchar(50) NULL

Index: (VoucherType, VoucherId)
```

**No EF FK** to both parents (two tables). Enforce existence in service:

```text
if VoucherType == Collect → CollectedVoucher must exist
if VoucherType == Payment → PaymentVoucher must exist
```

Relationship:

```text
CollectedVoucher (1) ──< VoucherDocuments (many)   where VoucherType = 'Collect'
PaymentVoucher   (1) ──< VoucherDocuments (many)   where VoucherType = 'Payment'
```

Unlimited rows per voucher (0..N). **Never** File1/File2 columns.

### 7.3 File storage location (API server)

Config style (proposed `appsettings`):

```json
"VoucherDocumentSettings": {
  "FolderPath": "uploads/vouchers",
  "MaxFileSizeBytes": 10485760,
  "AllowedExtensions": [ ".pdf", ".jpg", ".jpeg", ".png" ],
  "AllowedContentTypes": [
    "application/pdf",
    "image/jpeg",
    "image/png"
  ]
}
```

Physical layout example:

```text
{ContentRoot}/uploads/vouchers/
  collect/{ReceiptNO}/
    {guid}.pdf
  payment/{ReceiptNO}/
    {guid}.jpg
```

Prefer **ReceiptNO** folders for stability; optionally also include `RecRef` in path for humans.  
`StoredFileName` = GUID + original extension. Never trust client filename for disk name.

**Do not** use Vercel / Next.js filesystem for permanent storage.

### 7.4 Proposed API endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/VoucherDocuments` | Multipart: `voucherId`, `voucherType`, `file` → save file + metadata |
| GET | `/api/VoucherDocuments/{voucherType}/{voucherId}` | List metadata for voucher |
| GET | `/api/VoucherDocuments/{id}/download` | Authenticated stream/download |
| DELETE | `/api/VoucherDocuments/{id}` | Delete file + metadata |

All should use `[Authorize]`. Before upload/list/download/delete: verify voucher exists for that type and (later) user permission.

Allowed types initially: PDF, JPG, JPEG, PNG. Reject empty / oversized / wrong MIME / wrong extension.

### 7.5 Save / upload workflow (proposed)

**Preferred (safe for new vouchers):**

```text
1. User fills voucher → Save header (existing POST CollectedVoucher / PaymentVoucher)
2. ReceiptNO now exists
3. User adds N documents → POST VoucherDocuments each with Type + ReceiptNO
4. UI refreshes list from GET
```

**If UI allows picking files before first save:**

```text
Hold files in browser memory/temp UI state
→ Save voucher first
→ Then upload pending files
→ Surface per-file errors clearly (do not silent-success)
```

Do **not** change existing Create/Update/Post accounting methods. Attachments are a parallel feature.

Opening existing voucher: load documents by `(Collect|Payment, ReceiptNO)` and show View / Download / Delete / Add.

### 7.6 Next.js UI (proposed — after API)

- Collect: new **Attachments** card on `collection-voucher-page-content.tsx` (match ERP cards).
- Paid: only after Payment voucher page exists (or build Paid page + attachments together later).

---

## 8. Risks & decisions to confirm before Phase 2+

1. **`VoucherType` values:** recommend `"Collect"` and `"Payment"` (stable English codes).  
2. **`UploadedBy` type:** recommend `string?` (match `AddedUser`), not `int?`.  
3. **Auth:** document APIs must be authorized even though voucher controllers currently are not.  
4. **Paid UI gap:** API can support Payment documents immediately; Next.js Paid page is missing.  
5. **Folder key:** `ReceiptNO` vs `RecRef` — recommend `ReceiptNO` (unique per type, immutable).  
6. **Approved vouchers:** allow add/delete documents after post, or lock when `Approved`? **Needs product decision** (accounting logic unchanged either way).  
7. **Migration target DB:** live `aghapany_AlphaAPI` historically lacked `__EFMigrationsHistory` — confirm how migrations are applied before Phase 14.

---

## 9. Phase 1 verification checklist

- [x] Collect model / DTO / controller / service / PK / RecRef studied  
- [x] Paid model / DTO / controller / service / PK / RecRef studied  
- [x] Confirmed **separate tables**, no shared parent  
- [x] Confirmed numbering: `CV-C`/`CV-B` vs `PV-C`/`PV-B`  
- [x] Confirmed no existing voucher attachments  
- [x] Confirmed Excel + ContentRoot file-storage patterns  
- [x] Confirmed Next.js Collect page exists; Paid page does not  
- [x] Proposed entity / table / API / storage / workflow documented  
- [ ] **Awaiting approval before any implementation, migration, or DB change**

---

## 10. Explicit non-actions (this phase)

- No new C# classes created  
- No `DbSet` added  
- No EF migration created or applied  
- No API endpoints added  
- No Next.js UI changes  
- No database tables created  
- No accounting / GL / voucher Save-Update logic changed  

**Next step after your OK:** Phase 2+ implementation starting with `VoucherDocument` entity + settings + migration, then API, then Collect UI (and Paid when ready).
