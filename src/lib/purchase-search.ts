import type { MovmentLookupItem } from "@/types/movment";
import type { PurchaseSearchFilters } from "@/types/purchase";

/** True when the user supplied at least one optional search condition. */
export function hasPurchaseSearchCriteria(
  filters: PurchaseSearchFilters,
  movement: MovmentLookupItem | null,
  itemCode: string | null | undefined,
  itemName: string
): boolean {
  if (filters.pthId?.trim()) return true;
  if (filters.venBillNo?.trim()) return true;
  if (filters.dateFrom?.trim()) return true;
  if (filters.dateTo?.trim()) return true;
  if (movement?.movChiledId != null) return true;
  if (itemCode?.trim()) return true;
  if (itemName.trim()) return true;
  return false;
}
