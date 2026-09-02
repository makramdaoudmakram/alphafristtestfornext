"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { StockBatchItem } from "@/types/stock";
import {
  getInventoryStockStatus,
  inventoryDisplayQty,
  inventoryItemDisplayName,
  inventoryStatusLabel,
  inventoryStoreDisplayName,
} from "@/lib/stock-inventory";

type InventoryDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: StockBatchItem | null;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function InventoryDetailDialog({
  open,
  onOpenChange,
  batch,
}: InventoryDetailDialogProps) {
  if (!batch) return null;

  const status = getInventoryStockStatus(batch);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Inventory batch details</DialogTitle>
          <DialogDescription>
            {inventoryItemDisplayName(batch)} · Batch {batch.batchNo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border p-4">
          <DetailRow label="SKU / Item code" value={batch.itemCode} />
          <DetailRow label="Product name" value={inventoryItemDisplayName(batch)} />
          <DetailRow label="Batch number" value={batch.batchNo} />
          <DetailRow label="Store / location" value={inventoryStoreDisplayName(batch)} />
          <DetailRow label="Expiry date" value={batch.expDate ?? "—"} />
          <DetailRow
            label="Available quantity"
            value={inventoryDisplayQty(batch).toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })}
          />
          <DetailRow label="Purchase price" value={batch.purshPrice.toFixed(2)} />
          <DetailRow label="Sales price" value={batch.salesPrice.toFixed(2)} />
          <DetailRow label="Cost price" value={batch.costPrice.toFixed(2)} />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Stock status</span>
            <Badge
              variant={status === "in_stock" ? "secondary" : "outline"}
              className={
                status === "out_of_stock"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : status === "low_stock"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : undefined
              }
            >
              {inventoryStatusLabel(status)}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
