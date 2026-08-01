"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { UnitListItem } from "@/types/unit";

export function useUnitColumns(): ColumnDef<UnitListItem>[] {
  return useMemo(
    () => [
      {
        accessorKey: "uCode",
        header: "Code",
        cell: ({ row }) => (
          <span className="flex items-center gap-2 font-medium">
            {row.original.uCode}
            {row.original.pendingSync ? (
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-normal text-amber-800 dark:text-amber-300">
                Pending sync
              </span>
            ) : null}
          </span>
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
