import {
  checkInvoiceStockAllocation,
  displayAvailableQtyInSelectedUnit,
  invoiceRemainingInSelectedUnit,
} from "@/lib/sales-workspace-calc";
import type { ReturnDetail } from "@/types/return";
import type { SalesWorkspaceLine } from "@/types/sales-workspace";

/** Return detail fields used by Sales stock allocation helpers. */
export type ReturnDetailStockFields = Pick<
  ReturnDetail,
  | "clientRowId"
  | "stockId"
  | "availableQty"
  | "qnty"
  | "unitId"
  | "batchNo"
  | "itmId"
  | "unit1"
  | "unit2"
  | "unit3"
  | "unit1Unit2"
  | "unit1Unit3"
>;

export function returnDetailSalesUnitFields(
  row: ReturnDetailStockFields
): Pick<
  SalesWorkspaceLine,
  "unitId" | "unit1" | "unit2" | "unit3" | "unit1Unit2" | "unit1Unit3"
> {
  return {
    unitId: row.unitId ?? 0,
    unit1: row.unit1 ?? null,
    unit2: row.unit2 ?? null,
    unit3: row.unit3 ?? null,
    unit1Unit2: row.unit1Unit2 ?? null,
    unit1Unit3: row.unit1Unit3 ?? null,
  };
}

/** Stock.AvailableQty in base units — same field semantics as Sales workspace lines. */
export function returnDetailBaseAvailableQty(row: ReturnDetailStockFields): number {
  const qty = row.availableQty;
  return typeof qty === "number" && Number.isFinite(qty) && qty >= 0 ? qty : 0;
}

export function returnDetailToSalesStockCandidate(
  row: ReturnDetailStockFields
): Pick<
  SalesWorkspaceLine,
  | "key"
  | "stockId"
  | "availableQty"
  | "quantity"
  | "batchNo"
  | "itemCode"
  | "itemName"
  | "unitId"
  | "unit1"
  | "unit2"
  | "unit3"
  | "unit1Unit2"
  | "unit1Unit3"
> {
  return {
    key: row.clientRowId,
    stockId: row.stockId ?? 0,
    availableQty: returnDetailBaseAvailableQty(row),
    quantity: Number(row.qnty) || 0,
    batchNo: row.batchNo?.trim() ?? "",
    itemCode: row.itmId?.trim() ?? "",
    itemName: row.itmId?.trim() ?? "",
    ...returnDetailSalesUnitFields(row),
  };
}

export function returnDetailsToSalesStockLines(
  rows: ReturnDetailStockFields[]
): SalesWorkspaceLine[] {
  return rows
    .filter((row) => (row.stockId ?? 0) > 0 && Boolean(row.batchNo?.trim()))
    .map((row) => ({
      ...returnDetailToSalesStockCandidate(row),
      itemCatalogId: (row.stockId ?? 0) > 0 ? 1 : 0,
      itemName: row.itmId?.trim() ?? "",
      itmNameAr: "",
      itmNameEn: "",
      searchText: "",
      expDate: null,
      storId: 0,
      itmMaxDiscPer: null,
      groupNameEn: "",
      groupNameAr: "",
      baseUnitSellPrice: 0,
      unitSellPrice: 0,
      priceQtyNet: 1,
      discountMode: "" as const,
      discountPercent: 0,
      discountValue: 0,
      qtyError: null,
    }));
}

/** Available qty in the selected transaction unit (Sales displayAvailableQtyInSelectedUnit). */
export function returnDetailDisplayAvailableQty(
  row: ReturnDetailStockFields
): number | null {
  const base = returnDetailBaseAvailableQty(row);
  if (!(base > 0) || row.unitId == null || row.unitId <= 0) return null;

  const unitFields = returnDetailSalesUnitFields(row);
  if (
    unitFields.unit1 == null &&
    unitFields.unit2 == null &&
    unitFields.unit3 == null
  ) {
    return null;
  }

  return displayAvailableQtyInSelectedUnit({
    availableQty: base,
    ...unitFields,
  });
}

/** Remaining qty in selected unit for this return document (Sales invoiceRemainingInSelectedUnit). */
export function returnDetailRemainingInSelectedUnit(
  row: ReturnDetailStockFields,
  allRows: ReturnDetailStockFields[]
): number | null {
  const lines = returnDetailsToSalesStockLines(allRows);
  const candidate = returnDetailToSalesStockCandidate(row);
  return invoiceRemainingInSelectedUnit(lines, candidate, row.clientRowId);
}

/** Validate return qty using Sales checkInvoiceStockAllocation. */
export function checkReturnDetailStockAllocation(
  candidate: ReturnDetailStockFields,
  allRows: ReturnDetailStockFields[],
  unitName: string
): { ok: true } | { ok: false; message: string } {
  if (!(candidate.stockId != null && candidate.stockId > 0)) {
    return { ok: true };
  }

  const lines = returnDetailsToSalesStockLines(allRows);
  const salesCandidate = returnDetailToSalesStockCandidate(candidate);
  const result = checkInvoiceStockAllocation(
    lines,
    salesCandidate,
    unitName,
    candidate.clientRowId
  );

  if (result.ok) return { ok: true };
  return { ok: false, message: result.message };
}

export function formatReturnAvailableQty(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 10000) / 10000;
  const text = rounded.toFixed(4).replace(/\.?0+$/, "");
  return text || "0";
}

/** Clear Sales-style stock fields when batch is removed from a line. */
export function clearReturnDetailStockFields(): Pick<
  ReturnDetail,
  | "availableQty"
  | "stockId"
  | "unit1"
  | "unit2"
  | "unit3"
  | "unit1Unit2"
  | "unit1Unit3"
  | "maxReturnQty"
> {
  return {
    availableQty: 0,
    stockId: null,
    unit1: null,
    unit2: null,
    unit3: null,
    unit1Unit2: null,
    unit1Unit3: null,
    maxReturnQty: undefined,
  };
}
