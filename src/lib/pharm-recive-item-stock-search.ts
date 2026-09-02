import { patchDetailFromCatalogItem } from "@/lib/item-catalog-search";
import { getItemDefaultUnitId } from "@/lib/item-unit-options";
import { formatReturnAvailableQty } from "@/lib/return-item-stock-search";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PharmReciveDetail, PharmReciveDetailPatch } from "@/types/pharm-recive";
import type { ReturnItemStockSearchItem } from "@/types/stock";

/** Item search selection — batch/expDate are assigned later by stock allocation. */
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
    batchNo: "",
    expDate: "",
    maxSearchQty: undefined,
    itmStock: 0,
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
