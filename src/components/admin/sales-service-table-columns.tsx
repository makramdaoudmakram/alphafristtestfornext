"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { SalesServiceItem } from "@/types/sales-service";
import { Badge } from "@/components/ui/badge";

export function useSalesServiceColumns(): ColumnDef<SalesServiceItem>[] {
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
        accessorKey: "serviceName",
        header: "Service name",
        cell: ({ row }) => row.original.serviceName?.trim() || "—",
      },
      {
        enableSorting: true,
        accessorKey: "serviceType",
        header: "Service type",
        cell: ({ row }) => row.original.serviceType?.trim() || "—",
      },
      {
        enableSorting: true,
        accessorKey: "cost",
        header: "Cost",
        cell: ({ row }) =>
          Number.isFinite(row.original.cost)
            ? row.original.cost.toFixed(4)
            : "—",
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
