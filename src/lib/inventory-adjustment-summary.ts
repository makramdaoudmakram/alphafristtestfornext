import { resolveInventoryRowBasePrices } from "@/lib/inventory-adjustment-detail";
import { priceQtyNetFromCatalogItem } from "@/lib/purchase-unit-conversion";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { InventoryAdjustmentDetail } from "@/types/inventory-adjustment";

export type InventoryAdjustmentSummary = {
  totalQtyBeforeUpdate: number;
  totalPurchaseValueBeforeUpdate: number;
  totalSalesValueBeforeUpdate: number;
  totalIncreaseQty: number;
  totalDecreaseQty: number;
  totalIncreasePurchaseValue: number;
  totalDecreasePurchaseValue: number;
  totalIncreaseSalesValue: number;
  totalDecreaseSalesValue: number;
};

function safeQty(value: number | null | undefined): number {
  return Number.isFinite(value) ? (value as number) : 0;
}

/** Factor to convert a detail-row quantity in the selected unit to Unit 1. */
function unit1QtyFactor(
  row: InventoryAdjustmentDetail,
  catalogItem?: ItemCatalogItem | null
): number {
  if (
    row.priceQtyNet != null &&
    Number.isFinite(row.priceQtyNet) &&
    row.priceQtyNet > 0
  ) {
    return row.priceQtyNet;
  }

  if (catalogItem && row.unitId != null && row.unitId > 0) {
    return priceQtyNetFromCatalogItem(catalogItem, row.unitId);
  }

  return 1;
}

/** Convert a detail-row quantity in the selected unit to Unit 1 (same factor for stock/increase/decrease). */
function qtyUnit1(
  qty: number | null | undefined,
  row: InventoryAdjustmentDetail,
  catalogItem?: ItemCatalogItem | null
): number {
  return safeQty(qty) * unit1QtyFactor(row, catalogItem);
}

export function computeInventoryAdjustmentSummary(
  details: InventoryAdjustmentDetail[],
  itemByCode?: Map<string, ItemCatalogItem>
): InventoryAdjustmentSummary {
  let totalQtyBeforeUpdate = 0;
  let totalPurchaseValueBeforeUpdate = 0;
  let totalSalesValueBeforeUpdate = 0;
  let totalIncreaseQty = 0;
  let totalDecreaseQty = 0;
  let totalIncreasePurchaseValue = 0;
  let totalDecreasePurchaseValue = 0;
  let totalIncreaseSalesValue = 0;
  let totalDecreaseSalesValue = 0;

  for (const row of details) {
    const catalogItem =
      itemByCode?.get(row.itmCode.trim().toLowerCase()) ?? null;
    const { baseItmPPrice, baseItmSalPrice } = resolveInventoryRowBasePrices(
      row,
      catalogItem
    );

    const stockUnit1 = qtyUnit1(row.itmStockQty, row, catalogItem);
    const increaseUnit1 = qtyUnit1(row.itmIncresQty, row, catalogItem);
    const decreaseUnit1 = qtyUnit1(row.itemShortQty, row, catalogItem);

    totalQtyBeforeUpdate += stockUnit1;
    totalPurchaseValueBeforeUpdate += baseItmPPrice * stockUnit1;
    totalSalesValueBeforeUpdate += baseItmSalPrice * stockUnit1;
    totalIncreaseQty += increaseUnit1;
    totalDecreaseQty += decreaseUnit1;
    totalIncreasePurchaseValue += baseItmPPrice * increaseUnit1;
    totalDecreasePurchaseValue -= baseItmPPrice * decreaseUnit1;
    totalIncreaseSalesValue += baseItmSalPrice * increaseUnit1;
    totalDecreaseSalesValue -= baseItmSalPrice * decreaseUnit1;
  }

  return {
    totalQtyBeforeUpdate,
    totalPurchaseValueBeforeUpdate,
    totalSalesValueBeforeUpdate,
    totalIncreaseQty,
    totalDecreaseQty,
    totalIncreasePurchaseValue,
    totalDecreasePurchaseValue,
    totalIncreaseSalesValue,
    totalDecreaseSalesValue,
  };
}

export function formatInventorySummaryNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatInventorySummaryMoney(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
