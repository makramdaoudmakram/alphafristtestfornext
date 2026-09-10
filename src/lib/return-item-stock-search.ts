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

/** Resolve display name for stock search / detail rows. */
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

/** Four display parts — itemName is catalog name only (no qty/price). */
export function getReturnItemStockSearchDisplayParts(
  item: ReturnItemStockSearchItem,
  language?: ItemStockSearchLanguage,
  options?: { preferAvailableQty?: boolean }
): {
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
    itemName: resolveItemStockSearchDisplayName(item, language),
    expDate: formatReturnItemStockSearchExpDate(item.expDate),
    totalQuantity: formatDisplayNumber(qty),
    salesPrice: formatDisplayNumber(item.salesPrice),
  };
}

/** Single-line display: Item Name / ExpDate / Qty / Sales Price. */
export function formatReturnItemStockSearchLabel(
  item: ReturnItemStockSearchItem,
  language?: ItemStockSearchLanguage,
  options?: { preferAvailableQty?: boolean }
): string {
  const { itemName, expDate, totalQuantity, salesPrice } =
    getReturnItemStockSearchDisplayParts(item, language, options);
  return `${itemName} / ${expDate} / ${totalQuantity} / ${salesPrice}`;
}

/** Map stock search selection onto a return detail row (catalog + selected batch). */
export function patchDetailFromStockSearchResult(
  catalogItem: ItemCatalogItem,
  searchResult: ReturnItemStockSearchItem,
  storeId: string
): ReturnDetailPatch {
  const { itmPurPrice } = catalogDefaultPrices(catalogItem);
  const salesPrice = Number.isFinite(searchResult.salesPrice)
    ? searchResult.salesPrice
    : 0;
  const qty = Number.isFinite(searchResult.totalQuantity)
    ? searchResult.totalQuantity
    : 0;
  const expDate =
    formatReturnItemStockSearchExpDate(searchResult.expDate) ||
    formatSearchResultExpDateForDetail(searchResult.expDate);

  return {
    ...patchDetailFromCatalogItem(catalogItem),
    stoId: storeId.trim(),
    qnty: qty,
    itmPurPrice,
    itmSell: salesPrice,
    baseItmPurPrice: itmPurPrice,
    baseItmSell: salesPrice,
    stdItmStock: qty,
    maxReturnQty: qty,
    batchNo: searchResult.batchNo?.trim() ?? "",
    expDate,
    unitId: getItemDefaultUnitId(catalogItem),
    priceQtyNet: 1,
    skipDiscPercent: true,
    skipTax: true,
  };
}

/** Selected search-row qty cap. Null when the row was not filled from stock search. */
export function getReturnDetailMaxQty(row: {
  batchNo?: string | null;
  maxReturnQty?: number;
  stdItmStock?: number;
}): number | null {
  if (!row.batchNo?.trim()) return null;
  if (typeof row.maxReturnQty === "number" && Number.isFinite(row.maxReturnQty) && row.maxReturnQty >= 0) {
    return row.maxReturnQty;
  }
  if (typeof row.stdItmStock === "number" && Number.isFinite(row.stdItmStock) && row.stdItmStock >= 0) {
    return row.stdItmStock;
  }
  return null;
}

export function formatReturnAvailableQty(value: number): string {
  return formatDisplayNumber(value);
}

/** First empty detail row index, or -1 when all rows have an item code. */
export function findEmptyDetailRowIndex(
  details: readonly { itmId?: string | null }[]
): number {
  return details.findIndex((row) => !row.itmId?.trim());
}
