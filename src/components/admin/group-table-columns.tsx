"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { GroupItem } from "@/types/group";
import { Badge } from "@/components/ui/badge";

export function useGroupColumns(): ColumnDef<GroupItem>[] {
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
        accessorKey: "gNameAr",
        header: "Arabic name",
        cell: ({ row }) => row.original.gNameAr?.trim() || "—",
      },
      {
        accessorKey: "gNameEn",
        header: "English name",
        cell: ({ row }) => row.original.gNameEn?.trim() || "—",
      },
    ],
    []
  );
}
