"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { SalesPushListItem } from "@/types/sales-push-list";
import { Badge } from "@/components/ui/badge";

export function useSalesPushListColumns(): ColumnDef<SalesPushListItem>[] {
  return useMemo(
    () => [
      {
        accessorKey: "itemCode",
        header: "Item Code",
        enableSorting: true,
        cell: ({ row }) => row.original.itemCode.trim() || "—",
      },
      {
        accessorKey: "arabicName",
        header: "Arabic Name",
        enableSorting: true,
        cell: ({ row }) => row.original.arabicName.trim() || "—",
      },
      {
        accessorKey: "englishName",
        header: "English Name",
        enableSorting: true,
        cell: ({ row }) => row.original.englishName.trim() || "—",
      },
      {
        accessorKey: "batchNo",
        header: "BatchNo",
        enableSorting: true,
        cell: ({ row }) => row.original.batchNo.trim() || "—",
      },
      {
        accessorKey: "percent",
        header: "Discount %",
        enableSorting: true,
        cell: ({ row }) =>
          Number.isFinite(row.original.percent) ? row.original.percent : "—",
      },
      {
        accessorKey: "comection",
        header: "Discount Value",
        enableSorting: true,
        cell: ({ row }) =>
          Number.isFinite(row.original.comection) ? row.original.comection : "—",
      },
      {
        accessorKey: "startdate",
        header: "Start Date",
        enableSorting: true,
        cell: ({ row }) => row.original.startdate || "—",
      },
      {
        accessorKey: "endDate",
        header: "End Date",
        enableSorting: true,
        cell: ({ row }) => row.original.endDate || "—",
      },
      {
        accessorKey: "active",
        header: "Active",
        enableSorting: true,
        cell: ({ row }) => (
          <Badge variant={row.original.active ? "default" : "secondary"}>
            {row.original.active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
    ],
    []
  );
}
