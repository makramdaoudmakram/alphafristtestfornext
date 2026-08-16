# Payment Voucher — Migration Analysis & Parity

**Web Forms source:** `General Accounting/TreasuryOut.aspx(.cs)`  
**Next.js:** `/dashboard/payment-voucher` → `payment-voucher-page-content.tsx`  
**API:** `PaymentVoucherController` + `PaymentVoucherService`  
**Collect (do not change for this work):** `TreasuryIn` / `CollectedVoucher` / `collection-voucher-page-content.tsx`

## Business truth (Web Forms)

| Topic | Payment (`TreasuryOut`) | Collect (`TreasuryIn`) |
|--------|-------------------------|-------------------------|
| Header table / SP | `PaymentVoucher` / `PaymentVoucherProc` | `CollectedVoucher` / `CollectedVoucherProc` |
| GL `TransType` | `PJ` | `CJ` |
| Seeded first journal row | **Credit** (cash / payable / bank acct) | **Debit** |
| User-added balancing rows | **Debit** (default) | **Credit** (default) |
| Journal account list | `ChartView` / chart where `Payment = 1` | `Receipt = 1` |
| RecRef prefix | `PV-C` / `PV-B` | `CV-*` style |
| Party UI | Paid To (`PaidTo*` in UI; DB still `CollectedCode` / `CollectedName`) | Collected From |
| Cheque Account NO | Children of `GetAccCode('Payable')` | Children of selected bank |
| Bank Name | `GetAccCode('Bank')` parents | Same pattern |
| Safe / Cash | `GetAccCode('safe')` | Same |
| Attachments | `VoucherType = Payment` | `VoucherType = Collect` |

There is **no** `PayApol` entity in the old app. No shared parent table with Collect.

## Implemented flow (Next.js + API)

1. **Save header** → `POST api/PaymentVoucher` (validation → 400 on failure).
2. UI seeds **one locked Credit** from `AccountNO` (Cash currency / Payable cheque acct / Transfer bank acct).
3. User adds **Debit** row(s) from payment chart leaves.
4. **Update Voucher** → `POST api/PaymentVoucher/{id}/post` writes GL with `TransType = PJ`, sets `Approved = true`.
5. Navigation: `last`, `{id}/adjacent`, `{id}/journal`.
6. Attachments reuse `api/voucher-attachments` with `voucherType=Payment`, embedded in Cash/Cheque/Transfer details (same layout as Collect).

## Cheque Account NO (critical difference)

On bank select, Web Forms rebinds:

```sql
Select AccCode, ACCCode + ' -' + ACCAName AccAName
From AccountsChart
where PARENTCode in (dbo.GetAccCode('Payable'))
```

Next.js: `getPaymentPayableAccounts()` → env `NEXT_PUBLIC_GET_ACC_CODE_PAYABLE` if set, else `getAccountsByGroup("Payable")`.

## Env note

If cheque Account NO is empty on live DB (no `GetAccCode` / `ActionsCode`), set:

`NEXT_PUBLIC_GET_ACC_CODE_PAYABLE=<parent ACCCode>`

## Collect regression

Payment work must not alter Collect save/GL seeding. Collect remains Debit-seed / `CJ` / receipt-leaves / bank children for cheque.
