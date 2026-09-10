import type { GridColumnDefinition } from "@/types/grid-column";
import { getGridStorageKeys, GRID_MODULE_KEYS } from "@/lib/grid-storage-keys";

export const {
  preferencesKey: PHARM_TRANSFER_DETAIL_GRID_STORAGE_KEY,
  legacyWidthKey: PHARM_TRANSFER_DETAIL_GRID_LEGACY_WIDTH_KEY,
} = getGridStorageKeys(GRID_MODULE_KEYS.transferDetail);

export const PHARM_TRANSFER_DETAIL_GRID_COLUMNS: readonly GridColumnDefinition[] = [
  { key: "line", title: "#", required: true, defaultWidth: 44 },
  { key: "itmNameEn", title: "Item Name", required: true, defaultWidth: 200 },
  { key: "batchNo", title: "Batch No", defaultWidth: 110 },
  { key: "expDate", title: "Exp. Date", defaultWidth: 110 },
  { key: "qnty", title: "Quantity", defaultWidth: 96 },
  { key: "unitId", title: "Unit", defaultWidth: 120 },
  { key: "itmSell", title: "Sales Price", defaultWidth: 112 },
  { key: "lineTotal", title: "Total Amount", defaultWidth: 120 },
  { key: "actions", title: "Actions", required: true, defaultWidth: 52, hideFromMenu: true },
] as const;

export const PHARM_TRANSFER_DETAIL_EDITABLE_COLUMNS = [
  "qnty",
  "unitId",
] as const;

export function getPharmTransferFocusColumnAfter(
  appliedColumnKey: string,
  visibleEditableColumns: readonly string[]
): string | undefined {
  if (appliedColumnKey === "itmNameEn" && visibleEditableColumns.includes("qnty")) {
    return "qnty";
  }
  return visibleEditableColumns.find((key) => key !== appliedColumnKey);
}
