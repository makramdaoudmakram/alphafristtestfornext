"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { CostCenterItem } from "@/types/cost-center";
import { Badge } from "@/components/ui/badge";

export function useCostCenterColumns(): ColumnDef<CostCenterItem>[] {
  return useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <Badge variant="secondary">#{row.original.id}</Badge>
        ),
      },
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.original.code?.trim() || "—"}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => row.original.name?.trim() || "—",
      },
    ],
    []
  );
}
