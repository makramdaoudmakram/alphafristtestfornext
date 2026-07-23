"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { ItemOriginItem } from "@/types/item-origin";
import { Badge } from "@/components/ui/badge";

export function useItemOriginColumns(): ColumnDef<ItemOriginItem>[] {
  return useMemo(
    () => [
      {
        accessorKey: "ioId",
        header: "ID",
        cell: ({ row }) => (
          <Badge variant="secondary">#{row.original.ioId}</Badge>
        ),
      },
      {
        accessorKey: "ioTextAr",
        header: "Arabic text",
        cell: ({ row }) => row.original.ioTextAr?.trim() || "—",
      },
    ],
    []
  );
}
