# Pending Voucher — Migration Analysis

**Status:** Study complete from Web Forms sources (source of truth).  
**Sources:**
- `General Accounting/PendingVoucher.aspx`
- `General Accounting/PendingVoucher.aspx.cs`
- Related open targets: `TreasuryOut.aspx?ReceiptNO=` / `TreasuryIN.aspx?ReceiptNO=`

## Pending rule (exact)

```sql
-- Payment (grdPV)
Select ReceiptNO, ReceiptDate, Amount, Currency, Type, VSource, PaidToName
From PaymentVoucher
where Approved = 0

-- Collection (grdCV)
Select ReceiptNO, ReceiptDate, Amount, Currency, Type, VSource, CollectedName
From CollectedVoucher
where Approved = 0
```

**No stored procedure.** Inline SQL via `AccessData.getData`.

Pending **is** `Approved = 0` / `Approved = false` (set false on create; set true on post/Update journal in TreasuryIn/Out).

## Layout

1. **Top:** Payment Voucher grid (`grdPV`, caption "Payment Voucher")
2. **Bottom:** Collection Voucher grid (`grdCV`, caption "Collection Voucher")

## Selection

- Payment select → `TreasuryOut.aspx?ReceiptNO={ReceiptNO}` (new tab)
- Collection select → `TreasuryIN.aspx?ReceiptNO={ReceiptNO}` (new tab)
- Identifier is **ReceiptNO** (grid cell after Select button), not row index.

## EF / API note

Web Forms Payment column `PaidToName` maps to EF `PaymentVoucher.CollectedName` (same physical party-name field used by current Payment API DTO).
