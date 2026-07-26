import type { PurchaseDetail, PurchaseHeader } from "@/types/purchase";

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
