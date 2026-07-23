"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { ItemFormatItem } from "@/types/item-format";
import { Badge } from "@/components/ui/badge";

export function useItemFormatColumns(): ColumnDef<ItemFormatItem>[] {
  return useMemo(
    () => [
      {
        accessorKey: "itfCode",
        header: "Code",
        cell: ({ row }) => (
          <Badge variant="secondary">#{row.original.itfCode}</Badge>
        ),
      },
      {
        accessorKey: "itfNameAr",
        header: "Arabic name",
        cell: ({ row }) => row.original.itfNameAr?.trim() || "—",
      },
      {
        accessorKey: "itfNameEn",
        header: "English name",
        cell: ({ row }) => row.original.itfNameEn?.trim() || "—",
      },
    ],
    []
  );
}
