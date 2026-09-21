"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { SalesmovmentDetail } from "@/types/sales-movment";
import { SALES_MOVEMENT_PARENT_OPTIONS } from "@/types/sales-movment";
import { Badge } from "@/components/ui/badge";

function parentLabel(value: number | null): string {
  const match = SALES_MOVEMENT_PARENT_OPTIONS.find((o) => o.value === value);
  return match?.label ?? (value != null ? String(value) : "—");
}

export function useSalesMovementColumns(): ColumnDef<SalesmovmentDetail>[] {
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
        accessorKey: "movId",
        header: "MovId",
        cell: ({ row }) =>
          row.original.movId != null ? String(row.original.movId) : "—",
      },
      {
        enableSorting: true,
        accessorKey: "movName",
        header: "Name",
        cell: ({ row }) => row.original.movName?.trim() || "—",
      },
      {
        enableSorting: true,
        accessorKey: "movParint",
        header: "Type",
        cell: ({ row }) => parentLabel(row.original.movParint),
      },
      {
        enableSorting: true,
        accessorKey: "pharmacyName",
        header: "Pharmacy",
        cell: ({ row }) =>
          row.original.pharmacyName?.trim() ||
          (row.original.pharmId != null ? `#${row.original.pharmId}` : "—"),
      },
      {
        id: "store1",
        header: "Store 1",
        cell: ({ row }) =>
          row.original.store1Name?.trim() ||
          (row.original.store1 != null ? `#${row.original.store1}` : "—"),
      },
      {
        id: "store2",
        header: "Store 2",
        cell: ({ row }) =>
          row.original.store2Name?.trim() ||
          (row.original.store2 != null ? `#${row.original.store2}` : "—"),
      },
    ],
    []
  );
}
