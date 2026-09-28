import type { GridColumnDefinition } from "@/types/grid-column";
import { getGridStorageKeys, GRID_MODULE_KEYS } from "@/lib/grid-storage-keys";

/** Unified LocalStorage keys for Return detail grid. */
export const {
  preferencesKey: RETURN_DETAIL_GRID_STORAGE_KEY,
  legacyWidthKey: RETURN_DETAIL_GRID_LEGACY_WIDTH_KEY,
} = getGridStorageKeys(GRID_MODULE_KEYS.returnDetail);

/** Generic column configuration for the Return detail (ReturnTransD) grid. */
export const RETURN_DETAIL_GRID_COLUMNS: readonly GridColumnDefinition[] = [
  { key: "line", title: "#", required: true, defaultWidth: 44 },
  { key: "itmNameAr", title: "Item Name Arabic", required: true, defaultWidth: 148 },
  { key: "itmNameEn", title: "Item Name English", defaultWidth: 148 },
  { key: "batchNo", title: "Batch No", defaultWidth: 120 },
  { key: "qnty", title: "Quantity", defaultWidth: 88 },
  { key: "bonus", title: "Bonus", defaultWidth: 88 },
  { key: "unitId", title: "Unit", defaultWidth: 120 },
  { key: "itmPurPrice", title: "Purchase Price", defaultWidth: 96 },
  { key: "itmSell", title: "Sales Price", defaultWidth: 96 },
  { key: "taxPercent", title: "TaxPercent", defaultWidth: 88, defaultVisible: true },
  { key: "itmTaxPrice", title: "Tax Price", defaultWidth: 96 },
  { key: "itmTaxTotal", title: "Tax Total", defaultWidth: 88 },
  { key: "itmExtraDis", title: "Extra Discount", defaultWidth: 96 },
  { key: "itmDisPer", title: "Discount %", defaultWidth: 88 },
  { key: "itmDisMon", title: "Discount Amount", defaultWidth: 96 },
  { key: "itmCost", title: "Cost", defaultWidth: 88 },
  { key: "itmNet", title: "Net", defaultWidth: 88 },
  { key: "stdItmStock", title: "Std Stock", defaultWidth: 88 },
  { key: "stoId", title: "Store", defaultWidth: 160 },
  { key: "expDate", title: "Exp MM/YYYY", defaultWidth: 112 },
  { key: "lineTotal", title: "Total", defaultWidth: 104 },
  { key: "actions", title: "Actions", required: true, defaultWidth: 52, hideFromMenu: true },
] as const;

/** Column keys used for keyboard navigation on the return detail grid. */
export const RETURN_DETAIL_EDITABLE_COLUMNS = [
  "itmNameAr",
  "itmNameEn",
  "batchNo",
  "qnty",
  "bonus",
  "unitId",
  "itmPurPrice",
  "itmSell",
  "taxPercent",
  "itmTaxPrice",
  "itmTaxTotal",
  "itmExtraDis",
  "itmDisPer",
  "itmDisMon",
  "itmCost",
  "itmNet",
  "stdItmStock",
  "stoId",
  "expDate",
] as const;

export function getReturnFocusColumnAfter(
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

/** Resets Return detail grid preferences to defaults (for toolbar integration). */
export function resetReturnDetailGridPreferences(resetPreferences: () => void): void {
  resetPreferences();
}
