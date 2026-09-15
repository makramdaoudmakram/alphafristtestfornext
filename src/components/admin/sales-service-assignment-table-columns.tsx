"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { SalesServiceAssignmentItem } from "@/types/sales-service-assignment";
import { Badge } from "@/components/ui/badge";

export function useSalesServiceAssignmentColumns(): ColumnDef<SalesServiceAssignmentItem>[] {
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
        accessorKey: "serviceName",
        header: "Service",
        cell: ({ row }) => {
          const name = row.original.serviceName?.trim();
          return name
            ? `${name} (#${row.original.salesServiceId})`
            : `#${row.original.salesServiceId}`;
        },
      },
      {
        enableSorting: true,
        accessorKey: "serviceType",
        header: "Type",
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
