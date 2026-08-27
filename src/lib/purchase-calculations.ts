import type {
  PurchaseDetail,
  PurchaseDetailPatch,
  PurchaseHeader,
} from "@/types/purchase";

/** Detail fields that must re-run PurTransD tax calculation. */
export const PURCHASE_TAX_TRIGGER_FIELDS = [
  "taxPercent",
  "itmTaxPrice",
  "itmPurPrice",
  "qnty",
  "bonus",
  "itmDisMon",
  "itmCost",
] as const;

/** Detail fields that must re-run PurTransD Net calculation. */
export const PURCHASE_NET_TRIGGER_FIELDS = [
  ...PURCHASE_TAX_TRIGGER_FIELDS,
  "itmExtraDis",
  "itmTaxTotal",
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
  itmCost?: number;
  qnty?: number | null;
  bonus?: number | null;
  itmDisMon?: number | null;
};

export type PurchaseNetFields = PurchaseTaxFields & {
  itmExtraDis?: number | null;
  itmNet?: number;
  itmCost?: number;
  itmSell?: number | null;
  itmDisPer?: number;
  itmDisMon?: number;
};

export type PurchaseDiscAmountFields = {
  itmPurPrice?: number | null;
  qnty?: number | null;
  itmDisPer?: number | null;
  itmExtraDis?: number | null;
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

/**
 * IF TaxPercent > 0:
 *   ((PurchPrice × Qty) + (Bonus × PurchPrice) − DiscAmount) × (TaxPercent ÷ 100)
 * ELSE IF TaxPrice > 0:
 *   (Bonus + Qty) × Cost × TaxPrice
 * ELSE:
 *   0
 *
 * TaxPercent is a percentage number (5 = 5%). Returns 0 when both tax inputs are zero.
 */
export function computePurchaseTaxAmount(row: PurchaseTaxFields): number {
  if (
    !isGreaterThanZero(row.taxPercent) &&
    !isGreaterThanZero(row.itmTaxPrice)
  ) {
    return 0;
  }

  const purchPrice = toFiniteNumber(row.itmPurPrice);
  const { qty, bonus } = readPurchaseRowQtyBonus(row);
  const discAmount = toFiniteNumber(row.itmDisMon);

  if (isGreaterThanZero(row.taxPercent)) {
    const base = purchPrice * qty + bonus * purchPrice - discAmount;
    return roundMoney(base * ((row.taxPercent as number) / 100));
  }

  const taxPrice = toFiniteNumber(row.itmTaxPrice);
  const cost = toFiniteNumber(row.itmCost);
  return roundMoney((bonus + qty) * cost * taxPrice);
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

function patchHas(patch: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(patch, key);
}

/**
 * Disc % formula stays as-is. It must not run for item load, Extra Discount,
 * or Net / Tax / Cost recalculation. It still runs when Sales price or Net
 * is edited (previous Disc % events).
 */
function shouldRecalculateDiscPercent(patch: PurchaseDetailPatch): boolean {
  if (patch.skipDiscPercent === true) return false;
  if (patchHas(patch, "itmDisPer")) return false;
  if (
    patchHas(patch, "itmExtraDis") &&
    !patchHas(patch, "itmNet") &&
    !patchHas(patch, "itmSell")
  ) {
    return false;
  }
  return patchHas(patch, "itmSell") || patchHas(patch, "itmNet");
}

/**
 * Net = ((PurchPrice × Qty) - DiscAmount) + Tax
 */
export function computePurchaseNetAmount(row: PurchaseNetFields): number {
  const purchPrice = toFiniteNumber(row.itmPurPrice);
  const qty = toFiniteNumber(row.qnty);
  const discAmount = toFiniteNumber(row.itmDisMon);
  const tax = toFiniteNumber(row.itmTaxTotal);
  return roundMoney(purchPrice * qty - discAmount + tax);
}

/**
 * Cost = ((Qty × PurchPrice) - DiscAmount) / (Bonus + Qty).
 * Returns 0 when Bonus + Qty is 0.
 */
export function computePurchaseCostAmount(row: PurchaseNetFields): number {
  const qty = toFiniteNumber(row.qnty);
  const bonus = toFiniteNumber(row.bonus);
  const divisor = bonus + qty;
  if (divisor === 0) return 0;
  const purchPrice = toFiniteNumber(row.itmPurPrice);
  const discAmount = toFiniteNumber(row.itmDisMon);
  return roundMoney((qty * purchPrice - discAmount) / divisor);
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

/**
 * Disc Amt = (PurchPrice × Quantity × (Disc % ÷ 100)) + Extra Disc.
 * Disc % is a percent (7 means 7%), not a fraction. Empty Extra Disc is 0.
 */
export function computePurchaseDiscAmount(row: PurchaseDiscAmountFields): number {
  const purchPrice = toFiniteNumber(row.itmPurPrice);
  const qty = toFiniteNumber(row.qnty);
  const discPercent = toFiniteNumber(row.itmDisPer);
  const extraDisc = toFiniteNumber(row.itmExtraDis);
  const discountFromPercent = purchPrice * qty * (discPercent / 100);
  return roundMoney(discountFromPercent + extraDisc);
}

export function applyPurchaseDiscAmount<T extends PurchaseDiscAmountFields>(
  row: T
): T & { itmDisMon: number } {
  return {
    ...row,
    itmDisMon: computePurchaseDiscAmount(row),
  };
}

export function applyPurchaseDetailCost<T extends PurchaseNetFields>(row: T): T {
  return {
    ...row,
    itmCost: computePurchaseCostAmount(row),
  };
}

export function applyPurchaseDetailDiscPercent<T extends PurchaseNetFields>(
  row: T
): T {
  const { qty } = readPurchaseRowQtyBonus(row);
  return {
    ...row,
    itmDisPer: computePurchaseDiscPercent(
      toFiniteNumber(row.itmNet),
      row.itmSell ?? 0,
      qty
    ),
  };
}

export function applyPurchaseDetailFromNet<T extends PurchaseNetFields>(
  row: T
): T {
  return applyPurchaseDetailDiscPercent(applyPurchaseDetailCost(row));
}

export function applyPurchaseDetailNet<T extends PurchaseNetFields>(
  row: T,
  options?: { updateDiscPercent?: boolean; preserveNet?: boolean }
): T {
  const withNet = options?.preserveNet
    ? row
    : {
        ...row,
        itmNet: computePurchaseNetAmount(row),
      };
  const withCost = applyPurchaseDetailCost(withNet);
  if (options?.updateDiscPercent === true) {
    return applyPurchaseDetailDiscPercent(withCost);
  }
  return withCost;
}

/**
 * Tax (itmTaxTotal) runs only when TaxPercent > 0 OR TaxPrice > 0.
 * TaxPercent takes priority. Otherwise Tax = 0 and no formula runs.
 * Row.itmCost must be current before calling when TaxPrice > 0.
 */
export function applyPurchaseDetailTax<T extends PurchaseTaxFields>(row: T): T {
  if (
    !isGreaterThanZero(row.taxPercent) &&
    !isGreaterThanZero(row.itmTaxPrice)
  ) {
    return { ...row, itmTaxTotal: 0 };
  }

  const next = { ...row };

  if (isGreaterThanZero(row.taxPercent)) {
    const purchPrice = toFiniteNumber(row.itmPurPrice);
    next.itmTaxPrice = roundMoney((purchPrice * (row.taxPercent as number)) / 100);
  }

  next.itmTaxTotal = computePurchaseTaxAmount(next);
  return next;
}

/**
 * Full PurTransD row sequence. Tax runs only when TaxPercent > 0 OR TaxPrice > 0.
 */
export function recalculatePurchaseDetailRow(
  row: PurchaseDetail,
  options?: {
    updateDiscPercent?: boolean;
    preserveDiscAmount?: boolean;
    preserveTax?: boolean;
    preserveNet?: boolean;
  }
): PurchaseDetail {
  let next: PurchaseDetail = row;
  if (options?.updateDiscPercent === true) {
    next = applyPurchaseDetailDiscPercent(next);
  }
  if (!options?.preserveDiscAmount) {
    next = applyPurchaseDiscAmount(next);
  }
  next = applyPurchaseDetailCost(next);
  if (!options?.preserveTax) {
    next = applyPurchaseDetailTax(next);
  }
  return applyPurchaseDetailNet(next, {
    updateDiscPercent: false,
    preserveNet: options?.preserveNet === true,
  });
}

export function applyPurchaseDetailPatch(
  row: PurchaseDetail,
  patch: PurchaseDetailPatch
): PurchaseDetail {
  const { skipDiscPercent: _skipDiscPercent, skipTax: _skipTax, ...detailPatch } =
    patch;
  const merged: PurchaseDetail = {
    ...row,
    ...detailPatch,
    qnty: patchHas(detailPatch, "qnty")
      ? toFiniteNumber(detailPatch.qnty)
      : toFiniteNumber(row.qnty),
    bonus: patchHas(detailPatch, "bonus")
      ? toFiniteNumber(detailPatch.bonus)
      : toFiniteNumber(row.bonus),
  };

  const taxPercentChanged = patchHas(detailPatch, "taxPercent");
  const discPercentChanged = patchHas(detailPatch, "itmDisPer");
  const updateDiscPercent = shouldRecalculateDiscPercent(patch);
  const preserveDiscAmount = !(
    patchHas(detailPatch, "itmPurPrice") ||
    patchHas(detailPatch, "qnty") ||
    patchHas(detailPatch, "itmDisPer") ||
    patchHas(detailPatch, "itmExtraDis")
  );
  const preserveTax =
    patch.skipTax === true ||
    (patchHas(detailPatch, "itmTaxTotal") &&
      !patchHas(detailPatch, "itmPurPrice") &&
      !patchHas(detailPatch, "qnty") &&
      !patchHas(detailPatch, "bonus") &&
      !patchHas(detailPatch, "itmDisMon") &&
      !patchHas(detailPatch, "itmExtraDis") &&
      !patchHas(detailPatch, "itmDisPer") &&
      !patchHas(detailPatch, "itmCost") &&
      !patchHas(detailPatch, "taxPercent") &&
      !patchHas(detailPatch, "itmTaxPrice"));
  const preserveNet = patchHas(detailPatch, "itmNet");
  const shouldRecalcValues =
    taxPercentChanged ||
    isPurchaseNetTriggerPatch(detailPatch) ||
    isPurchaseDiscTriggerPatch(detailPatch) ||
    discPercentChanged ||
    patchHas(detailPatch, "itmDisMon") ||
    patchHas(detailPatch, "itmTaxTotal");

  if (shouldRecalcValues) {
    return recalculatePurchaseDetailRow(merged, {
      updateDiscPercent,
      preserveDiscAmount,
      preserveTax,
      preserveNet,
    });
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

/**
 * Distinct item codes on PurTransD lines (ItmId / ItmCode).
 * Blank codes are ignored so empty placeholder rows do not count.
 */
export function computeNoOfItems(details: PurchaseDetail[]): number {
  const codes = new Set<string>();
  for (const row of details) {
    const code = row.itmId?.trim();
    if (code) codes.add(code.toUpperCase());
  }
  return codes.size;
}

/** Header net bill from TotalBill and header-level discount fields. */
export function computePthNetBill(
  totalBill: number,
  purchExtraDisCount: number,
  pOtherExpenses: number
): number {
  const bill = toFiniteNumber(totalBill);
  const extraDisc = toFiniteNumber(purchExtraDisCount);
  const percDisc = toFiniteNumber(pOtherExpenses);

  if (extraDisc > 0) {
    return roundMoney(Math.max(0, bill - extraDisc));
  }
  if (percDisc > 0) {
    return roundMoney(Math.max(0, (1 - percDisc / 100) * bill));
  }
  return roundMoney(bill);
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
  const noOfItems = computeNoOfItems(lines);
  const totalQuantity = computeTotalQuantity(lines);
  const totalBill = lines.reduce((sum, row) => sum + row.lineTotal, 0);
  const totalTax = lines.reduce((sum, row) => sum + (row.itmTaxTotal ?? 0), 0);
  const pthNetBill = computePthNetBill(
    totalBill,
    header.purchExtraDisCount ?? 0,
    header.pOtherExpenses ?? 0
  );

  return {
    noOfItems,
    totalQuantity,
    totalBill: roundMoney(totalBill),
    totalDesMon: roundMoney(toFiniteNumber(header.purchExtraDisCount)),
    totalTax: roundMoney(totalTax),
    pthNetBill,
  };
}
