import * as XLSX from "xlsx";
import type {
  PurTransDExcelPreview,
  PurTransDExcelPreviewRow,
} from "@/types/purchase";

const PROPERTY_NAME = /^[A-Za-z][A-Za-z0-9]*$/;

function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

function looksLikeFriendlyHeader(values: string[]): boolean {
  return values.some(
    (value) =>
      value.includes(" ") ||
      value.includes("*") ||
      value.toLowerCase().includes("(key)")
  );
}

function scorePropertyHeader(values: string[]): number {
  const matches = values.filter((value) => PROPERTY_NAME.test(value)).length;
  if (matches >= 2 && matches >= values.length / 2) return matches;
  return 0;
}

function normalizePreviewRow(
  excelRowNumber: number,
  values: Record<string, string>
): PurTransDExcelPreviewRow {
  const get = (name: string) => values[name] ?? values[name.toLowerCase()] ?? "";
  return {
    excelRowNumber,
    itmId: get("ItmId"),
    itmNameAr: get("ItmNameAr"),
    itmNameEn: get("ItmNameEn"),
    qnty: get("Qnty"),
    bonus: get("Bonus"),
    unitId: get("UnitId"),
    itmPurPrice: get("ItmPurPrice"),
    itmSell: get("ItmSell"),
    itmTaxPrice: get("ItmTaxPrice"),
    itmExtraDis: get("ItmExtraDis"),
    itmDisPer: get("ItmDisPer"),
    itmDisMon: get("ItmDisMon"),
    expDate: get("ExpDate"),
    stoId: get("StoId"),
  };
}

export function parsePurTransDExcelPreview(
  buffer: ArrayBuffer,
  fileName: string
): PurTransDExcelPreview {
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

  let headerRowIndex = -1;
  let bestScore = 0;
  const scanLimit = Math.min(matrix.length, 10);
  for (let i = 0; i < scanLimit; i++) {
    const values = (matrix[i] ?? []).map(cellText).filter(Boolean);
    const score = scorePropertyHeader(values);
    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = i;
    }
  }

  if (headerRowIndex < 0 || bestScore === 0) {
    throw new Error(
      "Could not find property name headers. Use the PurTransD template: row 2 should contain ItmId, Qnty, UnitId."
    );
  }

  const headerCells = (matrix[headerRowIndex] ?? []).map(cellText);
  const columnNames = headerCells.filter(Boolean);
  if (!columnNames.some((name) => name === "ItmId" || name === "Qnty")) {
    throw new Error(
      "The Excel file is missing ItmId or Qnty. Download a new template from the Purchase page."
    );
  }

  const nextRow = (matrix[headerRowIndex + 1] ?? []).map(cellText);
  const firstDataIndex = looksLikeFriendlyHeader(nextRow)
    ? headerRowIndex + 2
    : headerRowIndex + 1;

  const rows: PurTransDExcelPreviewRow[] = [];
  for (let i = firstDataIndex; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    const values: Record<string, string> = {};
    let hasValue = false;
    for (let col = 0; col < columnNames.length; col++) {
      const text = cellText(cells[col]);
      values[columnNames[col]] = text;
      if (text) hasValue = true;
    }
    if (!hasValue) continue;
    rows.push(normalizePreviewRow(i + 1, values));
  }

  if (rows.length === 0) {
    throw new Error("No data rows found. Enter data starting at row 4.");
  }

  return {
    fileName,
    sheetName,
    rowCount: rows.length,
    rows,
  };
}
