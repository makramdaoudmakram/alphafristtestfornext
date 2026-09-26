import {
  applyPurchaseDetailPatch,
  computeLineTotal,
  computeNoOfItems,
  computePthNetBill,
  computeTotalQuantity,
  mapDetailsWithLineTotals,
  recalculatePurchaseDetailRow,
} from "@/lib/purchase-calculations";
import type { PurchaseDetail, PurchaseDetailPatch, PurchaseHeader } from "@/types/purchase";

function roundMoney(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

/**
 * Persisted return lines keep saved itmNet as line total on retrieval so header
 * totals are not recomputed from a mismatched sales-price formula.
 * New/edited lines use the live computeLineTotal(itmSell) formula.
 */
export function mapReturnDetailsWithLineTotals(
  details: PurchaseDetail[]
): PurchaseDetail[] {
  return details.map((row) => ({
    ...row,
    lineTotal:
      row.id != null && row.id > 0 && Number.isFinite(row.itmNet)
        ? roundMoney(row.itmNet)
        : computeLineTotal(row),
  }));
}

/** Header totals for Purchase Return — uses mapReturnDetailsWithLineTotals. */
export function computeReturnHeaderTotals(
  header: Pick<
    PurchaseHeader,
    "purchExtraDisCount" | "totalDisPer" | "pOtherExpenses"
  >,
  details: PurchaseDetail[]
): Pick<
  PurchaseHeader,
  "noOfItems" | "totalQuantity" | "totalBill" | "totalDesMon" | "totalTax" | "pthNetBill"
> {
  const lines = mapReturnDetailsWithLineTotals(details);
  const totalBill = lines.reduce((sum, row) => sum + row.lineTotal, 0);
  const totalTax = lines.reduce((sum, row) => sum + (row.itmTaxTotal ?? 0), 0);

  return {
    noOfItems: computeNoOfItems(lines),
    totalQuantity: computeTotalQuantity(lines),
    totalBill: roundMoney(totalBill),
    totalDesMon: roundMoney(toFiniteNumber(header.purchExtraDisCount)),
    totalTax: roundMoney(totalTax),
    pthNetBill: computePthNetBill(
      totalBill,
      header.purchExtraDisCount ?? 0,
      header.pOtherExpenses ?? 0
    ),
  };
}

/** Re-sync cost/tax/net from saved discount literals (edit mode entry). */
export function resyncReturnDetailFinancials(row: PurchaseDetail): PurchaseDetail {
  return recalculatePurchaseDetailRow(row, {
    updateDiscPercent: false,
    preserveDiscAmount: true,
  });
}

function patchHas(patch: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(patch, key);
}

/** User edited Disc % or Disc amt in the Purchase Return grid. */
function isManualReturnDiscountPatch(patch: PurchaseDetailPatch): boolean {
  return patchHas(patch, "itmDisPer") || patchHas(patch, "itmDisMon");
}

/** Batch stock search completed — new Purchase Return sellable line. */
function isReturnStockItemSelectionPatch(patch: PurchaseDetailPatch): boolean {
  const hasItem = Boolean(patch.itmId?.trim());
  const hasBatch = Boolean(patch.batchNo?.trim());
  const hasStock =
    patch.stockId != null && Number.isFinite(patch.stockId) && patch.stockId > 0;
  return hasItem && hasBatch && hasStock;
}

/**
 * Apply a non-discount patch: merge fields, keep discount literals unchanged,
 * recalculate net/cost/tax only (never auto-derive Disc % / Disc amt).
 */
function applyReturnDetailPatchPreservingDiscount(
  row: PurchaseDetail,
  patch: PurchaseDetailPatch,
  discountOverride?: Pick<PurchaseDetail, "itmDisMon" | "itmDisPer" | "itmExtraDis">
): PurchaseDetail {
  const { skipDiscPercent: _s, skipTax, ...detailPatch } = patch;
  const discount = discountOverride ?? {
    itmDisMon: row.itmDisMon,
    itmDisPer: row.itmDisPer,
    itmExtraDis: row.itmExtraDis,
  };

  const merged: PurchaseDetail = {
    ...row,
    ...detailPatch,
    ...discount,
  };

  return recalculatePurchaseDetailRow(merged, {
    updateDiscPercent: false,
    preserveDiscAmount: true,
    preserveTax: skipTax === true,
  });
}

/**
 * Purchase Return detail patch.
 * Line financial calculations (discount, cost, tax, net, line total) delegate to
 * purchase-calculations.ts and use itmSell as the price base — same as Purchase.
 * Disc % and Disc amt stay at their current values for every automatic event
 * (item, batch, unit, store, qty, price conversion). Only manual grid edits
 * to itmDisPer / itmDisMon run the shared purchase discount calculation.
 * New item+batch lines initialize discount to zero.
 */
export function applyReturnDetailPatch(
  row: PurchaseDetail,
  patch: PurchaseDetailPatch
): PurchaseDetail {
  if (isManualReturnDiscountPatch(patch) && !isReturnStockItemSelectionPatch(patch)) {
    return applyPurchaseDetailPatch(row, patch);
  }

  if (isReturnStockItemSelectionPatch(patch)) {
    return applyReturnDetailPatchPreservingDiscount(row, patch, {
      itmDisMon: 0,
      itmDisPer: 0,
      itmExtraDis: 0,
    });
  }

  return applyReturnDetailPatchPreservingDiscount(row, patch);
}

export { computeReturnHeaderTotals as computeHeaderTotals, mapDetailsWithLineTotals };
