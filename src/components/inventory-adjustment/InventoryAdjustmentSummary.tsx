"use client";

import {
  computeInventoryAdjustmentSummary,
  formatInventorySummaryMoney,
  formatInventorySummaryNumber,
} from "@/lib/inventory-adjustment-summary";
import type { InventoryAdjustmentDetail } from "@/types/inventory-adjustment";
import type { ItemCatalogItem } from "@/types/item-catalog";

type InventoryAdjustmentSummaryProps = {
  details: InventoryAdjustmentDetail[];
  itemByCode: Map<string, ItemCatalogItem>;
};

type SummaryRowProps = {
  label: string;
  value: string;
};

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed py-2 last:border-b-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="tabular-nums text-sm font-semibold">{value}</span>
    </div>
  );
}

export function InventoryAdjustmentSummary({
  details,
  itemByCode,
}: InventoryAdjustmentSummaryProps) {
  const summary = computeInventoryAdjustmentSummary(details, itemByCode);

  if (details.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border bg-muted/20 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Summary</h3>
      <div className="space-y-0">
        <SummaryRow
          label="Total Quantity Before Update"
          value={formatInventorySummaryNumber(summary.totalQtyBeforeUpdate)}
        />
        <SummaryRow
          label="Total Purchase Value Before Update"
          value={formatInventorySummaryMoney(summary.totalPurchaseValueBeforeUpdate)}
        />
        <SummaryRow
          label="Total Sales Value Before Update"
          value={formatInventorySummaryMoney(summary.totalSalesValueBeforeUpdate)}
        />
        <SummaryRow
          label="Total Increase Quantity"
          value={formatInventorySummaryNumber(summary.totalIncreaseQty)}
        />
        <SummaryRow
          label="Total Decrease Quantity"
          value={formatInventorySummaryNumber(summary.totalDecreaseQty)}
        />
        <SummaryRow
          label="Total Increase Purchase Value"
          value={formatInventorySummaryMoney(summary.totalIncreasePurchaseValue)}
        />
        <SummaryRow
          label="Total Decrease Purchase Value"
          value={formatInventorySummaryMoney(summary.totalDecreasePurchaseValue)}
        />
        <SummaryRow
          label="Total Increase Sales Value"
          value={formatInventorySummaryMoney(summary.totalIncreaseSalesValue)}
        />
        <SummaryRow
          label="Total Decrease Sales Value"
          value={formatInventorySummaryMoney(summary.totalDecreaseSalesValue)}
        />
      </div>
    </section>
  );
}
