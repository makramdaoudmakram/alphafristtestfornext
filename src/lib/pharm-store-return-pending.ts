import type {
  PharmStoreReturnPendingHeader,
  PharmStoreReturnPendingPage,
} from "@/types/pharm-store-return";

/** Matches backend PharmStoreReturnTraFlag.PendingStoreAcceptance */
export const PHARM_STORE_RETURN_STATUS_PENDING = 1;

export function isPharmStoreReturnCancellable(
  header: PharmStoreReturnPendingHeader
): boolean {
  return header.id > 0 && header.status === PHARM_STORE_RETURN_STATUS_PENDING;
}

/** Outgoing pending returns for the active pharmacy storage (deduped across main/expire sections). */
export function collectOutgoingPendingForStorage(
  page: PharmStoreReturnPendingPage,
  pharmacyStorageId: number | null
): PharmStoreReturnPendingHeader[] {
  const byId = new Map<number, PharmStoreReturnPendingHeader>();
  for (const header of [...page.mainStore.items, ...page.expireStore.items]) {
    if (header.id > 0 && !byId.has(header.id)) {
      byId.set(header.id, header);
    }
  }

  return [...byId.values()]
    .filter((header) => isPharmStoreReturnCancellable(header))
    .filter(
      (header) =>
        pharmacyStorageId == null || header.sourceStoreId === pharmacyStorageId
    );
}
