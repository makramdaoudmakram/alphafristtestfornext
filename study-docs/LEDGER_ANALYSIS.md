# Ledger Analysis

Source of truth: Web Forms `General Accounting/Ledger.aspx` + `Ledger.aspx.cs` + view `dbo.ACCLeadger` + RDLC `Reports/GeneralLedgerView.rdlc`.

This document records **confirmed** behavior from that code. Anything not confirmed is marked **UNCLEAR**.

---

## 1. Original Web Forms Ledger page

- **Page:** `AlphaApp/InterfaceApp/General Accounting/Ledger.aspx`
- **Code-behind:** `Ledger.aspx.cs`
- **Report:** `Reports/GeneralLedgerView.rdlc` (ReportViewer local mode)
- **Dataset table:** typed `LocalDB.ACCLeadger` filled by `AccessData.getData(ReportTable, CMD)`
- **Excel/print:** ReportViewer built-in export (Excel/PDF/print). No separate Excel generator.

Filters on the page:

| Control | Label | Required in Web Forms |
|---|---|---|
| `txtFrom` / `txtTo` | Transaction Date From / To | Used for period + opening; not independently validated as a pair except To >= From when From is filled |
| `txtDFrom` / `txtDTo` | Due Date From / To | Optional |
| `drpParentAccount` | Parent Account (tree, checkboxes, `CheckChildNodes`) | Optional |
| `lstAccount` | Accounts List (multi checkbox combo) | **Required if no parent is checked** |
| `drpCostCenter` | Cost Center | Optional, **single** value |

Web Forms will **not** run with only dates: if no parent nodes are checked and no accounts are checked, it shows `"Account not selected"`.

**New Next.js requirement (intentional change):** Start Date + End Date alone must run the full ledger.

---

## 2. Existing API / database sources

- **Table:** `dbo.GeneralLedger` (EF `ApplicationDbContext.GeneralLedger`)
- **Chart:** `dbo.AccountsChart` (`ACCCode` PK, `PARENTCode`, `ACCName`, `ACCAName`)
- **View used by Web Forms report:** `dbo.ACCLeadger`
- **Alfa API today:** `GeneralLedgerController` has CRUD, journal search/edit, AJ (manual journal). **No Ledger report endpoint existed.**

---

## 3. Stored procedures

Ledger **report** does **not** call a stored procedure.

Related write SPs (not used by this page):

- `dbo.AddLadger` — insert ledger lines from vouchers/journals
- `dbo.EditLadger` — update a line

---

## 4. Views / functions

### `dbo.ACCLeadger`

```sql
SELECT G.transno, G.ACCcountCode,
       C.ACCAName AS AccountName, C.ACCName, C.ACCAName,
       G.TransDate, G.TransType, G.ReceiptNO, G.Currancy, G.Rate,
       iif((G.Credit + G.Credit1) > 0, G.Amount * -1, G.Amount) Amount,
       G.Depit, G.Credit, G.Depit1, G.Credit1, G.Notes, G.DueDate, REF, CostCenter
FROM GeneralLedger G
INNER JOIN AccountsChart C ON G.ACCcountCode = C.ACCCode
```

Notes:

- Account display name in the view is **`ACCAName`** (as `AccountName`).
- `Amount` is negated when the line is a credit (`Credit + Credit1 > 0`).
- Join is inner: ledger rows whose `ACCcountCode` is missing from AccountsChart are excluded.

### `dbo.ChartView`

Leaf accounts: `ACCCode` not used as anyone's `PARENTCode`.

Parent tree on the page loads parents only:

```sql
SELECT ACCCode, iif(ParentCode = '', NULL, ParentCode) PARENTCode, ACCAName, ...
FROM AccountsChart A
WHERE ACCCode IN (SELECT DISTINCT PARENTCode FROM AccountsChart WHERE PARENTCode IS NOT NULL)
```

---

## 5. Input parameters (Web Forms SQL)

Built in `ImageButton1_Click`:

- Period filter (`Filter`) from **TransDate** between `txtFrom` and `txtTo` (style 103 `dd/MM/yyyy`), **unless** due dates are filled (see §15).
- Cost center: `and Costcenter = '{pharm_code}'` (single). Empty = no cost-center predicate.
- Accounts: `IN (...)` list of `ACCCode` values.
- Opening always uses `convert(Date,transDate,103) < convert(Date, txtFrom, 103)` plus the same cost-center predicate.

---

## 6. Output fields (RDLC)

Columns confirmed in `GeneralLedgerView.rdlc`:

- Account header: `ACCcountCode + " " + AccountName`
- Date (`TransDate`)
- Due Date
- Description (`Notes`)
- Amount (signed view amount)
- Costcenter
- Debit (`Depit`, unofficial `Depit1` included in running formula)
- Credit (`Credit` / `Credit1`)
- Balance (running value)
- TransType / ReceiptNO appear in the dataset; **UNCLEAR** whether every extra field is visible in every RDLC row layout.

Grouping in RDLC:

1. `ACCcountCode` (group name `AccountName`)
2. `Currancy`
3. Detail rows sorted by `TransDate`

Cost center is a **column**, not an RDLC row group.

---

## 7. Opening balance calculation (confirmed)

Synthetic rows with `TransType = 'OB'`, `TransNO = 0`, `ReceiptNO = 0`.

Aggregated from `ACCLeadger` **before** Start Date:

```text
SUM(Depit), SUM(Credit), SUM(Depit1), SUM(Credit1), SUM(Amount)
GROUP BY ACCcountCode, AccountName, ACCName, ACCAName, Currancy, Costcenter
```

(Parent-account SQL also groups `Rate`; account-list SQL uses `AVG(Rate)`.)

Opening is **not** “balance as a single number stored in the database”. It is the **sum of prior ledger lines**, then the RDLC running formula is applied starting with that OB row.

Opening does **not** use Due Date.

---

## 8. Debit calculation (confirmed)

Line debit shown/used as official + unofficial:

```text
Depit + Depit1
```

Same as Journal page.

---

## 9. Credit calculation (confirmed)

```text
Credit + Credit1
```

---

## 10. Running balance formula (confirmed — RDLC)

```text
RunningValue( (Depit + Depit1) - (Credit + Credit1), Sum, "AccountName" )
```

Scope = account group (`ACCcountCode`).

**Do not invert this to Credit − Debit.** Trial-balance style SPs in the same database use Credit − Debit; the Ledger RDLC does **Debit − Credit**.

---

## 11. Final / closing balance (confirmed)

There is no separate SQL for closing. Final balance is the last running value after the last row in the group (OB + period rows).

---

## 12. Account filtering (Web Forms)

- Account list is loaded from `Select distinct ACCcountCode, ACCcountCode + ' - ' + AccountName From ACCLeadger` (accounts that already have ledger rows).
- If parent tree has **no** checked nodes, selected `lstAccount` values are required and used as `IN (...)`.
- If parent tree **has** checked nodes, **account list is ignored**.

---

## 13. Parent account logic (confirmed)

Recursive CTE `tableR`:

```sql
WITH tableR (parent, idElement) AS (
  SELECT distinct e.PARENTCode, e.ACCCode
  FROM AccountsChart e
  WHERE PARENTCode IN ( <checked parent codes> )
  UNION ALL
  SELECT e.PARENTCode, e.ACCCode
  FROM AccountsChart e
  INNER JOIN tableR d ON e.PARENTCode = d.idElement
)
```

Then only **leaf** `idElement` values:

```sql
idElement NOT IN (
  SELECT parentcode FROM AccountsChart WHERE PARENTCode IS NOT NULL
)
```

(Period SQL uses `PARENTCode <> ''` instead of `IS NOT NULL` — same intent, slight inconsistency.)

The selected parent **itself** is not included unless it also appears as a child in the CTE. Typically parents are non-leaves and are excluded.

Hierarchy is **multi-level** (grandchild supported).

---

## 14. Cost Center logic

- Web Forms: **one** cost center (`accountshortcut.pharm_code`), or all if “Select Costcenter”.
- Stored as `GeneralLedger.CostCenter` (string **code**, not numeric id).
- Alfa Cost Center entity: `id`, `Code`, `Name`. Comboboxes already use **Code**.

**NEW BEHAVIOR (requested):** zero, one, or many cost center **codes** (`IN (...)`). Empty = all.

---

## 15. Due Date logic (confirmed — and surprising)

If `txtDFrom` is filled:

- `txtDTo` must also be filled and `DFrom <= DTo`.
- **`Filter` is replaced** (not appended): period rows use `DueDate BETWEEN DFrom AND DTo` and **drop** the TransDate between-filter.
- Report header switches to the due-date range.
- Opening balance **still** uses `TransDate < txtFrom` (transaction start date).

If due dates are empty: no Due Date predicate.

---

## 16. Excel export (Web Forms)

ReportViewer export of the same `ACCLeadger` result set. Next.js has no Excel library; export the **current filtered report** as Excel-compatible CSV/UTF-8.

---

## 17. Parent Account + Accounts List together

Web Forms: parent **overrides** (ignores) the account list.

**NEW BEHAVIOR — requires approval (implemented as UNION):**

- Parent selected → include all descendant **leaf** accounts.
- Accounts list selected → include those accounts.
- Both selected → **union** of the two sets (do not drop parent descendants).
- Neither selected → all accounts (required so dates-only reports work).

---

## 18. Gaps / UNCLEAR

- Exact visual order of every RDLC column vs. screenshot of a printed report.
- Whether unofficial `Depit1`/`Credit1` are shown as separate columns or only folded into running balance (formula folds them in).
- Opening SQL uses `txtFrom` even if the user filled only due dates; Next.js requires Start/End dates always, so this edge case is avoided.
- RDLC running balance is per **account**, not per cost center. Opening SQL **does** group by Costcenter. New page runs the same Debit−Credit formula **per Cost Center + Account + Currency** so multiple cost centers do not mix one running total.

---

## 19. Next.js / API mapping (implementation)

| Web Forms | New |
|---|---|
| `ACCLeadger` view | EF `GeneralLedger` + `AccountsChart` join (same fields) |
| `AccessData.getData` + string SQL | Parameterized EF queries |
| One cost center | `costCenters: string[]` |
| Account required | Dates required; accounts optional |
| ReportViewer Excel | Client export of the returned report |
