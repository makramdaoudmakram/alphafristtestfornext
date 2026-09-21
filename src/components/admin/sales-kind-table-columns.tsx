"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { SalesKindItem } from "@/types/sales-kind";
import { Badge } from "@/components/ui/badge";

export function useSalesKindColumns(): ColumnDef<SalesKindItem>[] {
  return useMemo(
    () => [
      {
        enableSorting: true,
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <Badge variant="secondary">#{row.original.id}</Badge>
        ),
      },
      {
        enableSorting: true,
        accessorKey: "salesKindName",
        header: "Sales kind name",
        cell: ({ row }) => row.original.salesKindName?.trim() || "—",
      },
      {
        enableSorting: true,
        accessorKey: "deleveryMandatory",
        header: "Delivery mandatory",
        cell: ({ row }) => (row.original.deleveryMandatory ? "Yes" : "No"),
      },
      {
        enableSorting: true,
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "secondary"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
    ],
    []
  );
}
