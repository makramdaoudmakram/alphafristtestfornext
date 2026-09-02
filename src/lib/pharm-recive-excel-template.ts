import * as XLSX from "xlsx";
import {
  PHARM_RECIVE_EXCEL_TEMPLATE_HEADERS,
  type PharmReciveExcelProcessSummaryEntry,
} from "@/types/pharm-recive-excel";

export function downloadPharmReciveExcelTemplate(): void {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [...PHARM_RECIVE_EXCEL_TEMPLATE_HEADERS],
  ]);
  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 28 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "PharmRecive");
  XLSX.writeFile(workbook, "PharmRecive-template.xlsx");
}

const ERROR_EXPORT_HEADERS = [
  "Code",
  "Arabic Name",
  "English Name",
  "Error",
] as const;

export function downloadPharmReciveExcelErrors(
  errors: ReadonlyArray<PharmReciveExcelProcessSummaryEntry>
): void {
  if (errors.length === 0) return;

  const rows = errors.map((entry) => [
    entry.code ?? "",
    entry.itmNameAr?.trim() && entry.itmNameAr.trim() !== "—"
      ? entry.itmNameAr.trim()
      : "",
    entry.itmNameEn?.trim() && entry.itmNameEn.trim() !== "—"
      ? entry.itmNameEn.trim()
      : "",
    entry.result ?? "",
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([
    [...ERROR_EXPORT_HEADERS],
    ...rows,
  ]);
  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 28 },
    { wch: 60 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Items With Errors");
  XLSX.writeFile(workbook, "PharmRecive-items-with-errors.xlsx");
}

