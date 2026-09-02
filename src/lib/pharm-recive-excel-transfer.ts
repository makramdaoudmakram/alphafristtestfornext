import type { MovmentLookupItem } from "@/types/movment";
import type { PharmReciveDetail } from "@/types/pharm-recive";

const STORAGE_KEY = "pharm-recive-excel-import-pending";
const CONTEXT_KEY = "pharm-recive-excel-import-context";

/** Header snapshot stored when navigating main → Excel, and restored on return. */
export type PharmReciveExcelImportHeader = {
  movement: MovmentLookupItem | null;
  fathId: number | null;
  movDate: string;
  movStor: string;
  movDis: string;
  accountDept: string;
  accountCREDIT: string;
  monNote: string;
};

export type PharmReciveExcelImportTransfer = {
  details: PharmReciveDetail[];
  header?: PharmReciveExcelImportHeader;
};

/** Session context written by the main PharmReceive page before Excel import. */
export type PharmReciveExcelImportContext = PharmReciveExcelImportHeader & {
  storeLabel?: string;
};

export function buildPharmReciveExcelImportHeaderFromContext(
  context: PharmReciveExcelImportContext
): PharmReciveExcelImportHeader {
  return {
    movement: context.movement,
    fathId: context.fathId,
    movDate: context.movDate,
    movStor: context.movStor,
    movDis: context.movDis,
    accountDept: context.accountDept,
    accountCREDIT: context.accountCREDIT,
    monNote: context.monNote,
  };
}

export function storePharmReciveExcelImportContext(
  context: PharmReciveExcelImportContext
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
}

export function readPharmReciveExcelImportContext(): PharmReciveExcelImportContext | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(CONTEXT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PharmReciveExcelImportContext;
  } catch {
    return null;
  }
}

export function clearPharmReciveExcelImportContext(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CONTEXT_KEY);
}

export function storePharmReciveExcelImportTransfer(
  payload: PharmReciveExcelImportTransfer
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function consumePharmReciveExcelImportTransfer(): PharmReciveExcelImportTransfer | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as PharmReciveExcelImportTransfer;
  } catch {
    return null;
  }
}

/** Clears pending Excel row transfer only; preserves PharmReceive header context. */
export function clearPharmReciveExcelImportTransferPayload(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export const PHARM_RECIVE_EXCEL_IMPORT_RETURN_QUERY = "excelImport";
