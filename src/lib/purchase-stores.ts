import type { PurchaseDetail } from "@/types/purchase";
import type { StorItem } from "@/types/stor";

export type MovementStoreSource = {
  movStor?: string | null;
  movStor2?: string | null;
} | null;

/** Store IDs on a Movement, in order: MovStor then MovStor2. */
export function getMovementStoreIds(movement: MovementStoreSource): string[] {
  if (!movement) return [];
  const ids: string[] = [];
  for (const raw of [movement.movStor, movement.movStor2]) {
    const id = raw?.trim() ?? "";
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** First store belonging to the selected Movement, or empty if none. */
export function getDefaultMovementStoreId(movement: MovementStoreSource): string {
  return getMovementStoreIds(movement)[0] ?? "";
}

export function formatStorDisplayName(store: Pick<StorItem, "storArName">): string {
  return store.storArName?.trim() ?? "";
}

export function isSavedPurchaseDetailRow(row: PurchaseDetail): boolean {
  return row.id != null && row.id > 0;
}

/** Apply a default StoreId to unsaved rows only. Saved rows keep their StoreId. */
export function applyDefaultStoreToNewDetailRows(
  details: PurchaseDetail[],
  storeId: string
): PurchaseDetail[] {
  return details.map((row) => {
    if (isSavedPurchaseDetailRow(row)) return row;
    return { ...row, stoId: storeId };
  });
}
