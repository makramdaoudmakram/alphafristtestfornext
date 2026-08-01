"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { MovParientItem } from "@/types/mov-parient";
import { Badge } from "@/components/ui/badge";

export function useMovParientColumns(): ColumnDef<MovParientItem>[] {
  return useMemo(
    () => [
      {
        enableSorting: true,
        accessorKey: "movParientId",
        header: "ID",
        cell: ({ row }) => (
          <Badge variant="secondary">#{row.original.movParientId}</Badge>
        ),
      },
      {
        enableSorting: true,
        accessorKey: "movParientAname",
        header: "Arabic name",
        cell: ({ row }) => row.original.movParientAname?.trim() || "—",
      },
      {
        enableSorting: true,
        accessorKey: "movParientEname",
        header: "English name",
        cell: ({ row }) => row.original.movParientEname?.trim() || "—",
      },
    ],
    []
  );
}
