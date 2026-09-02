import { findCatalogItemByCode } from "@/lib/item-unit-options";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type {
  PharmReciveExcelFieldError,
  PharmReciveExcelPreview,
  PharmReciveExcelPreviewRow,
  PharmReciveExcelPreviewRowValidated,
  PharmReciveExcelPreviewValidated,
} from "@/types/pharm-recive-excel";

const ITM_ID_MAX_LENGTH = 10;

const FIELD_LABELS: Record<string, string> = {
  itmId: "Code",
  itmNameAr: "Arabic Name",
  itmNameEn: "English Name",
  qnty: "Quantity",
};

type ParseNumberResult =
  | { ok: true; value: number | null }
  | { ok: false; message: string };

function pushError(
  errors: PharmReciveExcelFieldError[],
  field: string,
  message: string
): void {
  errors.push({
    field,
    columnTitle: FIELD_LABELS[field] ?? field,
    message,
  });
}

function parseStrictDecimal(
  raw: string | null | undefined,
  label: string,
  options: {
    required?: boolean;
    min?: number;
    greaterThan?: number;
  } = {}
): ParseNumberResult {
  const trimmed = raw?.trim() ?? "";

  if (!trimmed) {
    if (options.required) {
      return { ok: false, message: `${label} is required.` };
    }
    return { ok: true, value: null };
  }

  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { ok: false, message: `${label} must be a number.` };
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${label} must be a number.` };
  }

  if (options.min != null && value < options.min) {
    return {
      ok: false,
      message: `${label} must be at least ${options.min}.`,
    };
  }

  if (options.greaterThan != null && value <= options.greaterThan) {
    return {
      ok: false,
      message: `${label} must be greater than ${options.greaterThan}.`,
    };
  }

  return { ok: true, value };
}

function validatePreviewRow(
  row: PharmReciveExcelPreviewRow,
  itemByCode: Map<string, ItemCatalogItem>
): PharmReciveExcelPreviewRowValidated {
  const errors: PharmReciveExcelFieldError[] = [];
  const code = row.itmId?.trim() ?? "";

  if (!code) {
    pushError(errors, "itmId", "Item code is required.");
  } else if (code.length > ITM_ID_MAX_LENGTH) {
    pushError(
      errors,
      "itmId",
      `Code must be at most ${ITM_ID_MAX_LENGTH} characters.`
    );
  } else if (!findCatalogItemByCode(code, itemByCode)) {
    pushError(errors, "itmId", "Item code does not exist.");
  }

  const qnty = parseStrictDecimal(row.qnty, FIELD_LABELS.qnty, {
    required: true,
    greaterThan: 0,
  });
  if (!qnty.ok) {
    pushError(errors, "qnty", qnty.message);
  }

  return {
    ...row,
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePharmReciveExcelPreviewRow(
  row: PharmReciveExcelPreviewRow,
  itemByCode: Map<string, ItemCatalogItem>
): PharmReciveExcelPreviewRowValidated {
  return validatePreviewRow(row, itemByCode);
}

export function validatePharmReciveExcelPreview(
  preview: PharmReciveExcelPreview,
  itemByCode: Map<string, ItemCatalogItem>
): PharmReciveExcelPreviewValidated {
  const rows = preview.rows.map((row) => validatePreviewRow(row, itemByCode));
  return {
    ...preview,
    rows,
    isValid: rows.every((row) => row.isValid),
  };
}

export function flattenPharmReciveExcelValidationErrors(
  preview: PharmReciveExcelPreviewValidated
): Array<{ row: PharmReciveExcelPreviewRowValidated; error: PharmReciveExcelFieldError }> {
  return preview.rows.flatMap((row) =>
    row.errors.map((error) => ({ row, error }))
  );
}

export function formatPharmReciveExcelFieldError(
  row: PharmReciveExcelPreviewRow,
  error: PharmReciveExcelFieldError
): string {
  const rawValue = row[error.field as keyof PharmReciveExcelPreviewRow];
  const valueText =
    typeof rawValue === "number"
      ? String(rawValue)
      : typeof rawValue === "string" && rawValue.trim()
        ? rawValue.trim()
        : "(empty)";

  if (error.field === "itmId" || error.field === "qnty") {
    return `Row ${row.excelRowNumber} — ${error.columnTitle}: ${valueText} — ${error.message}`;
  }

  return `Row ${row.excelRowNumber} — ${error.columnTitle} — ${error.message}`;
}
