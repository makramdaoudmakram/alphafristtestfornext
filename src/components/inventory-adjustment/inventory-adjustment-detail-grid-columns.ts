import type { GridColumnDefinition } from "@/types/grid-column";
import { getGridStorageKeys, GRID_MODULE_KEYS } from "@/lib/grid-storage-keys";

/** Unified LocalStorage keys for Inventory Adjustment detail grid. */
export const {
  preferencesKey: INVENTORY_ADJUSTMENT_DETAIL_GRID_STORAGE_KEY,
  legacyWidthKey: INVENTORY_ADJUSTMENT_DETAIL_GRID_LEGACY_WIDTH_KEY,
} = getGridStorageKeys(GRID_MODULE_KEYS.inventoryAdjustmentDetail);

/** Column configuration for Inventory Adjustment detail (InventoryD) grid. */
export const INVENTORY_ADJUSTMENT_DETAIL_GRID_COLUMNS: readonly GridColumnDefinition[] =
  [
    { key: "line", title: "#", required: true, defaultWidth: 44 },
    { key: "batchNo", title: "Batch No", defaultWidth: 96 },
    { key: "expDate", title: "Exp MM/YYYY", defaultWidth: 112 },
    { key: "itmCode", title: "Item Code", defaultWidth: 96 },
    { key: "itemName", title: "Item Name", required: true, defaultWidth: 160 },
    {
      key: "itmStockQty",
      title: "Stock",
      defaultWidth: 140,
      defaultVisible: true,
    },
    { key: "itmIncresQty", title: "Increase", defaultWidth: 88 },
    { key: "itemShortQty", title: "Decrease", defaultWidth: 88 },
    {
      key: "totalpurchvalue",
      title: "Total Purchase Value",
      defaultWidth: 120,
    },
    {
      key: "totalsalesvalue",
      title: "Total Sales Value",
      defaultWidth: 120,
    },
    { key: "unitId", title: "Unit", defaultWidth: 120 },
    {
      key: "actions",
      title: "Actions",
      required: true,
      defaultWidth: 52,
      hideFromMenu: true,
    },
  ] as const;

export const INVENTORY_ADJUSTMENT_DETAIL_EDITABLE_COLUMNS = [
  "itmIncresQty",
  "itemShortQty",
  "unitId",
] as const;

export function resetInventoryAdjustmentDetailGridPreferences(
  resetPreferences: () => void
): void {
  resetPreferences();
}
