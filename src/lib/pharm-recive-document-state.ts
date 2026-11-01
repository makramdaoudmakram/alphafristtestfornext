/** Matches backend `PharmReciveTraFlag` — document acceptance status only (not reservation state). */
export const PHARM_RECIVE_MOV_FLAG_PENDING = 1;
export const PHARM_RECIVE_MOV_FLAG_ACCEPTED = 2;

/** Known backend values only — not reservation state. */
export function isKnownPharmReciveMovFlag(movFlag: number | null | undefined): boolean {
  if (movFlag == null || !Number.isFinite(movFlag)) return false;
  const flag = Math.trunc(movFlag);
  return (
    flag === 0 ||
    flag === PHARM_RECIVE_MOV_FLAG_PENDING ||
    flag === PHARM_RECIVE_MOV_FLAG_ACCEPTED
  );
}

/** Pending pharmacy acceptance, including legacy rows that never set MovFlag (0). */
export function isPharmRecivePendingAcceptance(movFlag: number | null | undefined): boolean {
  if (!isKnownPharmReciveMovFlag(movFlag)) return false;
  const flag = Math.trunc(movFlag!);
  return flag === 0 || flag === PHARM_RECIVE_MOV_FLAG_PENDING;
}

export function isPharmReciveAccepted(movFlag: number | null | undefined): boolean {
  return movFlag === PHARM_RECIVE_MOV_FLAG_ACCEPTED;
}

/** Saved documents cannot be edited while pending or after acceptance (API enforced). */
export function canEditPharmReciveSavedDocument(
  recordId: number | null | undefined,
  movFlag: number | null | undefined
): boolean {
  if (recordId == null || recordId <= 0) return false;
  if (!isKnownPharmReciveMovFlag(movFlag)) return false;
  return !isPharmRecivePendingAcceptance(movFlag) && !isPharmReciveAccepted(movFlag);
}

/** Delete is allowed for pending issues only; accepted documents are locked. */
export function canDeletePharmReciveDocument(
  recordId: number | null | undefined,
  movFlag: number | null | undefined
): boolean {
  if (recordId == null || recordId <= 0) return false;
  if (!isKnownPharmReciveMovFlag(movFlag)) return false;
  if (isPharmReciveAccepted(movFlag)) return false;
  return isPharmRecivePendingAcceptance(movFlag);
}

/** Grid/header editing: new documents, or edit mode on a record the API still allows updating (none today). */
export function isPharmReciveFormEditable(
  mode: "view" | "new" | "edit",
  recordId: number | null | undefined,
  movFlag: number | null | undefined
): boolean {
  if (mode === "new") return true;
  if (mode !== "edit") return false;
  return canEditPharmReciveSavedDocument(recordId, movFlag);
}
