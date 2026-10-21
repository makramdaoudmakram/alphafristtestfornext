import type { ShiftClosingPreview } from "@/types/shift";

export const PENDING_SALES_PATH = "/dashboard/sales/pending";
export const PENDING_DELIVERY_PATH = "/dashboard/sales/delivery";

export type ShiftCloseBlockerKind = "pending-sales" | "pending-delivery";

export type ShiftCloseBlockerCheck =
  | { ok: true; preview: ShiftClosingPreview }
  | { ok: false; kind: ShiftCloseBlockerKind };

/** Same order as server shift-close validation: sales first, then delivery. */
export function classifyShiftClosingPreview(
  preview: ShiftClosingPreview
): ShiftCloseBlockerCheck {
  if (preview.unresolvedSales.length > 0) {
    return { ok: false, kind: "pending-sales" };
  }
  if (preview.pendingDeliveries.length > 0) {
    return { ok: false, kind: "pending-delivery" };
  }
  return { ok: true, preview };
}
