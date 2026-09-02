"use client";

import { useMemo } from "react";
import { Eye, MoreHorizontal, Printer } from "lucide-react";
import type { ColumnDef } from "@/components/data-table";
import type { StockBatchItem } from "@/types/stock";
import {
  getInventoryStockStatus,
  inventoryDisplayQty,
  inventoryItemDisplayName,
  inventoryStatusLabel,
  inventoryStoreDisplayName,
} from "@/lib/stock-inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function cellText(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return "—";
  return (
    <span className="block max-w-[12rem] truncate" title={text}>
      {text}
    </span>
  );
}

function formatQty(value: number) {
  return Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: 4 })
    : "—";
}

function formatMoney(value: number) {
  return Number.isFinite(value)
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })
    : "—";
}

function StatusBadge({ row }: { row: StockBatchItem }) {
  const status = getInventoryStockStatus(row);

  return (
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
  );
}

type UseInventoryColumnsOptions = {
  onViewDetails?: (row: StockBatchItem) => void;
  onPrintBarcode?: (row: StockBatchItem) => void;
};

export function useInventoryColumns(
  options: UseInventoryColumnsOptions = {}
): ColumnDef<StockBatchItem>[] {
  const { onViewDetails, onPrintBarcode } = options;

  return useMemo(() => {
    const cols: ColumnDef<StockBatchItem>[] = [
      {
        accessorKey: "itemCode",
        header: "SKU",
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.itemCode}</Badge>
        ),
      },
      {
        id: "productName",
        header: "Product name",
        cell: ({ row }) => cellText(inventoryItemDisplayName(row.original)),
      },
      {
        accessorKey: "batchNo",
        header: "Batch No",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.batchNo}</Badge>
        ),
      },
      {
        id: "store",
        header: "Location",
        cell: ({ row }) => cellText(inventoryStoreDisplayName(row.original)),
      },
      {
        id: "availableQty",
        header: "Available qty",
        cell: ({ row }) => formatQty(inventoryDisplayQty(row.original)),
      },
      {
        id: "stockStatus",
        header: "Stock status",
        cell: ({ row }) => <StatusBadge row={row.original} />,
      },
      {
        accessorKey: "expDate",
        header: "Expiry",
        cell: ({ row }) => cellText(row.original.expDate),
      },
      {
        accessorKey: "salesPrice",
        header: "Sales price",
        cell: ({ row }) => formatMoney(row.original.salesPrice),
      },
    ];

    if (onViewDetails || onPrintBarcode) {
      cols.push({
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewDetails ? (
                <DropdownMenuItem onClick={() => onViewDetails(row.original)}>
                  <Eye className="mr-2 size-4" />
                  View details
                </DropdownMenuItem>
              ) : null}
              {onPrintBarcode ? (
                <DropdownMenuItem onClick={() => onPrintBarcode(row.original)}>
                  <Printer className="mr-2 size-4" />
                  Print barcode
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      });
    }

    return cols;
  }, [onPrintBarcode, onViewDetails]);
}
