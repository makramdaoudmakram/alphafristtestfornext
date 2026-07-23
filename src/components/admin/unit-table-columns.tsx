"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { UnitItem } from "@/types/unit";

export function useUnitColumns(): ColumnDef<UnitItem>[] {
  return useMemo(
    () => [
      {
        accessorKey: "uCode",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.uCode}</span>
        ),
      },
      {
        accessorKey: "uNameAr",
        header: "Arabic name",
        cell: ({ row }) => row.original.uNameAr?.trim() || "—",
      },
      {
        accessorKey: "uNameEn",
        header: "English name",
        cell: ({ row }) => row.original.uNameEn?.trim() || "—",
      },
    ],
    []
  );
}
