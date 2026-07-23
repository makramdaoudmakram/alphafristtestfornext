"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { ItemCatalogItem } from "@/types/item-catalog";
import { Badge } from "@/components/ui/badge";

export function useItemCatalogColumns(): ColumnDef<ItemCatalogItem>[] {
  return useMemo(
    () => [
      {
        accessorKey: "itmCode",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.itmCode?.trim() || "—"}</span>
        ),
      },
      {
        accessorKey: "itmCode2",
        header: "User code",
        cell: ({ row }) => row.original.itmCode2?.trim() || "—",
      },
      {
        accessorKey: "itmNameAr",
        header: "Arabic name",
        cell: ({ row }) => row.original.itmNameAr?.trim() || "—",
      },
      {
        accessorKey: "itmNameEn",
        header: "English name",
        cell: ({ row }) => row.original.itmNameEn?.trim() || "—",
      },
      {
        accessorKey: "itmDefSellPrice",
        header: "Sales price",
        cell: ({ row }) => row.original.itmDefSellPrice ?? "—",
      },
      {
        accessorKey: "itmActive",
        header: "Active",
        cell: ({ row }) =>
          row.original.itmActive ? (
            <Badge className="bg-emerald-600">Active</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          ),
      },
    ],
    []
  );
}
