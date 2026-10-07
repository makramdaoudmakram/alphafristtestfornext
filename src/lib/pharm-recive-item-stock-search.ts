import { patchDetailFromCatalogItem } from "@/lib/item-catalog-search";
import { getItemDefaultUnitId } from "@/lib/item-unit-options";
import {
  formatReturnAvailableQty,
  formatReturnItemStockSearchExpDate,
} from "@/lib/return-item-stock-search";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PharmReciveDetail, PharmReciveDetailPatch } from "@/types/pharm-recive";
import type { ReturnItemStockSearchItem } from "@/types/stock";

/** Item search selection keeps the picked batch (batchNo / expDate / prices), not all batches. */
export function patchPharmReciveDetailFromItemSearch(
  catalogItem: ItemCatalogItem,
  searchResult: ReturnItemStockSearchItem
): PharmReciveDetailPatch {
  const searchQty = Number.isFinite(searchResult.totalQuantity)
    ? Math.max(1, Math.floor(searchResult.totalQuantity))
    : 1;

  return {
    ...patchDetailFromCatalogItem(catalogItem),
    qnty: searchQty,
    unitId: getItemDefaultUnitId(catalogItem),
    batchNo: searchResult.batchNo?.trim() ?? "",
    expDate: formatReturnItemStockSearchExpDate(searchResult.expDate),
    itmSellPrice: Number.isFinite(searchResult.salesPrice)
      ? searchResult.salesPrice
      : 0,
    itemCostPrice: Number.isFinite(searchResult.costPrice)
      ? searchResult.costPrice
      : 0,
    maxSearchQty: searchQty,
    itmStock: searchQty,
  };
}

/** @deprecated Use patchPharmReciveDetailFromItemSearch — batch/expDate come from allocation. */
export const patchPharmReciveDetailFromStockSearchResult =
  patchPharmReciveDetailFromItemSearch;

export function validatePharmReciveDetailQuantity(
  nextQty: number
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(nextQty)) {
    return { ok: false, message: "Quantity must be a valid number." };
  }

  if (nextQty < 1) {
    return { ok: false, message: "Quantity must be at least 1." };
  }

  return { ok: true };
}

export { formatReturnAvailableQty };

export function findEmptyPharmReciveDetailRowIndex(rows: PharmReciveDetail[]): number {
  return rows.findIndex((row) => !row.itmId.trim());
}
