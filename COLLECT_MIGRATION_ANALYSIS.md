# Collect / Collection Voucher — Migration Analysis

**Status:** PHASE 1–4 complete (study only). **No API / Next.js changes in this phase.**  
**Sources studied (read-only):**
- `D:\alphaapp\AlphaApp\InterfaceApp\General Accounting\TreasuryIn.aspx`
- `D:\alphaapp\AlphaApp\InterfaceApp\General Accounting\TreasuryIn.aspx.cs`
- `D:\alphaapp\AlphaApp\InterfaceApp\Models\AccessData.cs`
- `D:\alphaapp\storprocedger and vew.sql` (`CollectedVoucherProc`, `AddLadger`, `ACCLeadger`, `ChartView`)
- Existing study notes under `D:\alphaapp\AlphaApp\study-docs\` (cross-checked against code; some notes were inaccurate)

**Naming correction:** There is **no** table named `CollectTable` in the old application. The collect header table is **`CollectedVoucher`**.

---

## Old Web Forms page

| Item | Value |
|------|--------|
| Page | `General Accounting\TreasuryIn.aspx` |
| Code-behind | `TreasuryIn.aspx.cs` |
| Menu meaning | Collection / Treasury In / Receipt voucher |
| Master | Site.Master |

---

## Relevant controls

### Header (main section)

| Control | Role |
|---------|------|
| `rdoReceiptType` | Payment method: Cash / Cheque / Transfer |
| `MultiView1` | Method-specific panel (Safe / Cheque / Transfer) |
| `drpSave` / `drpCurrency` | Cash: Safe NO. + currency leaf account |
| `drpCBank` / `drpCAccountNO` / `txtChequeNO` / `txtDueDate` | Cheque |
| `drpTBank` / `drpAccountNO` | Transfer |
| `drpSource` / `cmdSource` | Collected From type + party |
| `drpCostCenter` | Cost center (`accountshortcut`) |
| `txtAmount` / `txtDescription` / `txtTotalString` | Amount, description, Arabic words |
| `lblCurrency` / `lblRate` | Currency code + rate labels |
| `lblReceiptNO` / `lblREf` / `lblReceiptDate` | Receipt identity |
| `btnUpdate` | **Save new header** into `CollectedVoucher` (button text = "Update") |
| `btnNewReceipt` | Start new voucher (shows `btnUpdate`) |

### Detail / journal (bottom section)

| Control | Role |
|---------|------|
| `MultiView2` / `grdAccount` | Journal grid (shown after header save / read) |
| `drpType` | Debit / Credit |
| `cmdAccountNO` | Account picker from `ChartView where Receipt = 1` |
| Footer `btnAdd` | Add another journal row (`AddNewAccount`) |
| `lblTotalDebit` / `lblTotalCredit` | Running totals |
| `btnSaveAccount` | **Post to General Ledger** (button text also = "Update") |
| `btnCalc` | Recalc totals |

**UI naming trap:** Both header save and GL post are labeled **"Update"** in the ASPX. Behavior differs by handler.

---

## Save flow (header only) — `btnUpdate_Click`

```text
btnUpdate_Click
  ├─ Resolve SaveCode / BankCode / AccountNO / ChequeNO / DueDate by Type
  │     Cash (default):
  │       SaveCode  = drpSave
  │       AccountNO = drpCurrency
  │       BankCode  = 0, ChequeNO = "", DueDate = ""
  │     Cheque:
  │       require ChequeNO + DueDate
  │       BankCode  = drpCBank
  │       AccountNO = drpCAccountNO
  │       SaveCode  = 0
  │     Transfer:
  │       BankCode  = drpTBank
  │       AccountNO = drpAccountNO
  │       SaveCode  = 0
  ├─ Collected From:
  │     Other → CollectedCode="0", CollectedName=free text
  │     else  → SelectedValue / Selected Text
  ├─ Begin SqlTransaction
  ├─ ReceiptNO = Max(CollectedVoucher.ReceiptNO)+1
  ├─ RecRef:
  │     Cash → "CV-C" + Count(Type in Cash)+1
  │     Cheque/Transfer → "CV-B" + Count(Type in Cheque,Transfer)+1
  ├─ EXEC CollectedVoucherProc (19 params)  → INSERT CollectedVoucher
  ├─ On failure → Rollback + message
  └─ On success → Commit → ReadData(new ReceiptNO) → ReadJornal()
```

**Important:** `CollectedVoucherProc` is **INSERT-only**. There is no header UPDATE SP call on this page. "Update" = save a **new** receipt.

**Does NOT write GeneralLedger.** Journal appears only after save via `ReadJornal()`.

---

## Update / Post flow (journal) — `btnSaveAccount_Click`

```text
btnSaveAccount_Click
  ├─ CalcTotal()
  ├─ Validate: Total Debit string == Total Credit string
  │     else → "Total debit must be equal total credit , Actions Canceled"  STOP
  ├─ Validate: Debit and Credit not "0"
  │     else → "Total debit and Total credit not allow 0 value, Actions Canceled"  STOP
  ├─ Method extras for AddLadger:
  │     Cash:     TreasuryCode=SaveCode, DueDate=ReceiptDate, BankAccount="", ChequeNO=""
  │     Cheque:   TreasuryCode=0, DueDate=ChequeDueDate, ChequeNO=txtChequeNO, BankAccount=""
  │     Transfer: TreasuryCode=0, DueDate=ReceiptDate, BankAccount=Transfer AccountNO
  ├─ Begin SqlTransaction
  ├─ ACCOrder = Max(GeneralLedger.ACCOrder)+1  (shared for all lines of this post)
  ├─ For each grid DataRow:
  │     EXEC AddLadger (22 params), TransType = 'CJ'
  │     On failure → Rollback STOP
  ├─ UPDATE CollectedVoucher SET Approved = 1 WHERE ReceiptNO = ...
  └─ Commit → hide footer / disable further posting UI
```

Header and GL are **two separate transactions** (separate button clicks). They are **not** one combined transaction.

---

## CollectTable / CollectedVoucher flow

| Concept in prompt | Actual object |
|-------------------|---------------|
| CollectTable | **`CollectedVoucher`** (confirmed). `CollectTable` not found. |
| Save | `CollectedVoucherProc` INSERT |
| Approve / posted flag | Inline SQL `Approved = 1` after successful `AddLadger` loop |

Columns written by SP: ReceiptNO, RecRef, ReceiptDate, SaveCode, Amount, Currency, Rate, Type, VSource, CollectedCode, CollectedName, Description, AddedUser, AddedDate, ChequeNO, BankCode, DueDate, AccountNO, TotalString, CostCenter.

---

## Detail-row flow

### When journal UI appears

After header exists: `ReadData` → `ReadJornal()` (also after successful `btnUpdate`).

### If GL already exists for this receipt (`TransType = 'CJ'`)

Load from `GeneralLedger` + `AccountsChart`. Hide Add / Save Account. Show posted lines read-only style.

### If no GL yet — auto seed **one Debit row only**

```text
Type        = Debit
AccCode     = payment-method AccountNO (see Cash/Cheque/Transfer below)
AccName     = selected account display text
Description = txtDescription (header)
Amount      = txtAmount
AmountEGP   = Amount * Rate
```

Then `BindGridData()`:
- Filter in-memory `Accounts` DataTable by current user
- **First grid row Enabled = false** (cannot edit/delete easily like other rows; Delete still via select)
- Footer remains for adding more rows
- Footer description prefilled from header description

### Add row (`AddNewAccount` / footer Add)

User picks Debit/Credit, account from ChartView, description, amount.  
Validates: amount ≠ 0; account selected.  
AmountEGP = amount × rate.  
**No hard-coded max row count.**

### Initial second Credit row?

**Not in Web Forms.** Only **one Debit** row is auto-created. Credit (and extra Debits) are added manually via **Add**.

Prompt Part 2/4 (“two rows initially like Purchase”) does **not** match `TreasuryIn`. Marked for confirmation if product wants UX change.

---

## How Cash / Cheque / Transfer determine the Debit account

The Debit account is always the voucher’s **`AccountNO`** (and display name from the matching dropdown):

| Type | Account source control | Also stored on header |
|------|------------------------|------------------------|
| **Cash** | `drpCurrency` (child of Safe `drpSave`) | `SaveCode` = Safe; `AccountNO` = currency account |
| **Cheque** | `drpCAccountNO` (child of Cheque bank) | `BankCode` = bank; `AccountNO` = bank account; ChequeNO + DueDate |
| **Transfer** | `drpAccountNO` (child of Transfer bank) | `BankCode` = bank; `AccountNO` = bank account |

Account numbers are **not hard-coded**. They come from `AccountsChart` hierarchy:
- Safe parents: `PARENTCode IN (dbo.GetAccCode('Safe'))`
- Bank parents: `PARENTCode IN (dbo.GetAccCode('Bank'))`
- Children: `PARENTCode = selected Safe/Bank`

---

## Account Chart for journal lines (bottom ComboBox)

**Not** the full chart. ASPX SqlDataSource:

```sql
SELECT ACCCode, ACCCode + ' -' + ACCAName AS Name
FROM ChartView
WHERE Receipt = 1
```

`ChartView` (from SQL dump):

```sql
CREATE VIEW ChartView AS
SELECT * FROM AccountsChart A
WHERE ACCCode NOT IN (
  SELECT DISTINCT PARENTCode FROM AccountsChart WHERE PARENTCode IS NOT NULL
)
```

So: **leaf accounts** from `AccountsChart`, further filtered by column **`Receipt = 1`**.

`Receipt` / `Payment` are columns on `AccountsChart` (used by ChartView `SELECT *`). Exact seed values of `Receipt` flags:

```text
UNKNOWN — NEEDS CONFIRMATION (live data / AccountsChart.Receipt meaning)
```

Payment voucher (`TreasuryOut`) uses `ChartView WHERE Payment = 1` (mirror pattern).

---

## How description / amount are populated

| Field | Debit seed row | Extra rows (Add) | Written to GL |
|-------|----------------|------------------|---------------|
| Line notes (`Notes`) | Header `txtDescription` | Footer description | `@Notes` = grid description |
| GL `Description` | n/a at seed | n/a | Built at post: `"من حساب "` / `"إلى حساب "` + account name after `-` |
| Header note (`VNote`) | — | — | Always header `txtDescription` |
| Amount | Header amount | User-entered | `@Amount` = FC amount from grid |
| Depit/Credit | — | — | EGP amounts from `lblAmountEGP` (= Amount × Rate) |

---

## General Ledger flow

1. Client validates Debit == Credit (and non-zero).
2. One `SqlTransaction`.
3. Shared new `ACCOrder`.
4. Per grid row → `AddLadger` with `TransType = 'CJ'`.
5. Set `CollectedVoucher.Approved = 1`.
6. Commit or Rollback.

`AddLadger` body: single `INSERT INTO GeneralLedger (...)`.

### ACCLeadger

**View**, not a write target:

```sql
CREATE VIEW ACCLeadger AS
SELECT ... FROM GeneralLedger G
INNER JOIN AccountsChart C ON G.ACCcountCode = C.ACCCode
```

TreasuryIn never inserts into `ACCLeadger` directly. Reports read the view.

---

## Stored procedures

| Procedure | Role on this page |
|-----------|-------------------|
| **`CollectedVoucherProc`** | INSERT header (19 params) |
| **`AddLadger`** | INSERT one `GeneralLedger` line (22 params), TransType `CJ` |

Also used as SQL (not SP): Max ReceiptNO, RecRef counters, GetRate, GetAccCode, Approved update, journal SELECT.

`EditLadger` — **not** used by TreasuryIn.

---

## AccessData methods involved

| Method | Usage |
|--------|--------|
| `AccessData.getData(DataTable, sql)` | Loads, Max/Count, rates, chart lists, journal read |
| `AccessData.getData(..., Trans, Conn)` | Same inside transactions |
| `AccessData.AddnewData(proc, names, types, values, length, Trans, Conn, out Message)` | `CollectedVoucherProc`, `AddLadger` |
| `AccessData.BindEmptyRow` | Empty grid footer when no in-memory rows |
| `AccessData.AppConn` | Connection string for explicit transactions |

No dedicated Collect-specific class — all logic is code-behind + these helpers + SPs.

---

## Validation rules (confirmed)

| Rule | Where |
|------|--------|
| Cheque requires ChequeNO + DueDate | `btnUpdate_Click` before transaction |
| Debit total == Credit total | `btnSaveAccount_Click` **before** GL insert (code-behind; **not** inside SP) |
| Debit and Credit totals ≠ 0 | Same |
| Amount 0 not allowed on Add row | `AddNewAccount` |
| Account must be selected on Add | `AddNewAccount` |
| Comparison uses **formatted N2 strings** (`lblTotalDebit.Text != lblTotalCredit.Text`) | Fragile float compare via display text |

Difference label is **not** shown in old UI (only Total Debit / Total Credit).

---

## Transaction behavior

| Operation | Transaction? | Scope |
|-----------|--------------|--------|
| Header save | Yes | `CollectedVoucherProc` only |
| GL post | Yes | All `AddLadger` calls + `Approved=1` |
| Header + GL together | **No** | Separate user actions / separate transactions |

If any `AddLadger` fails → Rollback entire post (no partial GL; Approved stays previous value).

SPs themselves do **not** begin transactions; C# `SqlTransaction` does.

---

## Debit / Credit determination summary

| Moment | Behavior |
|--------|----------|
| Seed | Always **Debit** for payment-method account |
| Add footer | User chooses Debit or Credit (default list order starts with Debit) |
| Load posted | `CASE WHEN Depit > 0 THEN 'Debit' ELSE 'Credit' END` |
| Post | Debit → Depit=EGP, Credit=0; Credit → Credit=EGP, Depit=0 |

---

## Unclear points

```text
UNKNOWN — NEEDS CONFIRMATION
1. Whether product wants Next.js to start with TWO rows (Debit+Credit) like Purchase,
   despite Web Forms starting with ONE Debit only.
2. Exact business meaning / seed of AccountsChart.Receipt = 1 (which accounts appear).
3. Whether any DB trigger on GeneralLedger / CollectedVoucher exists beyond AddLadger
   (none found in studied SQL dump for this flow).
4. Whether header can ever be updated in-place elsewhere (this page only INSERTs).
5. Study-doc claim that header save and AddLadger share one transaction — CONTRADICTED
   by TreasuryIn.aspx.cs (two buttons, two transactions). Prefer code over that note.
```

---

## Migration implications (for later phases — do not implement yet)

1. Prefer reusing **`CollectedVoucherProc`** and **`AddLadger`** via API rather than rewriting inserts.
2. Keep Debit=Credit validation in **API** (old validation is only in UI code-behind).
3. Journal account source must honor **`ChartView` + `Receipt = 1`**, not invent a new filter.
4. Do not write to `ACCLeadger`; write `GeneralLedger` via `AddLadger`.
5. Posting must set **`Approved = 1`** in the same DB transaction as ledger inserts.
6. Next.js already has partial UI/API stubs (`CollectedVoucher`, `/post`, journal seed Debit) — reconcile against this analysis when implementation is approved.

---

## Implementation status (after confirmation)

Aligned with this analysis in Alfa API + Next.js (`D:\cursore test`):

| Item | Status |
|------|--------|
| Web Forms 1 Debit seed row (not 2 starter rows) | Done |
| `GET AccountsChart/receipt-leaves` (ChartView + Receipt=1) | Done |
| Post validates Debit == Credit (API authority) | Done |
| Post transaction: GL lines + `Approved=true` / rollback | Done |
| Cash/Cheque/Transfer TreasuryCode, BankAccount, ChequeNO | Done |
| GL Description built server-side (`من حساب` / `إلى حساب`) | Done |
| UI: Total Debit / Credit / Difference + Add New Row | Done |
| EF mirrors `AddLadger` INSERT (project convention; SPs not called from Alfa yet) | Done |

```text
UNKNOWN — still open: live AccountsChart.Receipt seed values in your DB
```

---

## Quick answer checklist (requested)

1. **Web Forms page:** `TreasuryIn.aspx` / `TreasuryIn.aspx.cs`
2. **AccessData methods:** `getData`, `AddnewData`, `BindEmptyRow`, `AppConn`
3. **Stored procedures:** `CollectedVoucherProc`, `AddLadger`
4. **Tables modified:** `CollectedVoucher` (insert + Approved update); `GeneralLedger` (insert via SP). `ACCLeadger` is a **view**.
5. **Cash account:** `drpCurrency` → stored as `AccountNO`; Safe as `SaveCode`
6. **Cheque account:** `drpCAccountNO` → `AccountNO`; bank as `BankCode`
7. **Bank Transfer account:** `drpAccountNO` → `AccountNO`; bank as `BankCode`
8. **Debit/Credit rows:** Auto one Debit from AccountNO; more rows via Add; Credit manual
9. **GL insert:** Loop `AddLadger` TransType `CJ` then `Approved=1`
10. **Debit=Credit validation:** `btnSaveAccount_Click` in code-behind (before SP calls)
11. **DB transaction:** Yes — separate tx for header save; separate tx for GL post+Approved
