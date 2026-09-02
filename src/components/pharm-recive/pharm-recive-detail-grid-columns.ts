import type { GridColumnDefinition } from "@/types/grid-column";

export const PHARM_RECIVE_DETAIL_GRID_STORAGE_KEY = "pharm-recive-detail-grid-preferences";

export const PHARM_RECIVE_DETAIL_GRID_COLUMNS: readonly GridColumnDefinition[] = [
  { key: "line", title: "#", required: true, defaultWidth: 44 },
  { key: "itemName", title: "Item", required: true, defaultWidth: 180 },
  { key: "expDate", title: "Exp MM/YYYY", defaultWidth: 112 },
  { key: "unitId", title: "Unit", defaultWidth: 120 },
  { key: "qnty", title: "Quantity", defaultWidth: 96 },
  { key: "itmSellPrice", title: "Sales Price", defaultWidth: 110 },
  { key: "lineTotal", title: "Total", defaultWidth: 100 },
  { key: "batchNo", title: "Batch No", defaultWidth: 120 },
  { key: "actions", title: "Actions", required: true, defaultWidth: 52, hideFromMenu: true },
] as const;

export const PHARM_RECIVE_DETAIL_EDITABLE_COLUMNS = [
  "itemName",
  "unitId",
  "qnty",
  "itmSellPrice",
] as const;

export function getPharmReciveFocusColumnAfter(
  appliedColumnKey: string,
  visibleEditableColumns: readonly string[]
): string | undefined {
  if (appliedColumnKey !== "itemName") return undefined;
  return visibleEditableColumns.find((key) => key !== "itemName");
}
