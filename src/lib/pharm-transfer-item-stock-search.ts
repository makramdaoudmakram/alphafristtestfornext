import { getItemDefaultUnitId } from "@/lib/item-unit-options";
import {
  applyPharmTransferUnitPrices,
  catalogFallbackSellPrice,
  resolveStockSearchCostPrice,
} from "@/lib/pharm-transfer-calculations";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PharmTransferDetailPatch } from "@/types/pharm-transfer";
import type { ReturnItemStockSearchItem } from "@/types/stock";

export function patchPharmTransferDetailFromStockSearch(
  catalogItem: ItemCatalogItem,
  searchResult: ReturnItemStockSearchItem
): PharmTransferDetailPatch | { error: string } {
  const baseCostPrice = resolveStockSearchCostPrice(searchResult);
  if (baseCostPrice == null) {
    return {
      error: `Stock cost price is missing for item "${searchResult.itemCode}" batch "${searchResult.batchNo?.trim() || "—"}".`,
    };
  }

  const availableQty =
    searchResult.availableQty != null && Number.isFinite(searchResult.availableQty)
      ? searchResult.availableQty
      : searchResult.totalQuantity;

  if (!(availableQty > 0)) {
    return {
      error: `Insufficient available stock for item "${searchResult.itemCode}" batch "${searchResult.batchNo?.trim() || "—"}". Available: ${availableQty}.`,
    };
  }

  const baseItmSell = Number.isFinite(searchResult.salesPrice)
    ? searchResult.salesPrice
    : catalogFallbackSellPrice(catalogItem);
  const unitId = getItemDefaultUnitId(catalogItem) ?? 0;
  const prices = applyPharmTransferUnitPrices(baseItmSell, baseCostPrice, 1);

  return {
    itmId: catalogItem.itmCode?.trim() ?? searchResult.itemCode.trim(),
    itemCatalogId: searchResult.itemCatalogId,
    itmNameAr: catalogItem.itmNameAr ?? searchResult.itemNameAr,
    itmNameEn: catalogItem.itmNameEn ?? searchResult.itemNameEn,
    unitId,
    qnty: 1,
    itmSell: prices.itmSell,
    purchPrice: prices.purchPrice,
    baseItmSell,
    baseCostPrice,
    priceQtyNet: prices.priceQtyNet,
    batchNo: searchResult.batchNo?.trim() ?? "",
    expDate: searchResult.expDate?.slice(0, 10) ?? "",
    stockId: searchResult.stockId,
    stockAvailableQty: availableQty,
  };
}

export function findEmptyPharmTransferDetailRowIndex(
  details: readonly { itmId?: string | null }[]
): number {
  return details.findIndex((row) => !row.itmId?.trim());
}

/** Client-side check: transfer qty must not exceed stock AvailableQty (display units). */
export function validatePharmTransferQtyAgainstAvailable(
  qnty: number,
  stockAvailableQty: number | null | undefined
): string | null {
  if (stockAvailableQty == null || !Number.isFinite(stockAvailableQty))
    return null;
  if (!(qnty > stockAvailableQty)) return null;
  return `Quantity ${qnty} exceeds available stock ${stockAvailableQty}.`;
}
