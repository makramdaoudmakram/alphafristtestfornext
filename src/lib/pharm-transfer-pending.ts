import type { PharmTranPendingHeader } from "@/types/pharm-tran";

/** Outgoing pending transfers are always TraFlag = 1 on the server; the list contains only pending rows. */
export function isPharmTransferCancellable(header: PharmTranPendingHeader): boolean {
  return header.id > 0;
}

/** Pending transfers sent from the active pharmacy storage. */
export function collectOutgoingPendingForStorage(
  items: PharmTranPendingHeader[],
  pharmacyStorageId: number | null
): PharmTranPendingHeader[] {
  return items
    .filter((header) => isPharmTransferCancellable(header))
    .filter(
      (header) =>
        pharmacyStorageId == null || header.sendingPharmacyId === pharmacyStorageId
    );
}
