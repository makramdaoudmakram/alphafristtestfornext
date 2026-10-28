import type { ItemCatalogItem } from "@/types/item-catalog";
import type { ReturnDetailPatch } from "@/types/return";
import {
  expDateToMonthInput,
  monthInputToExpDate,
} from "@/lib/purchase-exp-date";
import {
  getCanonicalItemCatalogCode,
} from "@/lib/item-unit-options";
import {
  patchDetailFromStockSearchResult,
} from "@/lib/return-item-stock-search";
import type { ReturnItemStockSearchItem } from "@/types/stock";

/** API / ReturnTransD expect YYYY-MM-01; normalize from stock search or MM/YYYY UI. */
export function normalizePharmPurchaseReturnExpDateForApi(
  value: string | null | undefined
): string {
  const month = expDateToMonthInput(value ?? "");
  return month ? monthInputToExpDate(month) : "";
}

function hasReturnableStockBatch(searchResult: ReturnItemStockSearchItem): boolean {
  return (
    (searchResult.stockId ?? 0) > 0 && Boolean(searchResult.batchNo?.trim())
  );
}

/**
 * Pharmacy purchase return: require a real stock batch (same rules as sales return stock pick).
 */
export function patchDetailFromPharmPurchaseReturnStockSearch(
  catalogItem: ItemCatalogItem,
  searchResult: ReturnItemStockSearchItem,
  storeId: string
): ReturnDetailPatch | { error: string } {
  if (!hasReturnableStockBatch(searchResult)) {
    return {
      error: `No stock record for item "${searchResult.itemCode}" batch "${searchResult.batchNo?.trim() || "—"}".`,
    };
  }

  const stockPatch = patchDetailFromStockSearchResult(
    catalogItem,
    searchResult,
    storeId
  );
  if ("error" in stockPatch) return stockPatch;

  const canonicalItmId =
    getCanonicalItemCatalogCode(catalogItem) ||
    searchResult.itemCode?.trim() ||
    "";

  const expDate = normalizePharmPurchaseReturnExpDateForApi(stockPatch.expDate);

  return {
    ...stockPatch,
    itmId: canonicalItmId,
    expDate,
  };
}
