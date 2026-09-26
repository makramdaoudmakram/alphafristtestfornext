import type { ItemCatalogItem } from "@/types/item-catalog";
import type { ReturnDetailPatch } from "@/types/return";
import {
  catalogDefaultPrices,
  patchDetailFromCatalogItem,
} from "@/lib/item-catalog-search";
import { getItemDefaultUnitId } from "@/lib/item-unit-options";
import {
  expDateToMonthInput,
  monthInputToExpDate,
} from "@/lib/return-exp-date";
import { returnDetailDisplayAvailableQty } from "@/lib/return-detail-sales-stock";
import type { ReturnItemStockSearchItem } from "@/types/stock";

export type ItemStockSearchLanguage = "en" | "ar";

export const RETURN_ITEM_STOCK_SEARCH_LIMIT = 15;
export const RETURN_ITEM_STOCK_SEARCH_DEBOUNCE_MS = 250;

function formatDisplayNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 10000) / 10000;
  const text = rounded.toFixed(4).replace(/\.?0+$/, "");
  return text || "0";
}

/** Stock.AvailableQty in base units — same source as Sales stock.availableQty. */
function resolveReturnSearchBaseAvailableQty(
  searchResult: ReturnItemStockSearchItem
): number {
  if (
    searchResult.baseAvailableQty != null &&
    Number.isFinite(searchResult.baseAvailableQty) &&
    searchResult.baseAvailableQty >= 0
  ) {
    return searchResult.baseAvailableQty;
  }
  return 0;
}

/** Unit fields from search row / catalog — same shape as Sales workspace lines. */
function returnUnitFieldsFromSearch(
  searchResult: ReturnItemStockSearchItem,
  catalogItem: ItemCatalogItem
): Pick<
  ReturnDetailPatch,
  "unit1" | "unit2" | "unit3" | "unit1Unit2" | "unit1Unit3"
> {
  return {
    unit1: searchResult.itmUnit1 ?? catalogItem.itmUnit1 ?? null,
    unit2: searchResult.itmUnit2 ?? catalogItem.itmUnit2 ?? null,
    unit3: searchResult.itmUnit3 ?? catalogItem.itmUnit3 ?? null,
    unit1Unit2: searchResult.itmUnit1Unit2 ?? catalogItem.itmUnit1Unit2 ?? null,
    unit1Unit3: searchResult.itmUnit1Unit3 ?? catalogItem.itmUnit1Unit3 ?? null,
  };
}

/** Display ExpDate as YYYY-MM-DD (API DateOnly / ISO date). */
export function formatReturnItemStockSearchExpDate(
  value: string | null | undefined
): string {
  if (!value?.trim()) return "";
  const trimmed = value.trim();
  const isoDate = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return isoDate?.[1] ?? trimmed;
}

function formatSearchResultExpDateForDetail(value: string | null): string {
  if (!value?.trim()) return "";
  const month = expDateToMonthInput(value);
  return month ? monthInputToExpDate(month) : "";
}

export function resolveItemStockSearchDisplayName(
  item: Pick<
    ReturnItemStockSearchItem,
    "itemNameAr" | "itemNameEn" | "itemName" | "itemCode"
  >,
  language?: ItemStockSearchLanguage
): string {
  if (language === "ar") {
    return (
      item.itemNameAr?.trim() ||
      item.itemNameEn?.trim() ||
      item.itemCode?.trim() ||
      item.itemName.trim()
    );
  }
  if (language === "en") {
    return (
      item.itemNameEn?.trim() ||
      item.itemNameAr?.trim() ||
      item.itemCode?.trim() ||
      item.itemName.trim()
    );
  }
  return item.itemName.trim();
}

export function getReturnItemStockSearchDisplayParts(
  item: ReturnItemStockSearchItem,
  language?: ItemStockSearchLanguage,
  options?: { preferAvailableQty?: boolean; includeBatchDetails?: boolean }
): {
  itemCode: string;
  batchNo: string;
  itemName: string;
  expDate: string;
  totalQuantity: string;
  salesPrice: string;
} {
  const qty =
    options?.preferAvailableQty &&
    item.availableQty != null &&
    Number.isFinite(item.availableQty)
      ? item.availableQty
      : item.totalQuantity;

  return {
    itemCode: item.itemCode?.trim() || "—",
    batchNo: item.batchNo?.trim() || "—",
    itemName: resolveItemStockSearchDisplayName(item, language),
    expDate: formatReturnItemStockSearchExpDate(item.expDate),
    totalQuantity: formatDisplayNumber(qty),
    salesPrice: formatDisplayNumber(item.salesPrice),
  };
}

export function formatReturnItemStockSearchLabel(
  item: ReturnItemStockSearchItem,
  language?: ItemStockSearchLanguage,
  options?: { preferAvailableQty?: boolean; includeBatchDetails?: boolean }
): string {
  const { itemName, expDate, totalQuantity, salesPrice } =
    getReturnItemStockSearchDisplayParts(item, language, options);
  if (options?.includeBatchDetails) {
    const batch = item.batchNo?.trim() || "—";
    const code = item.itemCode?.trim() || "—";
    return `${code} | ${itemName} | Batch ${batch} | Exp ${expDate} | Net ${totalQuantity} | ${salesPrice}`;
  }
  return `${itemName} / ${expDate} / ${totalQuantity} / ${salesPrice}`;
}

/** Map stock search selection onto a return detail row (catalog + selected batch). */
export function patchDetailFromStockSearchResult(
  catalogItem: ItemCatalogItem,
  searchResult: ReturnItemStockSearchItem,
  storeId: string
): ReturnDetailPatch | { error: string } {
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

  const availableQty = resolveReturnSearchBaseAvailableQty(searchResult);
  if (!(availableQty > 0)) {
    return {
      error: `Insufficient available stock for item "${searchResult.itemCode}" batch "${searchResult.batchNo.trim()}".`,
    };
  }

  const { itmPurPrice } = catalogDefaultPrices(catalogItem);
  const salesPrice = Number.isFinite(searchResult.salesPrice)
    ? searchResult.salesPrice
    : 0;
  const expDate =
    formatReturnItemStockSearchExpDate(searchResult.expDate) ||
    formatSearchResultExpDateForDetail(searchResult.expDate);

  const unitFields = returnUnitFieldsFromSearch(searchResult, catalogItem);
  const unitId = getItemDefaultUnitId(catalogItem);

  const displayAvail = returnDetailDisplayAvailableQty({
    clientRowId: "",
    stockId: searchResult.stockId,
    availableQty,
    qnty: 1,
    unitId,
    batchNo: searchResult.batchNo.trim(),
    itmId: catalogItem.itmCode ?? searchResult.itemCode,
    ...unitFields,
  });

  return {
    ...patchDetailFromCatalogItem(catalogItem),
    ...unitFields,
    stoId: storeId.trim(),
    qnty: 1,
    itmPurPrice,
    itmSell: salesPrice,
    baseItmPurPrice: itmPurPrice,
    baseItmSell: salesPrice,
    itmDisMon: 0,
    itmDisPer: 0,
    itmExtraDis: 0,
    availableQty,
    stdItmStock: displayAvail ?? 0,
    maxReturnQty: displayAvail ?? undefined,
    stockId: searchResult.stockId,
    batchNo: searchResult.batchNo.trim(),
    expDate,
    unitId,
    priceQtyNet: 1,
    skipDiscPercent: true,
    skipTax: true,
  };
}

export function findEmptyDetailRowIndex(
  details: readonly { itmId?: string | null }[]
): number {
  return details.findIndex((row) => !row.itmId?.trim());
}

export { formatReturnAvailableQty } from "@/lib/return-detail-sales-stock";
