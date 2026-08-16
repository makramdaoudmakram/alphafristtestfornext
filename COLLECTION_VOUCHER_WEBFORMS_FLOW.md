# Collection Voucher — Web Forms Event Flow Analysis

**Source studied:** `D:\alphaapp\AlphaApp\InterfaceApp\General Accounting\TreasuryIn.aspx` + `TreasuryIn.aspx.cs`  
**Study docs:** `D:\alphaapp\AlphaApp\study-docs` (`02D_Functions.md`, `04B_Controls.md`, `04A_Forms.md`)  
**Implementation target:** `D:\cursore test` only  

---

## Control map (ASP.NET → meaning)

| ASP.NET control | UI meaning | Notes |
|-----------------|------------|--------|
| `rdoReceiptType` | Payment Method | Cash / Cheque / Transfer; default Cash (`Selected="True"`) |
| `MultiView1` | Right-side panel | View 0 = Safe, 1 = Cheque, 2 = Transfer |
| `drpSave` | Safe NO. | Cash only |
| `drpCurrency` | Currency account under Safe | Cash only (label “Currency”, values = child accounts) |
| `drpCBank` / `drpCAccountNO` | Cheque Bank / Account | Cheque only |
| `drpTBank` / `drpAccountNO` | Transfer Bank / Account | Transfer only |
| `drpCostCenter` | Cost Center | `accountshortcut` |
| `drpSource` / `cmdSource` | Collected From type / party | Customer / Supplier / Other |
| `lblCurrency` / `lblRate` | Display currency + rate | Not the Safe “Currency” dropdown |
| `btnUpdate` | Save voucher header | `CollectedVoucherProc` |
| `btnSaveAccount` | Post GL | `AddLadger` TransType `CJ` |

---

## 1. Page_Load flow

**Method:** `Page_Load` — `TreasuryIn.aspx.cs` lines 17–77  
**Condition:** `if (!IsPostBack)` only.

```text
Page_Load (!IsPostBack)
  ├─ Auth check → redirect Login if needed
  ├─ Init static DataTable Accounts columns (GL scratch)
  ├─ Bind drpSave (Safe NO.)
  │     SQL: Select ACCCode, ACCAName From AccountsChart
  │          where PARENTCode in (dbo.GetAccCode('Safe'))
  │     Text=ACCAName, Value=ACCCode
  │     OnDataBound → drpSave_DataBound → ReadSavingData()
  │         → loads drpCurrency children of first/current Safe
  ├─ Bind drpCBank (Cheque Bank Name)
  │     SQL: PARENTCode in (dbo.GetAccCode('Bank'))
  │     OnDataBound → drpCBank_DataBound → loads drpCAccountNO for selected bank
  ├─ Bind drpTBank (Transfer Bank Name)
  │     SQL: PARENTCode in (dbo.GetAccCode('Bank'))   ← SAME bank filter as Cheque
  │     OnDataBound → drpTBank_DataBound → loads drpAccountNO for selected bank
  ├─ Bind drpCostCenter
  │     SQL: SELECT pharm_code, pharmname FROM accountshortcut
  │     Text=pharmname, Value=pharm_code
  └─ Then load voucher:
        if QueryString ReceiptNO → ReadData(ReceiptNO) [read-only mode]
        else → ReadData(Max(ReceiptNO))   ← last voucher
```

**Critical:** Safe list, Cheque bank list, Transfer bank list, and Cost Center are all populated on **initial page load**, not when Payment Method changes.

**Installation note:**  
- `dbo.GetAccCode('Bank')` → parent **`ACCCode = 111`** (Bank Name = `PARENTCode = 111`)  
- `dbo.GetAccCode('Safe')` → parent **`ACCCode = 110`** (Cash Safe NO. = `PARENTCode = 110`)  
- `dbo.GetAccCode('Customers')` → parent **`ACCCode = 114`** (Collected From Customer leaves under 114)  
- `dbo.GetAccCode('Suppliers')` → parent **`ACCCode = 2140`** (Collected From Supplier leaves under 2140)  
- New voucher default Payment Method = **Cash**

---

## 2. New voucher flow

**Event:** `btnNewReceipt.OnClick` → `btnNewReceipt_Click` (lines 265–297)

```text
btnNewReceipt_Click
  ├─ Hide nav arrows; show Update + Cancel
  ├─ Clear Amount, TotalString, Description, ReceiptNO, RecRef
  ├─ ReceiptDate = Today
  ├─ CostCenter SelectedIndex = -1
  ├─ rdoReceiptType.SelectedIndex = 0  → Cash
  ├─ MultiView1.ActiveViewIndex = 0    → Safe Details visible
  ├─ Clear Cheque bank/account/due/chequeNo
  │     drpCBank.SelectedIndex = -1
  │     drpCBank_SelectedIndexChanged(null,null)  → reload/clear cheque accounts
  ├─ Clear Transfer bank/account
  │     drpTBank.SelectedIndex = -1
  │     drpTBank_SelectedIndexChanged(null,null)
  ├─ Clear Safe + Currency
  │     drpSave.SelectedIndex = -1
  │     drpSave_SelectedIndexChanged → ReadSavingData() → reload Currency children
  │     drpCurrency.SelectedIndex = -1
  ├─ drpSource_SelectedIndexChanged → reload Customer/Supplier/Other party list
  └─ MultiView2.ActiveViewIndex = -1  → hide GL grid until after save/read
```

Does **not** re-query Safe/Bank parent lists (already bound on Page_Load).

---

## 3. Existing voucher flow (`ReadData`)

**Method:** `ReadData(String ReceiptNo)` — lines 208–264

```text
ReadData(ReceiptNo)
  ├─ SELECT * FROM CollectedVoucher WHERE ReceiptNo = @n
  ├─ Fill header: ReceiptNO, RecRef, Date, Amount, Currency label, Rate,
  │              VSource, Description, Type, TotalString, CostCenter
  ├─ cmdSource: clear → add ONE item (CollectedName / CollectedCode) → select it
  │              (does NOT re-run Customer/Supplier CTE on load)
  ├─ switch Type:
  │   Cash (default):
  │     drpSave.SelectedValue = SaveCode
  │     drpSave_SelectedIndexChanged → ReadSavingData (Currency list for that Safe)
  │     drpCurrency.SelectedValue = AccountNO
  │     drpCurrency_SelectedIndexChanged → Rate/Currency from Currency table
  │   Cheque:
  │     ChequeNO, DueDate
  │     drpCBank.SelectedValue = BankCode
  │     drpCBank_SelectedIndexChanged → Account list WHERE PARENTCode = Bank
  │     drpCAccountNO.SelectedValue = AccountNO
  │     drpCAccountNO_SelectedIndexChanged → Rate/Currency
  │   Transfer:
  │     drpTBank.SelectedValue = BankCode
  │     drpTBank_SelectedIndexChanged → Account list WHERE PARENTCode = Bank
  │     drpAccountNO.SelectedValue = AccountNO
  │     drpAccountNO_SelectedIndexChanged → Rate/Currency
  ├─ rdoReceiptType_SelectedIndexChanged(null,null) → show correct MultiView + Rate
  └─ ReadJornal() → load GL or build default Debit preview line
```

**Sequence rule (must preserve in Next.js):**  
Bank list already exists → set Bank → **then** load Account children → **then** set Account.

---

## 4. Payment Method = Cash

**Event:** `rdoReceiptType.OnSelectedIndexChanged` → `rdoReceiptType_SelectedIndexChanged` (382–400)  
**Values:** `Cash` (default case)

```text
rdoReceiptType = Cash
  ├─ MultiView1.ActiveViewIndex = 0   → Safe Details
  ├─ Rate = Currency.Rate JOIN AccountsChart
  │         WHERE AccountsChart.ACCCode = drpCurrency.SelectedValue
  └─ CalcTotal()
```

**Does NOT** re-bind `drpSave` (already loaded on Page_Load).

**Safe change:** `drpSave.OnSelectedIndexChanged` → `drpSave_SelectedIndexChanged` → `ReadSavingData()`  
SQL: `Select AccCode, AccANAme From AccountsChart where ParentCode = '@drpSave'`

**Currency account change:** `drpCurrency_SelectedIndexChanged`  
SQL: `Select Rate, C.code From Currency C, AccountsChart A where C.code = A.Currency and A.ACCCode = '@drpCurrency'`

---

## 5. Payment Method = Cheque

**Event:** same `rdoReceiptType_SelectedIndexChanged`, case `"Cheque"`

```text
rdoReceiptType = Cheque
  ├─ MultiView1.ActiveViewIndex = 1   → Cheque Details
  ├─ Rate from Currency JOIN AccountsChart on drpCAccountNO.SelectedValue
  └─ CalcTotal()
```

**Does NOT** re-bind `drpCBank` (already Page_Load with GetAccCode('Bank')).

**Bank change:** `drpCBank_SelectedIndexChanged` (751–758)  
- Clear `drpCAccountNO`  
- SQL: `Select ACCCode, ACCAName From AccountsChart where PARENTCode = '@drpCBank'`

**Account change:** `drpCAccountNO_SelectedIndexChanged` → Rate/Currency from Currency+AccountsChart.

---

## 6. Payment Method = Bank Transfer

**Event:** `rdoReceiptType_SelectedIndexChanged`, case `"Transfer"`

```text
rdoReceiptType = Transfer
  ├─ MultiView1.ActiveViewIndex = 2   → Transfer Details
  ├─ Rate from Currency JOIN AccountsChart on drpAccountNO.SelectedValue
  └─ CalcTotal()
```

**Bank change:** `drpTBank_SelectedIndexChanged` (410–417)  
- Clear `drpAccountNO`  
- SQL: `Select ACCCode, ACCAName From AccountsChart where PARENTCode = '@drpTBank'`

Same hierarchy as Cheque; **separate controls** (`drpTBank` / `drpAccountNO`).

---

## 7. Bank change → Account NO.

| Context | Event | Query |
|---------|-------|-------|
| Cheque | `drpCBank_SelectedIndexChanged` | `PARENTCode = selected Cheque Bank ACCCode` |
| Transfer | `drpTBank_SelectedIndexChanged` | `PARENTCode = selected Transfer Bank ACCCode` |
| Also on DataBound | `drpCBank_DataBound` / `drpTBank_DataBound` | Same child query |

Display: ACCAName; Value: ACCCode. Direct children only.

---

## 8. Collected From change

**Event:** `drpSource.OnSelectedIndexChanged` → `drpSource_SelectedIndexChanged` (341–367)  
**Default in .aspx:** `SelectedValue="Customer"`

```text
drpSource change
  ├─ cmdSource.ClearSelection()
  ├─ Customer:
  │     Recursive CTE under GetAccCode('Customers')
  │     Leaf accounts only (not used as PARENTCode)
  │     Text=ACCAName, Value=ACCcode
  ├─ Supplier:
  │     Same CTE under GetAccCode('Suppliers')
  └─ Other:
        cmdSource.Items.Clear()  → free text (AllowCustomText on related UIs)
```

On `ReadData`, party list is **not** rebuilt; one saved item is injected.

---

## 9. Currency / Rate change

| Trigger | Method | Effect |
|---------|--------|--------|
| Safe Currency account SelectedIndexChanged / DataBound | `drpCurrency_*` | `lblRate`, `lblCurrency` from Currency table via account.Currency |
| Cheque Account DataBound / SelectedIndexChanged | `drpCAccountNO_*` | same |
| Transfer Account DataBound / SelectedIndexChanged | `drpAccountNO_*` | same |
| Payment method change | `rdoReceiptType_*` | Rate from currently selected account of that mode |
| Amount EGP | `CalcTotal` | `Amount * dbo.GetRate(date, currency)` style via lblRate |

Header labels `lblCurrency` / `lblRate` are **not** the Safe dropdown named Currency.

---

## 10. Cost Center loading

**When:** Page_Load only (`!IsPostBack`)  
**SQL:** `SELECT pharm_code, pharmname FROM accountshortcut`  
**Value:** `pharm_code` · **Text:** `pharmname`  
**New:** SelectedIndex = -1  
**ReadData:** SelectedValue = voucher.CostCenter  

---

## 11. AccountsChart hierarchy rules

```text
GetAccCode('Bank')  → parent ACCCode (this site: 11)
    └── direct children = Bank Name (Cheque + Transfer)

GetAccCode('Safe')  → parent ACCCode (DB function)
    └── direct children = Safe NO.
            └── ParentCode = selected Safe → Currency account dropdown

Selected Bank ACCCode
    └── direct children = Account NO. (Cheque or Transfer)

GetAccCode('Customers'|'Suppliers')
    └── recursive descendants, leaves only → Collected From party
```

Do **not** load entire AccountsChart into Bank/Safe ComboBoxes.

---

## 12. Database objects used

| Object | Role |
|--------|------|
| `AccountsChart` | Hierarchy ComboBoxes |
| `dbo.GetAccCode(@name)` | Group root AccCode(s) |
| `Currency` | Rate + Code for selected account |
| `dbo.GetRate` | Used in `CalcTotal` |
| `accountshortcut` | Cost centers |
| `CollectedVoucher` | Header load/save |
| `CollectedVoucherProc` | Insert header (`btnUpdate`) |
| `GeneralLedger` + `AddLadger` | Journal (`btnSaveAccount`, TransType `CJ`) |
| `NumberToString` | Arabic amount words (`btnRefresh`) |

---

## ComboBox analysis table (from Web Forms source)

| Control | Loaded when | Event / method | Data source | Filter | Depends on |
|---------|-------------|----------------|-------------|--------|------------|
| Safe (`drpSave`) | Page_Load | Page_Load bind | AccountsChart | `PARENTCode IN (GetAccCode('Safe'))` | — |
| Currency acct (`drpCurrency`) | Safe DataBound / Safe change | `ReadSavingData` | AccountsChart | `ParentCode = Safe` | Safe |
| Cheque Bank (`drpCBank`) | Page_Load | Page_Load bind | AccountsChart | `PARENTCode IN (GetAccCode('Bank'))` (= **11**) | — |
| Cheque Account | Bank DataBound / Bank change | `drpCBank_*` | AccountsChart | `PARENTCode = ChequeBank` | Cheque Bank |
| Transfer Bank (`drpTBank`) | Page_Load | Page_Load bind | AccountsChart | `PARENTCode IN (GetAccCode('Bank'))` (= **11**) | — |
| Transfer Account | Bank DataBound / Bank change | `drpTBank_*` | AccountsChart | `PARENTCode = TransferBank` | Transfer Bank |
| Cost Center | Page_Load | Page_Load bind | accountshortcut | all rows | — |
| Collected From party | Source change / New | `drpSource_SelectedIndexChanged` | AccountsChart CTE | Customers/Suppliers leaves; Other empty | Collected From type |
| Rate/Currency labels | Account currency change | `*_SelectedIndexChanged` / DataBound | Currency ⨝ AccountsChart | account.Currency | Selected Safe/Bank account |

---

## Bank Name load (implementation)

**API helper:** `getCollectionVoucherBanks(token)` in `src/lib/api-client.ts`

```text
GET AccountsChart?parentCode=111&pageNumber=…&pageSize=…
  → server-side filter PARENTCode = 111
  → ComboBox value = ACCCode, text = ACCAName
```

**When:** Cheque / Bank Transfer (method change or ReadData for those types) via `ensureBanksLoaded()`.

**Account NO.:** `getAccountChildren(selectedBankAccCode)` → `AccountsChart?parentCode={bank}` (not 111 again).

| Web Forms | Next.js (`D:\cursore test`) |
|-----------|------------------------------|
| `Page_Load` binds | `onPageInit`: load Safe list, Bank list (PARENTCode=11), Cost Centers; then `readData(last)` |
| `rdoReceiptType_SelectedIndexChanged` | `onPaymentMethodChange`: switch panel + refresh Rate from current account; **do not** reload Bank/Safe lists |
| `drpSave_SelectedIndexChanged` | `onSafeChange`: clear Currency account; load children of Safe; optional rate |
| `drpCBank` / `drpTBank` SelectedIndexChanged | `onChequeBankChange` / `onTransferBankChange`: clear Account; load `PARENTCode = bank` |
| `drpSource_SelectedIndexChanged` | `onCollectedFromChange`: Customer/Supplier CTE leaves or Other free text |
| `ReadData` | `readData(receiptNo)`: set Type → set parent → load children → set child → rate → journal |
| `btnNewReceipt_Click` | `onNew`: clear fields; Payment Method Cash; clear dependents; do not re-fetch Bank/Safe parents |
| `btnUpdate` / `btnSaveAccount` | Save header / Post GL (existing API) |

### Event order for existing voucher (must not break React)

```text
1. Ensure Bank/Safe parent lists loaded
2. Set payment method (Type)
3. Set Safe or Bank selected value
4. Await Account/Currency child list for that parent
5. Set Account/Currency selected value
6. Apply Rate/Currency labels
7. Load journal
```

---

## References

- `TreasuryIn.aspx.cs` — `Page_Load`, `ReadData`, `btnNewReceipt_Click`, `rdoReceiptType_SelectedIndexChanged`, `drpSave_*`, `drpCBank_*`, `drpTBank_*`, `drpSource_SelectedIndexChanged`, `ReadJornal`, `btnUpdate_Click`, `btnSaveAccount_Click`, `btnRefresh_Click`
- `TreasuryIn.aspx` — control wiring / AutoPostBack / MultiView / default Cash
- `study-docs/02D_Functions.md` — `dbo.GetAccCode`
- `study-docs/04B_Controls.md` — Bank = `PARENTCode in dbo.GetAccCode('Bank')`
