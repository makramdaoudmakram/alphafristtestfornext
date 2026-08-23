import {
  ensureCatalogItemsForItmCodes,
  findCatalogItemByCode,
  isUnitIdValidForItem,
} from "@/lib/item-unit-options";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type {
  PurTransDExcelFieldError,
  PurTransDExcelPreview,
  PurTransDExcelPreviewRow,
  PurTransDExcelPreviewRowValidated,
  PurTransDExcelPreviewValidated,
} from "@/types/purchase";

const ITM_ID_MAX_LENGTH = 10;
const STO_ID_MAX_LENGTH = 15;

const FIELD_LABELS: Record<string, string> = {
  itmId: "Item Code",
  qnty: "Quantity",
  bonus: "Bonus",
  unitId: "Unit",
  itmPurPrice: "Purchase Price",
  itmSell: "Sales Price",
  itmTaxPrice: "Tax Price",
  itmExtraDis: "Extra Discount",
  itmDisPer: "Discount %",
  itmDisMon: "Discount Amount",
  expDate: "Exp Date",
  stoId: "Store",
};

type ParseNumberResult =
  | { ok: true; value: number | null }
  | { ok: false; message: string };

function pushError(
  errors: PurTransDExcelFieldError[],
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
    max?: number;
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

  if (options.max != null && value > options.max) {
    return {
      ok: false,
      message: `${label} must be at most ${options.max}.`,
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

function parseExpDate(raw: string | null | undefined): Date | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

function resolveEffectiveStoreId(
  row: PurTransDExcelPreviewRow,
  movementStoId?: string | null
): string {
  const rowStore = row.stoId?.trim();
  if (rowStore) return rowStore;
  return movementStoId?.trim() ?? "";
}

function validatePreviewRow(
  row: PurTransDExcelPreviewRow,
  itemByCode: Map<string, ItemCatalogItem>,
  movementStoId?: string | null
): PurTransDExcelPreviewRowValidated {
  const errors: PurTransDExcelFieldError[] = [];
  const code = row.itmId?.trim() ?? "";

  if (!code) {
    pushError(errors, "itmId", "Item code (ItmId) is required.");
  } else if (code.length > ITM_ID_MAX_LENGTH) {
    pushError(
      errors,
      "itmId",
      `Item code must be at most ${ITM_ID_MAX_LENGTH} characters.`
    );
  } else if (!findCatalogItemByCode(code, itemByCode)) {
    pushError(errors, "itmId", `Unknown item code '${code}'.`);
  }

  const qnty = parseStrictDecimal(row.qnty, FIELD_LABELS.qnty, {
    required: true,
    greaterThan: 0,
  });
  if (!qnty.ok) {
    pushError(errors, "qnty", qnty.message);
  }

  const bonus = parseStrictDecimal(row.bonus, FIELD_LABELS.bonus, { min: 0 });
  if (!bonus.ok) {
    pushError(errors, "bonus", bonus.message);
  }

  const unit = parseStrictDecimal(row.unitId, FIELD_LABELS.unitId, {
    required: true,
    greaterThan: 0,
  });
  if (!unit.ok) {
    pushError(errors, "unitId", unit.message);
  } else if (code && unit.value != null) {
    const item = findCatalogItemByCode(code, itemByCode);
    if (item && !isUnitIdValidForItem(item, unit.value)) {
      pushError(
        errors,
        "unitId",
        `Unit id '${unit.value}' is not valid for this item.`
      );
    }
  }

  const optionalNonNegativeFields = [
    { field: "itmPurPrice", label: FIELD_LABELS.itmPurPrice },
    { field: "itmSell", label: FIELD_LABELS.itmSell },
    { field: "itmTaxPrice", label: FIELD_LABELS.itmTaxPrice },
    { field: "itmExtraDis", label: FIELD_LABELS.itmExtraDis },
    { field: "itmDisMon", label: FIELD_LABELS.itmDisMon },
  ] as const;

  for (const { field, label } of optionalNonNegativeFields) {
    const parsed = parseStrictDecimal(row[field], label, { min: 0 });
    if (!parsed.ok) {
      pushError(errors, field, parsed.message);
    }
  }

  const discountPercent = parseStrictDecimal(row.itmDisPer, FIELD_LABELS.itmDisPer, {
    min: 0,
    max: 100,
  });
  if (!discountPercent.ok) {
    pushError(errors, "itmDisPer", discountPercent.message);
  }

  const catalogItem = code ? findCatalogItemByCode(code, itemByCode) : null;
  const expDateRaw = row.expDate?.trim() ?? "";

  if (catalogItem?.itmHasExpire === true) {
    if (!expDateRaw) {
      pushError(
        errors,
        "expDate",
        "Expiration date is required for this item."
      );
    } else if (!parseExpDate(expDateRaw)) {
      pushError(errors, "expDate", "Expiration date is invalid.");
    }
  } else if (expDateRaw && !parseExpDate(expDateRaw)) {
    pushError(errors, "expDate", "Expiration date is invalid.");
  }

  const effectiveStoreId = resolveEffectiveStoreId(row, movementStoId);
  if (!effectiveStoreId) {
    pushError(errors, "stoId", "Store (StoId) is required.");
  } else if (effectiveStoreId.length > STO_ID_MAX_LENGTH) {
    pushError(
      errors,
      "stoId",
      `Store must be at most ${STO_ID_MAX_LENGTH} characters.`
    );
  } else if (!/^\d+$/.test(effectiveStoreId)) {
    pushError(errors, "stoId", "Store id is invalid.");
  } else if (Number(effectiveStoreId) <= 0) {
    pushError(errors, "stoId", "Store id is invalid.");
  }

  return {
    ...row,
    isValid: errors.length === 0,
    errors,
  };
}

export function formatPurTransDExcelFieldError(
  row: PurTransDExcelPreviewRow,
  error: PurTransDExcelFieldError
): string {
  const rawValue = row[error.field as keyof PurTransDExcelPreviewRow];
  const valueText =
    rawValue != null && String(rawValue).trim() !== ""
      ? String(rawValue).trim()
      : null;

  if (valueText) {
    return `Row ${row.excelRowNumber} — ${error.columnTitle}: ${valueText} — ${error.message}`;
  }

  return `Row ${row.excelRowNumber} — ${error.columnTitle} — ${error.message}`;
}

/** Multi-line error block for grid display (Phase 7). */
export function formatPurTransDExcelRowErrorBlock(
  row: PurTransDExcelPreviewRow,
  error: PurTransDExcelFieldError
): string {
  const rawValue = row[error.field as keyof PurTransDExcelPreviewRow];
  const valueText =
    rawValue != null && String(rawValue).trim() !== ""
      ? String(rawValue).trim()
      : null;

  const lines = [`Row ${row.excelRowNumber}`];
  if (valueText) {
    lines.push(`${error.columnTitle}: ${valueText}`);
  }
  lines.push(`Error: ${error.message}`);
  return lines.join("\n");
}

/** Phase 6: validate enriched Excel preview rows against PurTransD rules. */
export async function validatePurTransDExcelPreview(
  preview: PurTransDExcelPreview,
  token: string,
  options?: {
    movementStoId?: string | null;
    itemByCode?: Map<string, ItemCatalogItem>;
  }
): Promise<PurTransDExcelPreviewValidated> {
  const itemByCode =
    options?.itemByCode ??
    (await ensureCatalogItemsForItmCodes(
      preview.rows.map((row) => ({ itmId: row.itmId })),
      new Map<string, ItemCatalogItem>(),
      undefined,
      token
    ));

  const rows = preview.rows.map((row) =>
    validatePreviewRow(row, itemByCode, options?.movementStoId)
  );

  return {
    ...preview,
    isValid: rows.every((row) => row.isValid),
    rows,
  };
}

export function flattenPurTransDExcelValidationErrors(
  preview: PurTransDExcelPreviewValidated
): Array<{
  rowNumber: number;
  columnName: string;
  message: string;
  displayValue: string;
}> {
  const flat: Array<{
    rowNumber: number;
    columnName: string;
    message: string;
    displayValue: string;
  }> = [];

  for (const row of preview.rows) {
    for (const error of row.errors) {
      const rawValue = row[error.field as keyof PurTransDExcelPreviewRow];
      flat.push({
        rowNumber: row.excelRowNumber,
        columnName: error.columnTitle,
        message: error.message,
        displayValue:
          rawValue != null && String(rawValue).trim() !== ""
            ? String(rawValue).trim()
            : "",
      });
    }
  }

  return flat;
}
