import type { PurchaseDetail } from "@/types/purchase";

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
