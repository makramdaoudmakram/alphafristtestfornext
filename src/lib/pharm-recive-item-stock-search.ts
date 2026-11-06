import { patchDetailFromCatalogItem } from "@/lib/item-catalog-search";
import { getItemDefaultUnitId } from "@/lib/item-unit-options";
import {
  formatReturnAvailableQty,
  formatReturnItemStockSearchExpDate,
} from "@/lib/return-item-stock-search";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PharmReciveDetail, PharmReciveDetailPatch } from "@/types/pharm-recive";
import type { ReturnItemStockSearchItem } from "@/types/stock";

/** Available quantity in the search row's display units (same as return-item-search DTO). */
export function resolvePharmReciveSearchAvailableQty(
  searchResult: ReturnItemStockSearchItem
): number {
  if (
    searchResult.availableQty != null &&
    Number.isFinite(searchResult.availableQty)
  ) {
    return Math.max(0, searchResult.availableQty);
  }

  const physical = Number.isFinite(searchResult.totalQuantity)
    ? searchResult.totalQuantity
    : 0;
  const reserved =
    searchResult.transferQty != null && Number.isFinite(searchResult.transferQty)
      ? searchResult.transferQty
      : 0;

  return Math.max(0, physical - reserved);
}

/** Item search selection keeps the picked batch (batchNo / expDate / prices), not all batches. */
export function patchPharmReciveDetailFromItemSearch(
  catalogItem: ItemCatalogItem,
  searchResult: ReturnItemStockSearchItem
): PharmReciveDetailPatch | { error: string } {
  const availableQty = resolvePharmReciveSearchAvailableQty(searchResult);
  const batchLabel = searchResult.batchNo?.trim() || "—";
  const itemLabel = searchResult.itemCode?.trim() || catalogItem.itmCode?.trim() || "item";

  if (availableQty <= 0) {
    return {
      error: `Insufficient available stock for item "${itemLabel}" batch "${batchLabel}". Available: 0.`,
    };
  }

  const maxSearchQty = Math.floor(availableQty);
  const qnty = Math.min(1, maxSearchQty);

  return {
    ...patchDetailFromCatalogItem(catalogItem),
    qnty,
    unitId: getItemDefaultUnitId(catalogItem),
    batchNo: searchResult.batchNo?.trim() ?? "",
    expDate: formatReturnItemStockSearchExpDate(searchResult.expDate),
    itmSellPrice: Number.isFinite(searchResult.salesPrice)
      ? searchResult.salesPrice
      : 0,
    itemCostPrice: Number.isFinite(searchResult.costPrice)
      ? searchResult.costPrice
      : 0,
    maxSearchQty,
    itmStock: maxSearchQty,
  };
}

/** @deprecated Use patchPharmReciveDetailFromItemSearch — batch/expDate come from allocation. */
export const patchPharmReciveDetailFromStockSearchResult =
  patchPharmReciveDetailFromItemSearch;

export function validatePharmReciveDetailQuantity(
  nextQty: number,
  maxSearchQty?: number
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(nextQty)) {
    return { ok: false, message: "Quantity must be a valid number." };
  }

  if (nextQty < 1) {
    return { ok: false, message: "Quantity must be at least 1." };
  }

  if (
    maxSearchQty != null &&
    Number.isFinite(maxSearchQty) &&
    nextQty > maxSearchQty
  ) {
    return {
      ok: false,
      message: `Quantity cannot exceed available quantity (${formatReturnAvailableQty(maxSearchQty)}).`,
    };
  }

  return { ok: true };
}

export { formatReturnAvailableQty };

export function findEmptyPharmReciveDetailRowIndex(rows: PharmReciveDetail[]): number {
  return rows.findIndex((row) => !row.itmId.trim());
}
