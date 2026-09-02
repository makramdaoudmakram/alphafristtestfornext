import {
  resolvePharmReciveItemConversion,
  type PharmReciveStockBatch,
} from "@/lib/pharm-recive-stock-allocation";
import { expDateToMonthInput } from "@/lib/return-exp-date";
import type { ItemCatalogItem } from "@/types/item-catalog";

/** ItemCatalog.Itm_Has_Expire mapped as `itmHasExpire`. */
export function pharmReciveItemHasExpiry(item: ItemCatalogItem): boolean {
  return item.itmHasExpire === true;
}

export type PharmReciveBatchExpDateClassification =
  | "missing"
  | "unrecognized"
  | "current_month"
  | "future";

function isSameYearMonth(
  year: number,
  month: number,
  referenceDate: Date
): boolean {
  return (
    year === referenceDate.getFullYear() &&
    month === referenceDate.getMonth() + 1
  );
}

/**
 * Month keys that this ExpDate might represent.
 * Handles ISO (2026-08-01), MM/YYYY (08/2026), and slash dates
 * such as 1/8/2026 (day/month) or 8/1/2026 (month/day).
 */
function monthKeysFromExpDate(value: string): string[] {
  const shared = expDateToMonthInput(value);
  const keys = new Set<string>();
  if (shared) keys.add(shared);

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (slash) {
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    const year = Number(slash[3]);
    if (Number.isFinite(year)) {
      // Day/month/year — 1/8/2026 = 1 August 2026
      if (second >= 1 && second <= 12 && first >= 1 && first <= 31) {
        keys.add(`${year}-${String(second).padStart(2, "0")}`);
      }
      // Month/day/year — 8/1/2026 = 1 August 2026
      if (first >= 1 && first <= 12 && second >= 1 && second <= 31) {
        keys.add(`${year}-${String(first).padStart(2, "0")}`);
      }
    }
  }

  return [...keys];
}

/** Classify batch ExpDate for HasExpiry current-month rules. */
export function classifyPharmReciveBatchExpDate(
  expDate: string | null | undefined,
  referenceDate: Date = new Date()
): PharmReciveBatchExpDateClassification {
  const trimmed = expDate?.trim() ?? "";
  if (!trimmed) return "missing";

  const monthKeys = monthKeysFromExpDate(trimmed);
  if (monthKeys.length === 0) return "unrecognized";

  for (const monthKey of monthKeys) {
    const [yearText, monthText] = monthKey.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    if (!Number.isFinite(year) || !Number.isFinite(month)) continue;
    if (isSameYearMonth(year, month, referenceDate)) {
      return "current_month";
    }
  }

  return "future";
}

export function isPharmReciveExpDateInCurrentMonth(
  expDate: string | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  return classifyPharmReciveBatchExpDate(expDate, referenceDate) === "current_month";
}

/** Batches that must not contribute usable quantity when HasExpiry is true. */
export function isPharmReciveBatchExcludedForHasExpiry(
  expDate: string | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  const classification = classifyPharmReciveBatchExpDate(expDate, referenceDate);
  return classification === "current_month" || classification === "unrecognized";
}

function receivingQtyFromBase(baseQty: number, conversionValue: number): number {
  if (conversionValue <= 0) return 0;
  return baseQty / conversionValue;
}

function formatQtyForMessage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10000) / 10000;
}

export function buildPharmReciveCurrentMonthExpiryErrorMessage(
  requestedQty: number,
  usableReceivingQty: number,
  excludedReceivingQty: number
): string {
  const usable = formatQtyForMessage(usableReceivingQty);
  const excluded = formatQtyForMessage(excludedReceivingQty);
  return `Cannot use quantity ${requestedQty}. Available usable quantity is ${usable} because ${excluded} units have an expiry date in the current month and are not allowed.`;
}

export type PharmReciveExcelExpiryUsableStockResult =
  | { ok: true; unitId: number; conversionValue: number }
  | { ok: false; message: string };

function partitionHasExpiryBatchQuantities(
  batches: ReadonlyArray<PharmReciveStockBatch>,
  referenceDate: Date
): { excludedBase: number; usableBase: number } {
  let excludedBase = 0;
  let usableBase = 0;

  for (const batch of batches) {
    if (!Number.isFinite(batch.qtyBase) || batch.qtyBase <= 0) continue;

    const classification = classifyPharmReciveBatchExpDate(batch.expDate, referenceDate);
    if (classification === "current_month" || classification === "unrecognized") {
      excludedBase += batch.qtyBase;
    } else {
      usableBase += batch.qtyBase;
    }
  }

  return { excludedBase, usableBase };
}

/** For HasExpiry items: verify usable stock after excluding current-month batches. */
export async function validatePharmReciveExcelHasExpiryUsableStock(options: {
  token: string;
  item: ItemCatalogItem;
  itemCode: string;
  requestedQty: number;
  batches: ReadonlyArray<PharmReciveStockBatch>;
  referenceDate?: Date;
}): Promise<PharmReciveExcelExpiryUsableStockResult> {
  const conversionResult = await resolvePharmReciveItemConversion(
    options.token,
    options.item,
    options.itemCode,
    options.requestedQty
  );
  if ("error" in conversionResult) {
    return { ok: false, message: conversionResult.error };
  }

  const { unitId, conversionValue } = conversionResult;
  const referenceDate = options.referenceDate ?? new Date();
  const { excludedBase, usableBase } = partitionHasExpiryBatchQuantities(
    options.batches,
    referenceDate
  );

  const usableReceiving = receivingQtyFromBase(usableBase, conversionValue);
  const excludedReceiving = receivingQtyFromBase(excludedBase, conversionValue);

  if (usableReceiving + 0.0001 < options.requestedQty) {
    return {
      ok: false,
      message: buildPharmReciveCurrentMonthExpiryErrorMessage(
        options.requestedQty,
        usableReceiving,
        excludedReceiving
      ),
    };
  }

  return { ok: true, unitId, conversionValue };
}

/** Marks non-usable batches (current month + unrecognized ExpDate) in the Excel pool. */
export function excludePharmReciveCurrentMonthBatches(
  batches: PharmReciveStockBatch[],
  referenceDate: Date = new Date()
): void {
  for (const batch of batches) {
    if (isPharmReciveBatchExcludedForHasExpiry(batch.expDate, referenceDate)) {
      batch.qtyBase = 0;
    }
  }
}

export function sumPharmReciveUsableBatchBaseQty(
  batches: ReadonlyArray<PharmReciveStockBatch>,
  referenceDate: Date = new Date()
): number {
  let total = 0;
  for (const batch of batches) {
    if (!Number.isFinite(batch.qtyBase) || batch.qtyBase <= 0) continue;
    if (isPharmReciveBatchExcludedForHasExpiry(batch.expDate, referenceDate)) continue;
    total += batch.qtyBase;
  }
  return total;
}
