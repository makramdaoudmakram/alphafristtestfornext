import type { PurchaseDetail, PurchaseDetailPatch, PurchaseHeader } from "@/types/purchase";

function roundMoney(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * Discount amount on the SALES subtotal: SalesPrice × Qty × Disc% ÷ 100. Clamped into
 * [0, sales subtotal] so an invalid percentage can neither turn the discount into a mark-up
 * nor take the line net below zero. Extra discount is never part of the amount — Pharmacy
 * Purchase forces itmExtraDis to 0, so a line is never discounted twice.
 */
export function computePharmPurchaseDiscAmount(row: {
  itmSell?: number | null;
  qnty?: number | null;
  itmDisPer?: number | null;
}): number {
  const gross = Math.max(toNumber(row.itmSell) * toNumber(row.qnty), 0);
  const discPercent = toNumber(row.itmDisPer);
  if (discPercent <= 0) return 0;
  return roundMoney(Math.min((gross * discPercent) / 100, gross));
}

/** Sales-based line total: (SalesPrice × Qty) − discount. No tax. */
export function computePharmPurchaseLineTotal(row: PurchaseDetail): number {
  const gross = toNumber(row.itmSell) * toNumber(row.qnty);
  const discount = computePharmPurchaseDiscAmount(row);
  return roundMoney(Math.max(gross - discount, 0));
}

/** Purchase-side cost from purchase price (stock recording only). */
export function computePharmPurchaseCost(row: PurchaseDetail): number {
  const qty = toNumber(row.qnty);
  const bonus = toNumber(row.bonus);
  const divisor = qty + bonus;
  if (divisor === 0) return 0;
  const purchPrice = toNumber(row.itmPurPrice);
  const discPercent = toNumber(row.itmDisPer);
  const purchDisc = roundMoney(purchPrice * qty * (discPercent / 100));
  return roundMoney((qty * purchPrice - purchDisc) / divisor);
}

/**
 * Line net is the sales-price subtotal after every applicable discount — the same value the
 * API persists. Purchase price only feeds computePharmPurchaseCost (stock cost recording).
 */
export function computePharmPurchaseNet(row: PurchaseDetail): number {
  return computePharmPurchaseLineTotal(row);
}

export function recalculatePharmPurchaseDetailRow(row: PurchaseDetail): PurchaseDetail {
  const itmDisMon = computePharmPurchaseDiscAmount(row);
  const itmCost = computePharmPurchaseCost(row);
  const itmNet = computePharmPurchaseNet(row);
  return {
    ...row,
    itmExtraDis: 0,
    taxPercent: null,
    itmTaxPrice: null,
    itmTaxTotal: 0,
    itmDisMon,
    itmCost,
    itmNet,
    lineTotal: computePharmPurchaseLineTotal(row),
  };
}

export function applyPharmPurchaseDetailPatch(
  row: PurchaseDetail,
  patch: PurchaseDetailPatch
): PurchaseDetail {
  const merged: PurchaseDetail = {
    ...row,
    ...patch,
    qnty: Object.prototype.hasOwnProperty.call(patch, "qnty")
      ? toNumber(patch.qnty)
      : toNumber(row.qnty),
    bonus: Object.prototype.hasOwnProperty.call(patch, "bonus")
      ? toNumber(patch.bonus)
      : toNumber(row.bonus),
  };
  return recalculatePharmPurchaseDetailRow(merged);
}

export function computeTotalSalesValue(details: PurchaseDetail[]): number {
  const total = details.reduce(
    (sum, row) => sum + toNumber(row.itmSell) * toNumber(row.qnty),
    0
  );
  return roundMoney(total);
}

export function computeTotalDiscount(details: PurchaseDetail[]): number {
  const total = details.reduce(
    (sum, row) => sum + computePharmPurchaseDiscAmount(row),
    0
  );
  return roundMoney(total);
}

export function computePharmPurchaseHeaderTotals(
  details: PurchaseDetail[]
): Pick<
  PurchaseHeader,
  "noOfItems" | "totalQuantity" | "totalBill" | "totalDesMon" | "totalTax" | "pthNetBill"
> {
  const lines = details.map((row) => ({
    ...row,
    lineTotal: computePharmPurchaseLineTotal(row),
  }));

  const codes = new Set<string>();
  for (const row of lines) {
    const code = row.itmId?.trim();
    if (code) codes.add(code.toUpperCase());
  }

  const totalQuantity = roundMoney(
    lines.reduce((sum, row) => sum + toNumber(row.qnty) + toNumber(row.bonus), 0)
  );
  const totalBill = roundMoney(lines.reduce((sum, row) => sum + (row.lineTotal ?? 0), 0));
  const totalDesMon = computeTotalDiscount(lines);

  return {
    noOfItems: codes.size,
    totalQuantity,
    totalBill,
    totalDesMon,
    totalTax: 0,
    pthNetBill: totalBill,
  };
}
