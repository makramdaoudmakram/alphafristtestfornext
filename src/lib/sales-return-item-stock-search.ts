import { getItemDefaultUnitId } from "@/lib/item-unit-options";
import { salesItemPrimaryLabel } from "@/lib/sales-item-search-ux";
import { createEmptySalesLine, money } from "@/lib/sales-workspace-calc";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { SalesSearchLanguage, SalesWorkspaceLine } from "@/types/sales-workspace";
import type { ReturnItemStockSearchItem } from "@/types/stock";

function unit1Factor(catalogItem: ItemCatalogItem): number {
  const factor = catalogItem.itmUnit1Unit3;
  return factor != null && factor > 0 ? factor : 1;
}

/** Display-unit available qty from stock search (Unit 1). */
export function resolveSalesReturnDisplayAvailableQty(
  searchResult: ReturnItemStockSearchItem
): number {
  if (
    searchResult.availableQty != null &&
    Number.isFinite(searchResult.availableQty)
  ) {
    return searchResult.availableQty;
  }
  return Number.isFinite(searchResult.totalQuantity)
    ? searchResult.totalQuantity
    : 0;
}

/** Base-unit available qty for invoice allocation checks. */
export function resolveSalesReturnBaseAvailableQty(
  catalogItem: ItemCatalogItem,
  searchResult: ReturnItemStockSearchItem
): number {
  return money(resolveSalesReturnDisplayAvailableQty(searchResult) * unit1Factor(catalogItem));
}

export function patchSalesReturnLineFromStockSearch(
  line: SalesWorkspaceLine,
  catalogItem: ItemCatalogItem,
  searchResult: ReturnItemStockSearchItem,
  language: SalesSearchLanguage,
  storeId: string
): SalesWorkspaceLine | { error: string } {
  if (!searchResult.stockId || searchResult.stockId <= 0) {
    return {
      error: `No stock record for item "${searchResult.itemCode}" batch "${searchResult.batchNo?.trim() || "—"}".`,
    };
  }

  if (!searchResult.batchNo?.trim()) {
    return {
      error: `Item "${searchResult.itemCode}" has no batch on the selected stock record.`,
    };
  }

  const displayAvailable = resolveSalesReturnDisplayAvailableQty(searchResult);
  const baseAvailable = resolveSalesReturnBaseAvailableQty(catalogItem, searchResult);

  const unitId = getItemDefaultUnitId(catalogItem) ?? 0;
  if (unitId <= 0) {
    return {
      error: `Item "${searchResult.itemCode}" has no units configured in the catalog.`,
    };
  }

  const hitLabel = {
    itmCode: catalogItem.itmCode ?? searchResult.itemCode,
    itmNameAr: catalogItem.itmNameAr ?? searchResult.itemNameAr ?? "",
    itmNameEn: catalogItem.itmNameEn ?? searchResult.itemNameEn ?? "",
  };
  const name = salesItemPrimaryLabel(hitLabel, language);
  const basePrice = money(
    Number.isFinite(searchResult.salesPrice) ? searchResult.salesPrice : 0
  );
  const storId = Number.parseInt(storeId.trim(), 10);

  // Fresh line state — do not spread `line` (avoids stale discount / pending batch fields).
  return {
    ...createEmptySalesLine(),
    key: line.key,
    quantity: line.quantity > 0 ? line.quantity : 1,
    itemCatalogId: searchResult.itemCatalogId,
    itemCode: hitLabel.itmCode.trim(),
    itmNameAr: hitLabel.itmNameAr,
    itmNameEn: hitLabel.itmNameEn,
    itemName: name,
    searchText: name,
    stockId: searchResult.stockId,
    batchNo: searchResult.batchNo.trim(),
    expDate: searchResult.expDate?.slice(0, 10) ?? null,
    storId: Number.isFinite(storId) ? storId : 0,
    availableQty: baseAvailable,
    unit1: catalogItem.itmUnit1 ?? null,
    unit2: catalogItem.itmUnit2 ?? null,
    unit3: catalogItem.itmUnit3 ?? null,
    unit1Unit2: catalogItem.itmUnit1Unit2 ?? null,
    unit1Unit3: catalogItem.itmUnit1Unit3 ?? null,
    itmMaxDiscPer: catalogItem.itmMaxDiscPer ?? null,
    groupNameEn: "",
    groupNameAr: "",
    unitId,
    baseUnitSellPrice: basePrice,
    unitSellPrice: basePrice,
    priceQtyNet: 1,
    /** Snapshot for display-only hints (Unit 1). */
    batchDisplayAvailableQty: displayAvailable,
  };
}

export function findEmptySalesReturnLineIndex(
  lines: readonly Pick<SalesWorkspaceLine, "itemCatalogId">[]
): number {
  return lines.findIndex((row) => row.itemCatalogId <= 0);
}
