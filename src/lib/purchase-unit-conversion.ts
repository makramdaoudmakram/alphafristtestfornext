import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PurchaseDetail } from "@/types/purchase";

/** Same PriceQtyNet factor as UnitConversionService.ConvertToBaseUnitCore. */
export function priceQtyNetFromCatalogItem(
  item: Pick<
    ItemCatalogItem,
    "itmUnit1" | "itmUnit2" | "itmUnit3" | "itmUnit1Unit2" | "itmUnit1Unit3"
  >,
  unitId: number
): number {
  if (!Number.isFinite(unitId) || unitId <= 0) return 1;

  if (item.itmUnit3 != null && unitId === item.itmUnit3) {
    const factor = item.itmUnit1Unit3;
    if (factor == null || !Number.isFinite(factor) || factor <= 0) return 1;
    return 1 / factor;
  }

  if (item.itmUnit1 != null && unitId === item.itmUnit1) {
    return 1;
  }

  if (item.itmUnit2 != null && unitId === item.itmUnit2) {
    const factor = item.itmUnit1Unit2;
    if (factor == null || !Number.isFinite(factor) || factor <= 0) return 1;
    return 1 / factor;
  }

  return 1;
}

/** Apply API PriceQtyNet to original Unit 1 prices. Does not compute the factor. */
export function applyPriceQtyNetToBasePrices(
  basePurPrice: number,
  baseSellPrice: number,
  priceQtyNet: number | null
): { itmPurPrice: number; itmSell: number; priceQtyNet: number } {
  const factor =
    priceQtyNet != null && Number.isFinite(priceQtyNet) ? priceQtyNet : 1;
  return {
    itmPurPrice: basePurPrice * factor,
    itmSell: baseSellPrice * factor,
    priceQtyNet: factor,
  };
}

/** Recover Unit 1 prices from a displayed price and the current API PriceQtyNet. */
export function basePricesFromDisplayed(
  displayedPurPrice: number,
  displayedSellPrice: number,
  currentPriceQtyNet: number | null | undefined
): { baseItmPurPrice: number; baseItmSell: number } {
  const factor =
    currentPriceQtyNet != null &&
    Number.isFinite(currentPriceQtyNet) &&
    currentPriceQtyNet > 0
      ? currentPriceQtyNet
      : 1;
  return {
    baseItmPurPrice: displayedPurPrice / factor,
    baseItmSell: displayedSellPrice / factor,
  };
}

export function resolveRowBasePrices(row: PurchaseDetail): {
  baseItmPurPrice: number;
  baseItmSell: number;
} {
  if (row.baseItmPurPrice != null && Number.isFinite(row.baseItmPurPrice)) {
    return {
      baseItmPurPrice: row.baseItmPurPrice,
      baseItmSell:
        row.baseItmSell != null && Number.isFinite(row.baseItmSell)
          ? row.baseItmSell
          : row.itmSell,
    };
  }

  return basePricesFromDisplayed(
    row.itmPurPrice,
    row.itmSell,
    row.priceQtyNet
  );
}
