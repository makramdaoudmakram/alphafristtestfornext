import {
  PHARM_TRANSFER_TRA_FLAG_ACCEPTED,
  PHARM_TRANSFER_TRA_FLAG_CANCELLED,
  PHARM_TRANSFER_TRA_FLAG_PENDING,
} from "@/types/pharm-transfer";

/** Display label for search/history; prefers API StatusText when present. */
export function formatPharmTransferStatusLabel(
  traFlag: number | null | undefined,
  statusText?: string | null
): string {
  const fromApi = statusText?.trim();
  if (fromApi) return fromApi;

  switch (traFlag) {
    case PHARM_TRANSFER_TRA_FLAG_PENDING:
      return "Not Accept";
    case PHARM_TRANSFER_TRA_FLAG_ACCEPTED:
      return "Accept";
    case PHARM_TRANSFER_TRA_FLAG_CANCELLED:
      return "Cancelled";
    default:
      return traFlag != null ? String(traFlag) : "—";
  }
}

export function isPharmTransferPendingTraFlag(
  traFlag: number | null | undefined
): boolean {
  return traFlag == null || traFlag === PHARM_TRANSFER_TRA_FLAG_PENDING;
}
