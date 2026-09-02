import type { StockBatchItem } from "@/types/stock";

/** Display quantity uses Unit3 when available (same as stock table). */
export function inventoryDisplayQty(row: StockBatchItem): number {
  return row.qtyUnit3 != null && Number.isFinite(row.qtyUnit3)
    ? row.qtyUnit3
    : row.qty;
}

export type InventoryStockStatus = "in_stock" | "low_stock" | "out_of_stock";

/** Default low-stock threshold when the API does not expose item min limits. */
export const INVENTORY_LOW_STOCK_THRESHOLD = 5;

export function getInventoryStockStatus(
  row: StockBatchItem,
  lowThreshold = INVENTORY_LOW_STOCK_THRESHOLD
): InventoryStockStatus {
  const qty = inventoryDisplayQty(row);
  if (qty <= 0) return "out_of_stock";
  if (qty <= lowThreshold) return "low_stock";
  return "in_stock";
}

export function inventoryStatusLabel(status: InventoryStockStatus): string {
  switch (status) {
    case "in_stock":
      return "In Stock";
    case "low_stock":
      return "Low Stock";
    case "out_of_stock":
      return "Out of Stock";
  }
}

export function inventoryItemDisplayName(row: StockBatchItem): string {
  return (
    row.itemNameEn?.trim() ||
    row.itemNameAr?.trim() ||
    row.itemCode ||
    "—"
  );
}

export function inventoryStoreDisplayName(row: StockBatchItem): string {
  return row.storeName?.trim() || `Store ${row.storeId}`;
}
