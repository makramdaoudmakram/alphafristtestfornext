import {
  getItemCatalog,
  getItemCatalogByCodes,
} from "@/lib/api-client";
import {
  findCatalogItemByCode,
  getItemUnitIds,
  mergeCatalogItemWithCache,
} from "@/lib/item-unit-options";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { ReturnItemStockSearchItem } from "@/types/stock";

/** Build a minimal catalog row from stock search snapshot (units + codes) for operational transaction pages. */
export function itemCatalogItemFromStockSearchRow(
  search: ReturnItemStockSearchItem
): ItemCatalogItem | null {
  const code = search.itemCode?.trim();
  if (!code || search.itemCatalogId <= 0) return null;

  const item: ItemCatalogItem = {
    id: search.itemCatalogId,
    itemCatalogId: search.itemCatalogId,
    itmCode: code,
    itmCode2: null,
    itmIntCode: null,
    itmNameAr: search.itemNameAr,
    itmNameEn: search.itemNameEn,
    itmDefSellPrice: search.salesPrice,
    itmDefTax: null,
    itmDefPharmPrice: search.costPrice,
    itmHasExpire: null,
    itmActive: true,
    itmStopSell: false,
    itmSrvc: false,
    itmStopPur: false,
    itmPrintBarcode: false,
    itmAllowDiscount: true,
    itmFreez: false,
    stopTransfer: false,
    brandId: null,
    brandName: null,
    itmGroup: null,
    groupName: null,
    itemForm: null,
    itemFormName: null,
    itmOrigin: null,
    itemOriginName: null,
    itmNotes: null,
    itmMaxDiscPer: null,
    itmMaxDiscVal: null,
    itmUnit1: search.itmUnit1 ?? null,
    itmUnit2: search.itmUnit2 ?? null,
    itmUnit3: search.itmUnit3 ?? null,
    itmUnit1Unit2: search.itmUnit1Unit2 ?? null,
    itmUnit1Unit3: search.itmUnit1Unit3 ?? null,
    child: null,
  };

  return getItemUnitIds(item).length > 0 ? item : null;
}

/**
 * Resolve ItemCatalog for operational stock pickers without requiring admin ItemCatalog page (GetById).
 * Order: cache → search-row snapshot → by-codes (shared lookup) → GetById fallback.
 */
export async function resolveCatalogItemForStockSearch(
  token: string,
  searchResult: ReturnItemStockSearchItem,
  itemByCode: Map<string, ItemCatalogItem>,
  catalogItems?: readonly ItemCatalogItem[]
): Promise<ItemCatalogItem | null> {
  let catalogItem =
    findCatalogItemByCode(searchResult.itemCode, itemByCode, catalogItems) ?? null;

  const fromSearchRow = itemCatalogItemFromStockSearchRow(searchResult);
  if (
    fromSearchRow &&
    (!catalogItem || getItemUnitIds(catalogItem).length === 0)
  ) {
    catalogItem = mergeCatalogItemWithCache(fromSearchRow, itemByCode, catalogItems);
  }

  if (catalogItem && getItemUnitIds(catalogItem).length > 0) {
    return catalogItem;
  }

  const code = searchResult.itemCode?.trim();
  if (code) {
    try {
      const matches = await getItemCatalogByCodes(token, [code]);
      const match =
        matches.find((row) => row.itmCode?.trim().toLowerCase() === code.toLowerCase()) ??
        matches[0] ??
        null;
      if (match && getItemUnitIds(match).length > 0) {
        return match;
      }
      if (match) catalogItem = match;
    } catch {
      // Fall through to id lookup or snapshot row.
    }
  }

  if (searchResult.itemCatalogId > 0) {
    try {
      const loaded = await getItemCatalog(searchResult.itemCatalogId, token);
      if (getItemUnitIds(loaded).length > 0) return loaded;
      catalogItem = loaded;
    } catch {
      // Pharmacy accounts often lack ItemCatalog admin page access (GetById).
    }
  }

  return catalogItem && getItemUnitIds(catalogItem).length > 0
    ? catalogItem
    : fromSearchRow ?? catalogItem;
}
