import type { ExcelImportJobStatus } from "@/types/excel";

export function excelImportIsFinalizing(
  status: ExcelImportJobStatus | null
): boolean {
  const total = status?.totalRows ?? 0;
  const processed = status?.processedRows ?? 0;
  return (
    status?.status === "Running" && total > 0 && processed >= total
  );
}

/** Progress percent for the import UI; never shows 100% until backend status is Completed. */
export function excelImportDisplayPercent(
  status: ExcelImportJobStatus | null
): number {
  const rawPercent = status?.progressPercent ?? 0;
  if (status?.status === "Completed") {
    return 100;
  }
  if (status?.status === "Running") {
    return Math.min(rawPercent, 99);
  }
  return rawPercent;
}

export const EXCEL_IMPORT_FINALIZING_DETAIL =
  "All rows processed. Saving and finalizing the database transaction…";