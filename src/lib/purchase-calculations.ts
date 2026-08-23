import type { PurchaseDetail, PurchaseHeader } from "@/types/purchase";

/** Detail fields that must re-run PurTransD tax calculation. */
export const PURCHASE_TAX_TRIGGER_FIELDS = [
  "taxPercent",
  "itmTaxPrice",
  "itmPurPrice",
  "qnty",
  "bonus",
] as const;

/** Detail fields that must re-run PurTransD Net calculation. */
export const PURCHASE_NET_TRIGGER_FIELDS = [
  ...PURCHASE_TAX_TRIGGER_FIELDS,
  "itmExtraDis",
] as const;

/** Detail fields that must re-run Disc % (and Cost from an edited Net). */
export const PURCHASE_DISC_TRIGGER_FIELDS = [
  ...PURCHASE_NET_TRIGGER_FIELDS,
  "itmSell",
  "itmNet",
] as const;

export type PurchaseTaxFields = {
  taxPercent?: number | null;
  itmPurPrice?: number | null;
  itmTaxPrice?: number | null;
  itmTaxTotal?: number;
  qnty?: number | null;
  bonus?: number | null;
};

export type PurchaseNetFields = PurchaseTaxFields & {
  itmExtraDis?: number | null;
  itmNet?: number;
  itmCost?: number;
  itmSell?: number | null;
  itmDisPer?: number;
};

function isGreaterThanZero(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function roundMoney(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/** Qty and Bonus from the same PurTransD row. Empty/invalid values are 0. */
export function readPurchaseRowQtyBonus(row: PurchaseTaxFields): {
  qty: number;
  bonus: number;
} {
  return {
    qty: toFiniteNumber(row.qnty),
    bonus: toFiniteNumber(row.bonus),
  };
}

/** Taxable units: Qty + Bonus. Never Qty alone. */
export function getPurchaseTaxableQuantity(row: PurchaseTaxFields): number {
  const { qty, bonus } = readPurchaseRowQtyBonus(row);
  return qty + bonus;
}

/** Tax = TaxPrice × (Qty + Bonus) */
export function computePurchaseTaxAmount(
  taxPrice: number,
  qty: number,
  bonus: number
): number {
  return roundMoney(taxPrice * (toFiniteNumber(qty) + toFiniteNumber(bonus)));
}

export function isPurchaseTaxTriggerPatch(
  patch: Partial<PurchaseDetail>
): boolean {
  return PURCHASE_TAX_TRIGGER_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(patch, field)
  );
}

export function isPurchaseNetTriggerPatch(
  patch: Partial<PurchaseDetail>
): boolean {
  return PURCHASE_NET_TRIGGER_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(patch, field)
  );
}

export function isPurchaseDiscTriggerPatch(
  patch: Partial<PurchaseDetail>
): boolean {
  return PURCHASE_DISC_TRIGGER_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(patch, field)
  );
}

/**
 * Net =
 *   ((PurchPrice + TaxPrice) × Qty)
 *   + (TaxPrice × Bonus)
 *   - ExtraDiscount
 *
 * Bonus uses TaxPrice only. Do not use (PurchPrice + TaxPrice) × (Qty + Bonus).
 */
export function computePurchaseNetAmount(row: PurchaseNetFields): number {
  const purchPrice = toFiniteNumber(row.itmPurPrice);
  const taxPrice = toFiniteNumber(row.itmTaxPrice);
  const { qty, bonus } = readPurchaseRowQtyBonus(row);
  const extraDiscount = toFiniteNumber(row.itmExtraDis);
  const quantityAmount = (purchPrice + taxPrice) * qty;
  const bonusAmount = taxPrice * bonus;
  return roundMoney(quantityAmount + bonusAmount - extraDiscount);
}

/** Cost = Net / (Qty + Bonus). Returns 0 when Qty + Bonus is 0. */
export function computePurchaseCostAmount(
  net: number,
  qty: number,
  bonus: number
): number {
  const taxableQty = toFiniteNumber(qty) + toFiniteNumber(bonus);
  if (taxableQty === 0) return 0;
  return roundMoney(toFiniteNumber(net) / taxableQty);
}

/** Disc% = (1 - (Net / (SalesPrice × Qty))) × 100. Returns 0 if SalesPrice or Qty is 0. */
export function computePurchaseDiscPercent(
  net: number,
  salesPrice: number,
  qty: number
): number {
  const sales = toFiniteNumber(salesPrice);
  const quantity = toFiniteNumber(qty);
  if (sales === 0 || quantity === 0) return 0;
  return roundMoney((1 - toFiniteNumber(net) / (sales * quantity)) * 100);
}

export function applyPurchaseDetailFromNet<T extends PurchaseNetFields>(
  row: T
): T {
  const { qty, bonus } = readPurchaseRowQtyBonus(row);
  const itmNet = toFiniteNumber(row.itmNet);
  return {
    ...row,
    itmCost: computePurchaseCostAmount(itmNet, qty, bonus),
    itmDisPer: computePurchaseDiscPercent(itmNet, row.itmSell ?? 0, qty),
  };
}

export function applyPurchaseDetailNet<T extends PurchaseNetFields>(row: T): T {
  const itmNet = computePurchaseNetAmount(row);
  return applyPurchaseDetailFromNet({
    ...row,
    itmNet,
  });
}

/**
 * Per-row tax rules for the purchase detail grid.
 * Distinguishes empty/null, zero, and values greater than zero.
 * Does not convert empty TaxPercent or TaxPrice to 0 before applying rules.
 * Never returns early: TaxPrice is conditional, Tax always continues after it.
 */
export function applyPurchaseDetailTax<T extends PurchaseTaxFields>(row: T): T {
  const { qty, bonus } = readPurchaseRowQtyBonus(row);
  const purchPrice = toFiniteNumber(row.itmPurPrice);
  const next = { ...row };

  if (isGreaterThanZero(row.taxPercent)) {
    next.itmTaxPrice = roundMoney((purchPrice * (row.taxPercent as number)) / 100);
  }

  if (isGreaterThanZero(next.itmTaxPrice)) {
    next.itmTaxTotal = computePurchaseTaxAmount(
      next.itmTaxPrice as number,
      qty,
      bonus
    );
  }

  return next;
}

/**
 * Full PurTransD row sequence. Always runs to the end.
 * TaxPercent > 0 only affects the TaxPrice step, not whether this runs.
 */
export function recalculatePurchaseDetailRow(row: PurchaseDetail): PurchaseDetail {
  return applyPurchaseDetailNet(applyPurchaseDetailTax(row));
}

export function applyPurchaseDetailPatch(
  row: PurchaseDetail,
  patch: Partial<PurchaseDetail>
): PurchaseDetail {
  const merged: PurchaseDetail = {
    ...row,
    ...patch,
    qnty: Object.prototype.hasOwnProperty.call(patch, "qnty")
      ? toFiniteNumber(patch.qnty)
      : toFiniteNumber(row.qnty),
    bonus: Object.prototype.hasOwnProperty.call(patch, "bonus")
      ? toFiniteNumber(patch.bonus)
      : toFiniteNumber(row.bonus),
  };

  const taxPercentChanged = Object.prototype.hasOwnProperty.call(
    patch,
    "taxPercent"
  );
  if (taxPercentChanged || isPurchaseNetTriggerPatch(patch)) {
    return recalculatePurchaseDetailRow(merged);
  }
  if (isPurchaseDiscTriggerPatch(patch)) {
    return applyPurchaseDetailFromNet(merged);
  }
  return merged;
}

/** Line total before header-level discount */
export function computeLineTotal(row: Pick<
  PurchaseDetail,
  "qnty" | "itmPurPrice" | "itmDisPer" | "itmDisMon" | "itmTaxTotal"
>): number {
  const gross = (row.qnty ?? 0) * (row.itmPurPrice ?? 0);
  const discountFromPercent = gross * ((row.itmDisPer ?? 0) / 100);
  const discount = (row.itmDisMon ?? 0) + discountFromPercent;
  const tax = row.itmTaxTotal ?? 0;
  const total = gross - discount + tax;
  return Number.isFinite(total) ? Math.round(total * 100) / 100 : 0;
}

export function mapDetailsWithLineTotals(
  details: PurchaseDetail[]
): PurchaseDetail[] {
  return details.map((row) => ({
    ...row,
    lineTotal: computeLineTotal(row),
  }));
}

/** Sum of detail Qnty + Bonus across all lines */
export function computeTotalQuantity(details: PurchaseDetail[]): number {
  const total = details.reduce(
    (sum, row) => sum + (row.qnty ?? 0) + (row.bonus ?? 0),
    0
  );
  return Number.isFinite(total) ? Math.round(total * 100) / 100 : 0;
}

/** ERP totals for PurTransH readonly fields */
export function computeHeaderTotals(
  header: Pick<
    PurchaseHeader,
    "purchExtraDisCount" | "totalDisPer" | "pOtherExpenses"
  >,
  details: PurchaseDetail[]
): Pick<
  PurchaseHeader,
  "noOfItems" | "totalQuantity" | "totalBill" | "totalDesMon" | "totalTax" | "pthNetBill"
> {
  const lines = mapDetailsWithLineTotals(details);
  const noOfItems = lines.length;
  const totalQuantity = computeTotalQuantity(lines);
  const totalBill = lines.reduce((sum, row) => sum + row.lineTotal, 0);
  const totalTax = lines.reduce((sum, row) => sum + (row.itmTaxTotal ?? 0), 0);
  const totalDesMon =
    Math.round(((totalBill * (header.totalDisPer ?? 0)) / 100) * 100) / 100;
  const pthNetBill =
    Math.round(
      (totalBill -
        totalDesMon -
        (header.purchExtraDisCount ?? 0) +
        totalTax +
        (header.pOtherExpenses ?? 0)) *
        100
    ) / 100;

  return {
    noOfItems,
    totalQuantity,
    totalBill: Math.round(totalBill * 100) / 100,
    totalDesMon,
    totalTax: Math.round(totalTax * 100) / 100,
    pthNetBill,
  };
}
