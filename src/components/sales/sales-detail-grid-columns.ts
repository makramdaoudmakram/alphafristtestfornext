import type { GridColumnDefinition } from "@/types/grid-column";
import { getGridStorageKeys, GRID_MODULE_KEYS } from "@/lib/grid-storage-keys";

/** Storage keys for Sales detail grid (SalesTransD). */
export const {
  preferencesKey: SALES_DETAIL_GRID_STORAGE_KEY,
  legacyWidthKey: SALES_DETAIL_GRID_LEGACY_WIDTH_KEY,
} = getGridStorageKeys(GRID_MODULE_KEYS.salesDetail);

/**
 * Starter column config for Sales detail — extend when the Sales page is implemented.
 * Reuses the same master-detail grid framework as Purchase.
 */
export const SALES_DETAIL_GRID_COLUMNS: readonly GridColumnDefinition[] = [
  { key: "line", title: "#", required: true, defaultWidth: 44 },
  { key: "itmNameAr", title: "Item Name Arabic", required: true, defaultWidth: 148 },
  { key: "itmNameEn", title: "Item Name English", defaultWidth: 148 },
  { key: "qnty", title: "Quantity", defaultWidth: 88 },
  { key: "itmSell", title: "Sales Price", defaultWidth: 96 },
  { key: "itmDisPer", title: "Discount %", defaultWidth: 88 },
  { key: "itmDisMon", title: "Discount Amount", defaultWidth: 96 },
  { key: "itmTaxTotal", title: "Tax", defaultWidth: 88 },
  { key: "lineTotal", title: "Total", defaultWidth: 104 },
  { key: "actions", title: "Actions", required: true, defaultWidth: 52, hideFromMenu: true },
] as const;

export const SALES_DETAIL_EDITABLE_COLUMNS = [
  "itmNameAr",
  "itmNameEn",
  "qnty",
  "itmSell",
  "itmDisPer",
  "itmDisMon",
  "itmTaxTotal",
] as const;

export function getSalesFocusColumnAfter(
  appliedColumnKey: string,
  visibleEditableColumns: readonly string[]
): string | undefined {
  if (appliedColumnKey !== "itmNameAr" && appliedColumnKey !== "itmNameEn") {
    return undefined;
  }

  if (visibleEditableColumns.includes("qnty")) {
    return "qnty";
  }

  return visibleEditableColumns.find(
    (columnKey) => columnKey !== "itmNameAr" && columnKey !== "itmNameEn"
  );
}
