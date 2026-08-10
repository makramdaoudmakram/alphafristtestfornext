import type { GridColumnDefinition } from "@/types/grid-column";
import { getGridStorageKeys, GRID_MODULE_KEYS } from "@/lib/grid-storage-keys";

/** Unified LocalStorage keys for Purchase detail grid. */
export const {
  preferencesKey: PURCHASE_DETAIL_GRID_STORAGE_KEY,
  legacyWidthKey: PURCHASE_DETAIL_GRID_LEGACY_WIDTH_KEY,
} = getGridStorageKeys(GRID_MODULE_KEYS.purchaseDetail);

/** Generic column configuration for the Purchase detail (PurTransD) grid. */
export const PURCHASE_DETAIL_GRID_COLUMNS: readonly GridColumnDefinition[] = [
  { key: "line", title: "#", required: true, defaultWidth: 44 },
  { key: "itmNameAr", title: "Item Name Arabic", required: true, defaultWidth: 148 },
  { key: "itmNameEn", title: "Item Name English", defaultWidth: 148 },
  { key: "qnty", title: "Quantity", defaultWidth: 88 },
  { key: "bonus", title: "Bonus", defaultWidth: 88 },
  { key: "unitId", title: "Unit", defaultWidth: 120 },
  { key: "itmPurPrice", title: "Purchase Price", defaultWidth: 96 },
  { key: "itmSell", title: "Sales Price", defaultWidth: 96 },
  { key: "itmTaxPrice", title: "Tax Price", defaultWidth: 96 },
  { key: "itmTaxTotal", title: "Tax Total", defaultWidth: 88 },
  { key: "itmExtraDis", title: "Extra Discount", defaultWidth: 96 },
  { key: "itmDisPer", title: "Discount %", defaultWidth: 88 },
  { key: "itmDisMon", title: "Discount Amount", defaultWidth: 96 },
  { key: "itmCost", title: "Cost", defaultWidth: 88 },
  { key: "itmNet", title: "Net", defaultWidth: 88 },
  { key: "stdItmStock", title: "Std Stock", defaultWidth: 88 },
  { key: "stoId", title: "Store", defaultWidth: 96 },
  { key: "expDate", title: "Exp MM/YYYY", defaultWidth: 112 },
  { key: "lineTotal", title: "Total", defaultWidth: 104 },
  { key: "actions", title: "Actions", required: true, defaultWidth: 52, hideFromMenu: true },
] as const;

/** Column keys used for keyboard navigation on the purchase detail grid. */
export const PURCHASE_DETAIL_EDITABLE_COLUMNS = [
  "itmNameAr",
  "itmNameEn",
  "qnty",
  "bonus",
  "unitId",
  "itmPurPrice",
  "itmSell",
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

export function getPurchaseFocusColumnAfter(
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

/** Resets Purchase detail grid preferences to defaults (for toolbar integration). */
export function resetPurchaseDetailGridPreferences(resetPreferences: () => void): void {
  resetPreferences();
}
