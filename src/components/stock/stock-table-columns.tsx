"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { StockBatchItem } from "@/types/stock";
import { Badge } from "@/components/ui/badge";

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
  return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "—";
}

function formatMoney(value: number) {
  return Number.isFinite(value) ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
}

export function useStockColumns(): ColumnDef<StockBatchItem>[] {
  return useMemo(
    () => [
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
        cell: ({ row }) => cellText(row.original.storeId),
      },
      {
        accessorKey: "expDate",
        header: "Expiry",
        cell: ({ row }) => cellText(row.original.expDate),
      },
      {
        accessorKey: "qty",
        header: "Qty",
        cell: ({ row }) => formatQty(row.original.qty),
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
      {
        accessorKey: "unitId",
        header: "Unit",
        cell: ({ row }) =>
          row.original.unitId != null ? String(row.original.unitId) : "—",
      },
    ],
    []
  );
}
