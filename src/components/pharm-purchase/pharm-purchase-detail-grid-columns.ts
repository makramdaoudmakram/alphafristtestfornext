import type { GridColumnDefinition } from "@/types/grid-column";
import { getGridStorageKeys, GRID_MODULE_KEYS } from "@/lib/grid-storage-keys";

export const {
  preferencesKey: PHARM_PURCHASE_DETAIL_GRID_STORAGE_KEY,
  legacyWidthKey: PHARM_PURCHASE_DETAIL_GRID_LEGACY_WIDTH_KEY,
} = getGridStorageKeys(GRID_MODULE_KEYS.pharmPurchaseDetail);

export const PHARM_PURCHASE_DETAIL_GRID_COLUMNS: readonly GridColumnDefinition[] = [
  { key: "line", title: "#", required: true, defaultWidth: 44 },
  { key: "itmNameAr", title: "Item Name Arabic", required: true, defaultWidth: 148 },
  { key: "itmNameEn", title: "Item Name English", defaultWidth: 148 },
  { key: "qnty", title: "Quantity", defaultWidth: 88 },
  { key: "bonus", title: "Bonus", defaultWidth: 88 },
  { key: "unitId", title: "Unit", defaultWidth: 120 },
  { key: "itmPurPrice", title: "Purchase Price", defaultWidth: 96 },
  { key: "itmSell", title: "Sales Price", defaultWidth: 96 },
  { key: "itmDisPer", title: "Discount %", defaultWidth: 88 },
  { key: "itmDisMon", title: "Discount Amount", defaultWidth: 96 },
  { key: "itmCost", title: "Cost", defaultWidth: 88 },
  { key: "itmNet", title: "Net", defaultWidth: 88 },
  { key: "stoId", title: "Store", defaultWidth: 160 },
  { key: "expDate", title: "Exp MM/YYYY", defaultWidth: 112 },
  { key: "lineTotal", title: "Sales Total", defaultWidth: 104 },
  { key: "actions", title: "Actions", required: true, defaultWidth: 52, hideFromMenu: true },
] as const;

export const PHARM_PURCHASE_DETAIL_EDITABLE_COLUMNS = [
  "itmNameAr",
  "itmNameEn",
  "qnty",
  "bonus",
  "unitId",
  "itmPurPrice",
  "itmSell",
  "itmDisPer",
  "stoId",
  "expDate",
] as const;
