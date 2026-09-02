import {
  applyPriceQtyNetToBasePrices,
  basePricesFromDisplayed,
} from "@/lib/purchase-unit-conversion";
import { catalogDefaultPrices } from "@/lib/item-catalog-search";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { InventoryAdjustmentDetail } from "@/types/inventory-adjustment";
import type { StockBatchItem } from "@/types/stock";

/** Line totals: positive on increase, negative on decrease. */
export function computeInventoryDetailTotals(
  itmIncresQty: number,
  itemShortQty: number,
  itmPPrice: number,
  itmSalPrice: number
): { totalpurchvalue: number; totalsalesvalue: number } {
  const inc = Number.isFinite(itmIncresQty) ? itmIncresQty : 0;
  const dec = Number.isFinite(itemShortQty) ? itemShortQty : 0;
  const pur = Number.isFinite(itmPPrice) ? itmPPrice : 0;
  const sal = Number.isFinite(itmSalPrice) ? itmSalPrice : 0;

  if (inc > 0) {
    return {
      totalpurchvalue: inc * pur,
      totalsalesvalue: inc * sal,
    };
  }

  if (dec > 0) {
    return {
      totalpurchvalue: -dec * pur,
      totalsalesvalue: -dec * sal,
    };
  }

  return { totalpurchvalue: 0, totalsalesvalue: 0 };
}

/** Only one of increase/decrease may be positive at a time. */
export function applyIncreaseDecreasePatch(
  row: InventoryAdjustmentDetail,
  patch: Partial<Pick<InventoryAdjustmentDetail, "itmIncresQty" | "itemShortQty">>
): Pick<InventoryAdjustmentDetail, "itmIncresQty" | "itemShortQty"> {
  if ("itmIncresQty" in patch) {
    const inc = Math.max(0, Number(patch.itmIncresQty) || 0);
    return {
      itmIncresQty: inc,
      itemShortQty: inc > 0 ? 0 : row.itemShortQty,
    };
  }

  if ("itemShortQty" in patch) {
    const dec = Math.max(0, Number(patch.itemShortQty) || 0);
    return {
      itemShortQty: dec,
      itmIncresQty: dec > 0 ? 0 : row.itmIncresQty,
    };
  }

  return {
    itmIncresQty: row.itmIncresQty,
    itemShortQty: row.itemShortQty,
  };
}

/** Derive counted qty and totals from stock + increase − decrease. */
export function recomputeInventoryDetailFromAdjustment(
  row: InventoryAdjustmentDetail
): Pick<
  InventoryAdjustmentDetail,
  "itmQ" | "differenceQty" | "totalpurchvalue" | "totalsalesvalue"
> {
  const inc = Number.isFinite(row.itmIncresQty) ? Math.max(0, row.itmIncresQty) : 0;
  const dec = Number.isFinite(row.itemShortQty) ? Math.max(0, row.itemShortQty) : 0;
  const stock = Number.isFinite(row.itmStockQty) ? row.itmStockQty : 0;
  const itmQ = stock + inc - dec;
  const differenceQty = inc - dec;
  const totals = computeInventoryDetailTotals(
    inc,
    dec,
    row.itmPPrice,
    row.itmSalPrice
  );

  return { itmQ, differenceQty, ...totals };
}

export function inventoryAdjustmentConversionQty(
  row: Pick<InventoryAdjustmentDetail, "itmIncresQty" | "itemShortQty">
): number {
  const inc = Number.isFinite(row.itmIncresQty) ? row.itmIncresQty : 0;
  const dec = Number.isFinite(row.itemShortQty) ? row.itemShortQty : 0;
  if (inc > 0) return inc;
  if (dec > 0) return dec;
  return 1;
}

/**
 * Unit-1 purchase/sales from stock batch + catalog defaults (Return stock-search pattern).
 * Purchase: stock PurshPrice, else catalog Itm_DefPharm_Price.
 * Sales: stock SalesPrice, else catalog Itm_DefSell_Price (not purchase price).
 */
export function resolveInventoryBatchBasePrices(
  catalogItem: ItemCatalogItem,
  batch: Pick<StockBatchItem, "purshPrice" | "salesPrice">
): { baseItmPPrice: number; baseItmSalPrice: number } {
  const { itmPurPrice: catalogPur, itmSell: catalogSell } =
    catalogDefaultPrices(catalogItem);

  const baseItmPPrice =
    Number.isFinite(batch.purshPrice) && batch.purshPrice > 0
      ? batch.purshPrice
      : catalogPur;

  const batchSales =
    Number.isFinite(batch.salesPrice) && batch.salesPrice > 0
      ? batch.salesPrice
      : 0;

  let baseItmSalPrice =
    batchSales > 0
      ? batchSales
      : catalogSell > 0
        ? catalogSell
        : baseItmPPrice;

  // Zero-qty seed batches often copy purchase into SalesPrice — prefer catalog sell when distinct.
  if (
    catalogSell > 0 &&
    Math.abs(baseItmSalPrice - baseItmPPrice) < 0.000_001 &&
    Math.abs(catalogSell - baseItmPPrice) > 0.000_001
  ) {
    baseItmSalPrice = catalogSell;
  }

  return { baseItmPPrice, baseItmSalPrice };
}

export function resolveInventoryRowBasePrices(
  row: InventoryAdjustmentDetail,
  catalogItem?: ItemCatalogItem | null
): {
  baseItmPPrice: number;
  baseItmSalPrice: number;
} {
  let baseItmPPrice: number;
  let baseItmSalPrice: number;

  if (row.baseItmPPrice != null && Number.isFinite(row.baseItmPPrice)) {
    baseItmPPrice = row.baseItmPPrice;
    baseItmSalPrice =
      row.baseItmSalPrice != null && Number.isFinite(row.baseItmSalPrice)
        ? row.baseItmSalPrice
        : row.itmSalPrice;
  } else {
    const recovered = basePricesFromDisplayed(
      row.itmPPrice,
      row.itmSalPrice,
      row.priceQtyNet
    );
    baseItmPPrice = recovered.baseItmPurPrice;
    baseItmSalPrice = recovered.baseItmSell;
  }

  if (catalogItem) {
    const { itmSell: catalogSell } = catalogDefaultPrices(catalogItem);
    if (
      catalogSell > 0 &&
      Math.abs(baseItmSalPrice - baseItmPPrice) < 0.000_001 &&
      Math.abs(catalogSell - baseItmPPrice) > 0.000_001
    ) {
      baseItmSalPrice = catalogSell;
    }
  }

  return { baseItmPPrice, baseItmSalPrice };
}

export function applyInventoryUnitPrices(
  row: InventoryAdjustmentDetail,
  priceQtyNet: number | null
): Pick<
  InventoryAdjustmentDetail,
  | "itmPPrice"
  | "itmSalPrice"
  | "baseItmPPrice"
  | "baseItmSalPrice"
  | "priceQtyNet"
  | "totalpurchvalue"
  | "totalsalesvalue"
> {
  const base = resolveInventoryRowBasePrices(row);
  const prices = applyPriceQtyNetToBasePrices(
    base.baseItmPPrice,
    base.baseItmSalPrice,
    priceQtyNet
  );
  const totals = computeInventoryDetailTotals(
    row.itmIncresQty,
    row.itemShortQty,
    prices.itmPurPrice,
    prices.itmSell
  );
  return {
    itmPPrice: prices.itmPurPrice,
    itmSalPrice: prices.itmSell,
    baseItmPPrice: base.baseItmPPrice,
    baseItmSalPrice: base.baseItmSalPrice,
    priceQtyNet: prices.priceQtyNet,
    ...totals,
  };
}
