# Add Manual Journal — Migration Analysis

**Web Forms source of truth:** `General Accounting/AddManualJournal.aspx(.cs)`  
**UI reference:** Collect Voucher (Next.js)  
**Title in UI:** “Adjustment Voucher”

## Critical finding

There is **no** `ManualJournal` / `AdjustmentVoucher` header table.

Save writes **directly** into `dbo.GeneralLedger` via stored procedure `AddLadger`, inside one SQL transaction.

## Business rules (from code-behind)

| Rule | Source |
|------|--------|
| `TransType = 'AJ'` | `_ParamValue[1] = "AJ"` |
| Debit total must equal Credit total | `btnSaveAccount_Click` — message: `Total debit must be equal total credit , Actions Canceled` |
| Totals cannot be 0 | `Total debit and Total credit not allow 0 value, Actions Canceled` |
| ReceiptNO | `Max(ReceiptNO)+1` where `TransType='AJ'` |
| ACCOrder | shared for all lines: `Max(ACCOrder)+1` |
| REF | `YY-MM-###` monthly sequence of distinct AJ ReceiptNO |
| Rate | `dbo.GetRate(date, currency)`; AmountEGP = Amount × Rate |
| Line Description (GL) | Debit: `من حساب ` + name; Credit: `إلى حساب ` + name |
| Notes | row description; VNote = header description |
| TreasuryCode / Bank / Cheque | `"0"` / `""` / `""` |
| Accounts | `SELECT ACCCode, ACCCode + ' -' + ACCAName FROM ChartView` (all chart leaves) |
| Cost Center | Web Forms: `accountshortcut`; Next.js reuses Cost Centers |
| No draft header | Save = immediate post; after save grid is read-only |

## AccessData

- `getData`, `AddnewData("AddLadger", ...)`, `BindEmptyRow`, `AppConn`

## Existing Alfa API (reuse)

- `POST api/GeneralLedger/journal` → `CreateJournalAsync` (AJ, balanced, transaction)
- `GeneralLedger` entity / EF insert (AddLadger equivalent)
- CostCenter, AccountsChart

## Gaps closed in this migration

- AJ last / by ReceiptNO / adjacent / search
- `AccountsChart/chart-leaves` (full ChartView leaves)
- Currency list for header Rate
- Align validation messages + Arabic GL Description with Web Forms
- Next.js page `/dashboard/manual-journal`
