import * as XLSX from "xlsx";
import {
  PHARM_RECIVE_EXCEL_TEMPLATE_HEADERS,
  type PharmReciveExcelPreview,
  type PharmReciveExcelPreviewRow,
} from "@/types/pharm-recive-excel";

const REQUIRED_HEADERS = PHARM_RECIVE_EXCEL_TEMPLATE_HEADERS;

function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function headerMatches(actual: string, expected: string): boolean {
  return normalizeHeader(actual) === normalizeHeader(expected);
}

function findHeaderRowIndex(matrix: unknown[][]): number {
  const scanLimit = Math.min(matrix.length, 15);
  for (let i = 0; i < scanLimit; i++) {
    const cells = (matrix[i] ?? []).map(cellText).filter(Boolean);
    const hasCode = cells.some((cell) => headerMatches(cell, "Code"));
    const hasQty = cells.some((cell) => headerMatches(cell, "Quantity"));
    if (hasCode && hasQty) return i;
  }
  return -1;
}

function columnIndex(headers: string[], title: string): number {
  const index = headers.findIndex((header) => headerMatches(header, title));
  return index;
}

function normalizePreviewRow(
  excelRowNumber: number,
  values: Record<string, string>
): PharmReciveExcelPreviewRow {
  return {
    excelRowNumber,
    itmId: values.itmId ?? "",
    itmNameAr: values.itmNameAr ?? "",
    itmNameEn: values.itmNameEn ?? "",
    qnty: values.qnty ?? "",
  };
}

export function parsePharmReciveExcelPreview(
  buffer: ArrayBuffer,
  fileName: string
): PharmReciveExcelPreview {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The uploaded file does not contain any worksheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(
    sheet,
    { header: 1, defval: "", raw: false }
  );

  const headerRowIndex = findHeaderRowIndex(matrix);
  if (headerRowIndex < 0) {
    throw new Error(
      `Could not find required headers. Expected: ${REQUIRED_HEADERS.join(", ")}.`
    );
  }

  const headerCells = (matrix[headerRowIndex] ?? []).map(cellText);
  const codeIndex = columnIndex(headerCells, "Code");
  const arIndex = columnIndex(headerCells, "Arabic Name");
  const enIndex = columnIndex(headerCells, "English Name");
  const qtyIndex = columnIndex(headerCells, "Quantity");

  if (codeIndex < 0 || qtyIndex < 0) {
    throw new Error(
      `The Excel file is missing required columns. Expected: ${REQUIRED_HEADERS.join(", ")}.`
    );
  }

  const rows: PharmReciveExcelPreviewRow[] = [];
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    const values = {
      itmId: cellText(cells[codeIndex]),
      itmNameAr: arIndex >= 0 ? cellText(cells[arIndex]) : "",
      itmNameEn: enIndex >= 0 ? cellText(cells[enIndex]) : "",
      qnty: cellText(cells[qtyIndex]),
    };

    if (!values.itmId && !values.qnty && !values.itmNameAr && !values.itmNameEn) {
      continue;
    }

    rows.push(normalizePreviewRow(i + 1, values));
  }

  if (rows.length === 0) {
    throw new Error("No data rows found below the header row.");
  }

  return {
    fileName,
    sheetName,
    rowCount: rows.length,
    rows,
  };
}
