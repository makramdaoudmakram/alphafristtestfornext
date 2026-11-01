import { createPharmTransferRepository } from "@/repository/pharm-transfer.repository";

/**
 * Operational pharmacy stock store (Sales Movement Setting), same resolver as PharmTranH send/pending.
 */
export async function fetchOperationalPharmacyStoreId(
  token: string
): Promise<number | null> {
  try {
    const context = await createPharmTransferRepository(token).getContext();
    const id = context.currentStoreId;
    return id > 0 ? id : null;
  } catch {
    return null;
  }
}
