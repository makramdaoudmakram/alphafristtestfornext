"use client";

import { useMemo } from "react";
import { Printer } from "lucide-react";
import type { ColumnDef } from "@/components/data-table";
import type { StockBatchItem } from "@/types/stock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—";
}

function formatMoney(value: number) {
  return Number.isFinite(value) ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "—";
}

function stockDisplayQty(row: StockBatchItem) {
  return row.qtyUnit3 != null && Number.isFinite(row.qtyUnit3) ? row.qtyUnit3 : row.qty;
}

function stockDisplayStoreName(row: StockBatchItem) {
  return row.storeName?.trim() || String(row.storeId);
}

type UseStockColumnsOptions = {
  onPrintBarcode?: (row: StockBatchItem) => void;
};

export function useStockColumns(options: UseStockColumnsOptions = {}): ColumnDef<StockBatchItem>[] {
  const { onPrintBarcode } = options;

  return useMemo(
    () => {
      const cols: ColumnDef<StockBatchItem>[] = [
        {
          accessorKey: "batchNo",
          header: "Batch No",
          cell: ({ row }) => (
            <Badge variant="outline">{row.original.batchNo}</Badge>
          ),
        },
        {
          accessorKey: "itemCode",
          header: "Item code",
          cell: ({ row }) => (
            <Badge variant="secondary">{row.original.itemCode}</Badge>
          ),
        },
        {
          accessorKey: "itemNameAr",
          header: "Name (AR)",
          cell: ({ row }) => cellText(row.original.itemNameAr),
        },
        {
          accessorKey: "itemNameEn",
          header: "Name (EN)",
          cell: ({ row }) => cellText(row.original.itemNameEn),
        },
        {
          accessorKey: "storeId",
          header: "Store",
          cell: ({ row }) => cellText(stockDisplayStoreName(row.original)),
        },
        {
          accessorKey: "expDate",
          header: "Expiry",
          cell: ({ row }) => cellText(row.original.expDate),
        },
        {
          accessorKey: "qty",
          header: "Qty",
          cell: ({ row }) => formatQty(stockDisplayQty(row.original)),
        },
        {
          accessorKey: "purshPrice",
          header: "Purchase",
          cell: ({ row }) => formatMoney(row.original.purshPrice),
        },
        {
          accessorKey: "salesPrice",
          header: "Sales",
          cell: ({ row }) => formatMoney(row.original.salesPrice),
        },
      ];

      if (onPrintBarcode) {
        cols.push({
          id: "barcode",
          header: "Barcode",
          enableSorting: false,
          cell: ({ row }) => (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onPrintBarcode(row.original);
              }}
            >
              <Printer className="size-3.5" />
              Print
            </Button>
          ),
        });
      }

      return cols;
    },
    [onPrintBarcode]
  );
}
