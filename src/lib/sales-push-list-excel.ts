import * as XLSX from "xlsx";
import { getItemCatalogByCodes } from "@/lib/api-client";
import { getSalesPushListBatches } from "@/lib/sales-push-list-api";
import {
  displaySearchText,
  duplicateKey,
  emptyFormValues,
  validateFormValues,
} from "@/lib/sales-push-list-validation";
import {
  SALES_PUSH_LIST_EXCEL_HEADERS,
  type SalesPushListFormValues,
  type SalesPushListImportPreview,
  type SalesPushListImportRow,
  type SalesPushListItem,
} from "@/types/sales-push-list";

function cellText(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function columnIndex(headers: string[], title: string): number {
  return headers.findIndex(
    (header) => normalizeHeader(header) === normalizeHeader(title)
  );
}

function parseDecimal(raw: string, column: string): { value?: number; error?: string } {
  if (raw === "") return { error: `Invalid ${column}` };
  const value = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return { error: `Invalid ${column}` };
  return { value };
}

function parseDate(raw: string, column: string): { value?: string; error?: string } {
  if (!raw) return { error: `${column} is required` };
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return { value: raw.slice(0, 10) };

  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber > 20000 && asNumber < 80000) {
    const utc = Math.round((asNumber - 25569) * 86400 * 1000);
    const date = new Date(utc);
    if (!Number.isNaN(date.getTime())) {
      return { value: date.toISOString().slice(0, 10) };
    }
  }

  return { error: `Invalid date in ${column}` };
}

function parseBool(raw: string): { value?: boolean; error?: string } {
  if (raw === "") return { value: true };
  const normalized = raw.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return { value: true };
  if (["false", "0", "no", "n"].includes(normalized)) return { value: false };
  return { error: "Invalid boolean value in Active" };
}

function parseRowValues(row: {
  itemCode: string;
  batchNo: string;
  percentRaw: string;
  comectionRaw: string;
  startdateRaw: string;
  endDateRaw: string;
  activeRaw: string;
}): { parsed: SalesPushListFormValues | null; errors: string[] } {
  const errors: string[] = [];
  const defaults = emptyFormValues();

  if (!row.itemCode.trim()) errors.push("ItemCode is required");
  if (!row.batchNo.trim()) errors.push("BatchNo is required");

  const percent = parseDecimal(row.percentRaw, "Discount %");
  if (percent.error) errors.push(percent.error);

  const comection = parseDecimal(row.comectionRaw, "Discount Value");
  if (comection.error) errors.push(comection.error);

  const startdate = parseDate(row.startdateRaw, "Start Date");
  if (startdate.error) errors.push(startdate.error);

  const endDate = parseDate(row.endDateRaw, "End Date");
  if (endDate.error) errors.push(endDate.error);

  const active = parseBool(row.activeRaw);
  if (active.error) errors.push(active.error);

  const parsed: SalesPushListFormValues = {
    itemCode: row.itemCode.trim(),
    batchNo: row.batchNo.trim(),
    arabicName: "",
    englishName: "",
    searchText: row.itemCode.trim(),
    percent: percent.value ?? defaults.percent,
    comection: comection.value ?? defaults.comection,
    startdate: startdate.value ?? "",
    endDate: endDate.value ?? "",
    active: active.value ?? true,
  };

  if (errors.length === 0) {
    errors.push(...validateFormValues(parsed).filter((message) => message !== "Item is required"));
  }

  return {
    parsed: parsed.itemCode || parsed.startdate ? parsed : null,
    errors,
  };
}

export function parseSalesPushListExcel(
  buffer: ArrayBuffer,
  fileName: string,
  existingRows: SalesPushListItem[]
): SalesPushListImportPreview {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The uploaded file does not contain any worksheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (matrix.length === 0) {
    throw new Error("Import failed\n\nMissing column:\nItemCode");
  }

  const headerCells = (matrix[0] ?? []).map(cellText);
  const missingColumns = SALES_PUSH_LIST_EXCEL_HEADERS.filter(
    (header) => columnIndex(headerCells, header) < 0
  );
  if (missingColumns.length > 0) {
    throw new Error(`Import failed\n\nMissing column:\n${missingColumns.join("\n")}`);
  }

  const indexes = Object.fromEntries(
    SALES_PUSH_LIST_EXCEL_HEADERS.map((header) => [
      header,
      columnIndex(headerCells, header),
    ])
  ) as Record<(typeof SALES_PUSH_LIST_EXCEL_HEADERS)[number], number>;

  const existingKeys = new Set(
    existingRows
      .filter((row) => row.itemCode.trim())
      .map((row) => duplicateKey(row))
  );

  const excelKeys = new Map<string, number[]>();
  const rows: SalesPushListImportRow[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    const itemCode = cellText(cells[indexes.ItemCode]);
    const batchNo = cellText(cells[indexes.BatchNo]);
    const percentRaw = cellText(cells[indexes.Percent]);
    const comectionRaw = cellText(cells[indexes.Comection]);
    const startdateRaw = cellText(cells[indexes.Startdate]);
    const endDateRaw = cellText(cells[indexes.EndDate]);
    const activeRaw = cellText(cells[indexes.Active]);

    if (
      !itemCode &&
      !batchNo &&
      !percentRaw &&
      !comectionRaw &&
      !startdateRaw &&
      !endDateRaw &&
      !activeRaw
    ) {
      continue;
    }

    const { parsed, errors } = parseRowValues({
      itemCode,
      batchNo,
      percentRaw,
      comectionRaw,
      startdateRaw,
      endDateRaw,
      activeRaw,
    });

    const excelRowNumber = i + 1;
    if (parsed?.itemCode) {
      const key = duplicateKey(parsed);
      const seen = excelKeys.get(key) ?? [];
      seen.push(excelRowNumber);
      excelKeys.set(key, seen);
    }

    rows.push({
      excelRowNumber,
      itemCode,
      batchNo,
      arabicName: "",
      englishName: "",
      percentRaw,
      comectionRaw,
      startdateRaw,
      endDateRaw,
      activeRaw,
      valid: errors.length === 0,
      errors,
      parsed,
    });
  }

  if (rows.length === 0) {
    throw new Error("No data rows found below the header row.");
  }

  for (const [key, excelRowNumbers] of excelKeys.entries()) {
    const duplicateInFile = excelRowNumbers.length > 1;
    const duplicateExisting = existingKeys.has(key);
    if (!duplicateInFile && !duplicateExisting) continue;

    for (const excelRowNumber of excelRowNumbers) {
      const row = rows.find((item) => item.excelRowNumber === excelRowNumber);
      if (!row) continue;
      if (duplicateInFile) row.errors.push("Duplicate record");
      if (duplicateExisting) {
        row.errors.push(
          "Duplicate record — matches an existing saved row (ItemCode + BatchNo + Start Date + End Date)"
        );
      }
      row.valid = false;
    }
  }

  const validRows = rows.filter((row) => row.valid).length;
  return {
    fileName,
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
    rows,
  };
}

export async function resolveSalesPushListImportItems(
  token: string,
  preview: SalesPushListImportPreview
): Promise<SalesPushListImportPreview> {
  const codes = preview.rows.map((row) => row.itemCode).filter(Boolean);
  const catalog = await getItemCatalogByCodes(token, codes);
  const byCode = new Map(
    catalog
      .filter((item) => item.itmCode?.trim())
      .map((item) => [item.itmCode!.trim().toLowerCase(), item])
  );

  const uniqueCodes = [...new Set(codes.map((code) => code.trim().toLowerCase()))];
  const batchesByCode = new Map<string, Set<string>>();
  for (const code of uniqueCodes) {
    const catalogItem = [...byCode.values()].find(
      (item) => item.itmCode?.trim().toLowerCase() === code
    );
    if (!catalogItem?.itmCode) continue;
    const batches = await getSalesPushListBatches(token, catalogItem.itmCode);
    batchesByCode.set(
      catalogItem.itmCode.trim().toLowerCase(),
      new Set(batches.map((batch) => batch.batchNo.trim().toLowerCase()))
    );
  }

  const rows = preview.rows.map((row) => {
    const match = row.itemCode.trim()
      ? byCode.get(row.itemCode.trim().toLowerCase())
      : undefined;
    if (!row.itemCode.trim()) return row;
    if (!match) {
      const errors = row.errors.includes("Item not found")
        ? row.errors
        : [...row.errors, "Item not found"];
      return {
        ...row,
        valid: false,
        errors,
        parsed: row.parsed,
      };
    }

    const arabicName = match.itmNameAr?.trim() ?? "";
    const englishName = match.itmNameEn?.trim() ?? "";
    const parsed = row.parsed
      ? {
          ...row.parsed,
          itemCode: match.itmCode?.trim() || row.itemCode.trim(),
          batchNo: row.batchNo.trim() || row.parsed.batchNo,
          arabicName,
          englishName,
          searchText: displaySearchText({
            itemCode: match.itmCode?.trim() || row.itemCode,
            arabicName,
            englishName,
          }),
        }
      : null;

    const batchSet = batchesByCode.get(
      (match.itmCode?.trim() || row.itemCode).toLowerCase()
    );
    const batchNo = (parsed?.batchNo || row.batchNo).trim();
    const extraErrors: string[] = [];
    if (batchNo && batchSet && !batchSet.has(batchNo.toLowerCase())) {
      extraErrors.push("Batch does not belong to item or Qty is not greater than zero");
    }

    return {
      ...row,
      itemCode: match.itmCode?.trim() || row.itemCode,
      batchNo,
      arabicName,
      englishName,
      parsed,
      errors: [...row.errors, ...extraErrors],
      valid: row.valid && extraErrors.length === 0,
    };
  });

  const validRows = rows.filter((row) => row.valid).length;
  return {
    ...preview,
    rows,
    validRows,
    invalidRows: rows.length - validRows,
  };
}

export function downloadSalesPushListExcelTemplate(): void {
  const worksheet = XLSX.utils.aoa_to_sheet([[...SALES_PUSH_LIST_EXCEL_HEADERS]]);
  worksheet["!cols"] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "SalesPushList");
  XLSX.writeFile(workbook, "SalesPushList-template.xlsx");
}
