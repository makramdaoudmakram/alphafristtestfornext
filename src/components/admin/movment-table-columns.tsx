"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { MovmentItem } from "@/types/movment";
import { Badge } from "@/components/ui/badge";
import {
  formatActivityTypeValue,
  formatBranchTypeValue,
  formatMovmentEffectValue,
} from "@/lib/movment-enums";

export function useMovmentColumns(): ColumnDef<MovmentItem>[] {
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
        accessorKey: "movChiledName",
        header: "Child name",
        cell: ({ row }) => row.original.movChiledName?.trim() || "—",
      },
      {
        enableSorting: true,
        accessorKey: "movParientId",
        header: "Move parient",
        cell: ({ row }) =>
          row.original.movParientId != null ? `#${row.original.movParientId}` : "—",
      },
      {
        enableSorting: true,
        accessorKey: "movStor",
        header: "MovStor",
        cell: ({ row }) => formatBranchTypeValue(row.original.movStor),
      },
      {
        enableSorting: true,
        accessorKey: "movAccountEntry1",
        header: "Account 1",
        cell: ({ row }) => formatActivityTypeValue(row.original.movAccountEntry1),
      },
      {
        enableSorting: true,
        accessorKey: "movStockEffict",
        header: "Stock effect",
        cell: ({ row }) => formatMovmentEffectValue(row.original.movStockEffict),
      },
      {
        enableSorting: true,
        accessorKey: "movPage",
        header: "Page",
        cell: ({ row }) => row.original.movPage?.trim() || "—",
      },
      {
        enableSorting: true,
        accessorKey: "movActive",
        header: "Active",
        cell: ({ row }) => (
          <Badge variant={row.original.movActive ? "default" : "secondary"}>
            {row.original.movActive ? "Yes" : "No"}
          </Badge>
        ),
      },
    ],
    []
  );
}
