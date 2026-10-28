# Shift API — agreed rules vs current Alfa backend (verify before go-live)

Document for frontend integration review. **Do not work around these in the UI.**

| Agreed rule | Current backend behavior (Alfa repo) | Impact |
|-------------|--------------------------------------|--------|
| Next `Sc_Id` = MAX for **cost center** (+1, or 1 if none) | `Sc_Id` sequence is per **`ScPharm`** (pharmacy id string), not cost center | Pharmacies sharing a cost center may get duplicate business shift numbers across sites until backend changes |
| Cost center stored on each shift | `Shift` has no cost-center column; only `Parm.CostCenter` on read | Numbering by cost center cannot match DB without schema/service change |
| Close saves **actual cash** → `Sc_ActCash`, **transfer** → `Sc_TransformValue` | Close `ExecuteUpdate` sets those fields from **shift closing calculation totals** (`SalesParmCost`, `SalesMedicen`) | Submitted cash/transfer may not persist as specified |
| `Move_Id` never null | First shift opens with `Move_Id = null` until a later open | Close preview/close may fail until movement is set |
| Head-office receipt (`Send_ledger = 2`) | Not implemented (by design) | N/A |

Frontend sends `ActualPharmacyCash`, `HeadOfficeTransferAmount`, `EmployeePassword`, and `ClosingNotes` on `POST /api/Shift/close` per DTO; persistence must be fixed server-side.
