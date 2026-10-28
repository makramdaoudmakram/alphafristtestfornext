import type { ShiftClosingPreview } from "@/types/shift";

export const SHIFT_CLOSE_PENDING_INVOICES_WARNING =
  "You have to finish all pending invoices before closing the shift.";

export const SHIFT_CLOSE_PENDING_DELIVERIES_WARNING =
  "You have to finish all pending deliveries before closing the shift.";

export function hasShiftCloseBlockers(preview: ShiftClosingPreview): boolean {
  return (
    preview.unresolvedSales.length > 0 || preview.pendingDeliveries.length > 0
  );
}

/** User-facing warnings for the Close Shift form (one per active blocker). */
export function getShiftCloseWarningMessages(
  preview: ShiftClosingPreview
): string[] {
  const messages: string[] = [];
  if (preview.unresolvedSales.length > 0) {
    messages.push(SHIFT_CLOSE_PENDING_INVOICES_WARNING);
  }
  if (preview.pendingDeliveries.length > 0) {
    messages.push(SHIFT_CLOSE_PENDING_DELIVERIES_WARNING);
  }
  return messages;
}
