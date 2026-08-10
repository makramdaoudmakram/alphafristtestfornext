import type { GridColumnDefinition } from "@/types/grid-column";
import { getGridStorageKeys, GRID_MODULE_KEYS } from "@/lib/grid-storage-keys";

/** Storage keys for Transfer detail grid. */
export const {
  preferencesKey: TRANSFER_DETAIL_GRID_STORAGE_KEY,
  legacyWidthKey: TRANSFER_DETAIL_GRID_LEGACY_WIDTH_KEY,
} = getGridStorageKeys(GRID_MODULE_KEYS.transferDetail);

/**
 * Starter column config for Transfer detail — extend when the Transfer page is implemented.
 */
export const TRANSFER_DETAIL_GRID_COLUMNS: readonly GridColumnDefinition[] = [
  { key: "line", title: "#", required: true, defaultWidth: 44 },
  { key: "itmNameAr", title: "Item Name Arabic", required: true, defaultWidth: 148 },
  { key: "itmNameEn", title: "Item Name English", defaultWidth: 148 },
  { key: "qnty", title: "Quantity", defaultWidth: 88 },
  { key: "fromStore", title: "From Store", defaultWidth: 96 },
  { key: "toStore", title: "To Store", defaultWidth: 96 },
  { key: "lineTotal", title: "Total", defaultWidth: 104 },
  { key: "actions", title: "Actions", required: true, defaultWidth: 52, hideFromMenu: true },
] as const;

export const TRANSFER_DETAIL_EDITABLE_COLUMNS = [
  "itmNameAr",
  "itmNameEn",
  "qnty",
  "fromStore",
  "toStore",
] as const;

export function getTransferFocusColumnAfter(
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
