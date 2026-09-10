import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PharmTransferDetail } from "@/types/pharm-transfer";
import { applyPriceQtyNetToBasePrices } from "@/lib/purchase-unit-conversion";

export function computePharmTransferLineAmount(row: {
  qnty?: number | null;
  itmSell?: number | null;
}): number {
  return (Number(row.qnty) || 0) * (Number(row.itmSell) || 0);
}

export function computePharmTransferLineCost(row: {
  qnty?: number | null;
  purchPrice?: number | null;
}): number {
  return (Number(row.qnty) || 0) * (Number(row.purchPrice) || 0);
}

export function computePharmTransferTotals(details: readonly PharmTransferDetail[]) {
  const lines = details.filter((row) => row.itmId.trim().length > 0);
  const traTotalq = lines.reduce((sum, row) => sum + (Number(row.qnty) || 0), 0);
  const traTotals = lines.reduce((sum, row) => sum + computePharmTransferLineAmount(row), 0);
  const traTotalCost = lines.reduce((sum, row) => sum + computePharmTransferLineCost(row), 0);
  return { traTotalq, traTotals, traTotalCost };
}

/** Apply Purchase PriceQtyNet conversion to transfer base sales/cost prices. */
export function applyPharmTransferUnitPrices(
  baseSalesPrice: number,
  baseCostPrice: number,
  priceQtyNet: number | null | undefined
): { itmSell: number; purchPrice: number; priceQtyNet: number } {
  const sales = applyPriceQtyNetToBasePrices(0, baseSalesPrice, priceQtyNet ?? 1);
  const costFactor =
    priceQtyNet != null && Number.isFinite(priceQtyNet) ? priceQtyNet : 1;
  return {
    itmSell: sales.itmSell,
    purchPrice: baseCostPrice * costFactor,
    priceQtyNet: sales.priceQtyNet,
  };
}

export function resolvePharmTransferBasePrices(row: PharmTransferDetail): {
  baseItmSell: number;
  baseCostPrice: number;
} {
  if (
    row.baseItmSell != null &&
    Number.isFinite(row.baseItmSell) &&
    row.baseCostPrice != null &&
    Number.isFinite(row.baseCostPrice)
  ) {
    return {
      baseItmSell: row.baseItmSell,
      baseCostPrice: row.baseCostPrice,
    };
  }

  const factor =
    row.priceQtyNet != null && Number.isFinite(row.priceQtyNet) && row.priceQtyNet > 0
      ? row.priceQtyNet
      : 1;

  return {
    baseItmSell: (Number(row.itmSell) || 0) / factor,
    baseCostPrice: (Number(row.purchPrice) || 0) / factor,
  };
}

export function catalogFallbackSellPrice(item: ItemCatalogItem | null | undefined): number {
  return item?.itmDefSellPrice != null && Number.isFinite(item.itmDefSellPrice)
    ? item.itmDefSellPrice
    : 0;
}

/**
 * Stock unit cost from return/transfer stock search.
 * Backend resolves CostPrice with PurshPrice fallback (purchase snapshot pattern).
 * Do not treat 0 as a valid cost.
 */
export function resolveStockSearchCostPrice(search: {
  costPrice?: number | null;
}): number | null {
  if (search.costPrice != null && Number.isFinite(search.costPrice) && search.costPrice > 0) {
    return search.costPrice;
  }
  return null;
}
