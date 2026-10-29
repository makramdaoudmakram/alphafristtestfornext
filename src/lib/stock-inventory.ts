import type { StockBatchItem } from "@/types/stock";

/** Physical on-hand quantity for inventory browse (Unit3 when available). */
export function inventoryDisplayQty(row: StockBatchItem): number {
  return row.qtyUnit3 != null && Number.isFinite(row.qtyUnit3)
    ? row.qtyUnit3
    : row.qty;
}

/** Unreserved available quantity for display when the API triad is present. */
export function inventoryDisplayAvailableQty(row: StockBatchItem): number {
  if (Number.isFinite(row.availableQty)) return row.availableQty;
  const qty = Number.isFinite(row.qty) ? row.qty : 0;
  const reserved = Number.isFinite(row.transferQty) ? row.transferQty : 0;
  return qty - reserved;
}

/** Converts base-unit pending reservation to the same display unit as {@link inventoryDisplayQty}. */
export function inventoryDisplayTransferQty(row: StockBatchItem): number {
  const reserved = Number.isFinite(row.transferQty) ? row.transferQty : 0;
  if (
    row.qtyUnit3 != null &&
    Number.isFinite(row.qtyUnit3) &&
    row.qty > 0 &&
    Number.isFinite(row.qty)
  ) {
    return reserved * (row.qtyUnit3 / row.qty);
  }
  return reserved;
}

/** Available in display units (uses authoritative base AvailableQty when present). */
export function inventoryDisplayAvailableQtyInDisplayUnit(row: StockBatchItem): number {
  const baseAvailable = inventoryDisplayAvailableQty(row);
  if (
    row.qty > 0 &&
    row.qtyUnit3 != null &&
    Number.isFinite(row.qtyUnit3)
  ) {
    return baseAvailable * (row.qtyUnit3 / row.qty);
  }
  return baseAvailable;
}

export type InventoryStockStatus = "in_stock" | "low_stock" | "out_of_stock";

/** Default low-stock threshold when the API does not expose item min limits. */
export const INVENTORY_LOW_STOCK_THRESHOLD = 5;

export function getInventoryStockStatus(
  row: StockBatchItem,
  lowThreshold = INVENTORY_LOW_STOCK_THRESHOLD
): InventoryStockStatus {
  // Browse status remains based on physical on-hand (Phase 4A does not retarget browse ops).
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

/** Display triad from aggregated base totals and item unit factor (store summary rows). */
export function inventoryDisplayFromStoreSummaryTotals(row: {
  totalQty: number;
  totalTransferQty: number;
  totalAvailableQty: number;
  totalIncomingUnacceptedQty: number;
  itmUnit1Unit3: number | null;
}): { stock: number; pending: number; available: number; incoming: number } {
  const factor =
    row.itmUnit1Unit3 != null && row.itmUnit1Unit3 > 0 ? row.itmUnit1Unit3 : null;
  const synthetic = {
    qty: row.totalQty,
    transferQty: row.totalTransferQty,
    availableQty: row.totalAvailableQty,
    qtyUnit3:
      factor != null && row.totalQty > 0 ? row.totalQty / factor : null,
  } as StockBatchItem;
  const incomingSynthetic = {
    qty: row.totalIncomingUnacceptedQty,
    transferQty: 0,
    availableQty: row.totalIncomingUnacceptedQty,
    qtyUnit3:
      factor != null && row.totalIncomingUnacceptedQty > 0
        ? row.totalIncomingUnacceptedQty / factor
        : null,
  } as StockBatchItem;
  return {
    stock: inventoryDisplayQty(synthetic),
    pending: inventoryDisplayTransferQty(synthetic),
    available: inventoryDisplayAvailableQtyInDisplayUnit(synthetic),
    incoming: inventoryDisplayQty(incomingSynthetic),
  };
}

export function inventoryDisplayBaseQtyInCatalogUnit(
  quantityBase: number,
  itmUnit1Unit3: number | null | undefined
): number {
  if (itmUnit1Unit3 != null && itmUnit1Unit3 > 0) {
    return quantityBase / itmUnit1Unit3;
  }
  return quantityBase;
}
