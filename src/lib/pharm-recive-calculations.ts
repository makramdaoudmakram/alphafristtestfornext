import type { PharmReciveDetail, PharmReciveHeader } from "@/types/pharm-recive";

export function computeLineTotal(row: Pick<PharmReciveDetail, "qnty" | "itmSellPrice">): number {
  const qty = Number(row.qnty) || 0;
  const price = Number(row.itmSellPrice) || 0;
  return Math.round(qty * price * 100) / 100;
}

export function mapDetailsWithLineTotals(details: PharmReciveDetail[]): PharmReciveDetail[] {
  return details.map((row) => ({
    ...row,
    lineTotal: computeLineTotal(row),
  }));
}

export function computeHeaderTotals(
  details: PharmReciveDetail[]
): Pick<
  PharmReciveHeader,
  "movTotalqunt" | "movTotalSalesPrice" | "movTotalPurchPrice" | "movTotalCostPrice"
> {
  const lines = mapDetailsWithLineTotals(details);
  return {
    movTotalqunt: lines.reduce((sum, row) => sum + (Number(row.qnty) || 0), 0),
    movTotalSalesPrice: lines.reduce((sum, row) => sum + row.lineTotal, 0),
    movTotalPurchPrice: lines.reduce(
      (sum, row) => sum + (Number(row.qnty) || 0) * (Number(row.itmPurPrice) || 0),
      0
    ),
    movTotalCostPrice: lines.reduce(
      (sum, row) => sum + (Number(row.qnty) || 0) * (Number(row.itemCostPrice) || 0),
      0
    ),
  };
}

export function applyPharmReciveDetailPatch(
  row: PharmReciveDetail,
  patch: Partial<PharmReciveDetail>
): PharmReciveDetail {
  const merged = { ...row, ...patch };
  return { ...merged, lineTotal: computeLineTotal(merged) };
}
