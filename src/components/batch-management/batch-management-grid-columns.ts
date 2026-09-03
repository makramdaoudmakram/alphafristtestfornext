import type { GridColumnDefinition } from "@/types/grid-column";
import { getGridStorageKeys, GRID_MODULE_KEYS } from "@/lib/grid-storage-keys";

export const {
  preferencesKey: BATCH_MANAGEMENT_GRID_STORAGE_KEY,
  legacyWidthKey: BATCH_MANAGEMENT_GRID_LEGACY_WIDTH_KEY,
} = getGridStorageKeys(GRID_MODULE_KEYS.batchManagement);

export const BATCH_MANAGEMENT_GRID_COLUMNS: readonly GridColumnDefinition[] = [
  { key: "item", title: "Item Name", required: true, defaultWidth: 240 },
  { key: "batchNo", title: "Batch No", required: true, defaultWidth: 148 },
  { key: "expDate", title: "ExpDate", defaultWidth: 128 },
  { key: "store", title: "Store", required: true, defaultWidth: 180 },
  { key: "salesPrice", title: "Sales Price", defaultWidth: 112 },
  { key: "costPrice", title: "Cost Price", defaultWidth: 112 },
  { key: "qty", title: "Quantity", required: true, defaultWidth: 96 },
  {
    key: "actions",
    title: "",
    required: true,
    defaultWidth: 52,
    hideFromMenu: true,
  },
] as const;
