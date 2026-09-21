"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { SalesKindAssignmentItem } from "@/types/sales-kind-assignment";
import { Badge } from "@/components/ui/badge";

export function useSalesKindAssignmentColumns(): ColumnDef<SalesKindAssignmentItem>[] {
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
        accessorKey: "pharmId",
        header: "Pharmacy",
        cell: ({ row }) => {
          const name = row.original.pharmName?.trim();
          const id = row.original.pharmId;
          if (name) return `${name} (${id})`;
          return id ? String(id) : "—";
        },
      },
      {
        enableSorting: true,
        accessorKey: "salesKindName",
        header: "Sales kind",
        cell: ({ row }) => {
          const name = row.original.salesKindName?.trim();
          return name
            ? `${name} (#${row.original.salesKindId})`
            : `#${row.original.salesKindId}`;
        },
      },
      {
        enableSorting: true,
        accessorKey: "active",
        header: "Active",
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
