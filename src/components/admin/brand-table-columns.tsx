"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { BrandItem } from "@/types/brand";
import { Badge } from "@/components/ui/badge";

export function useBrandColumns(): ColumnDef<BrandItem>[] {
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
        accessorKey: "brandNameAr",
        header: "Arabic name",
        cell: ({ row }) => row.original.brandNameAr?.trim() || "—",
      },
      {
        accessorKey: "brandNameEn",
        header: "English name",
        cell: ({ row }) => row.original.brandNameEn?.trim() || "—",
      },
    ],
    []
  );
}
