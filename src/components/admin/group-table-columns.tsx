"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { GroupRow } from "@/lib/group-tree";
import { Badge } from "@/components/ui/badge";

export function useGroupColumns(): ColumnDef<GroupRow>[] {
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
        accessorKey: "pathLabel",
        header: "Hierarchy path",
        cell: ({ row }) => (
          <div className="max-w-md space-y-1">
            <p
              className="truncate font-medium"
              style={{ paddingInlineStart: `${row.original.depth * 0.75}rem` }}
            >
              {row.original.gNameEn || row.original.gNameAr || "—"}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {row.original.pathLabel}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "gNameAr",
        header: "Arabic name",
        cell: ({ row }) => row.original.gNameAr?.trim() || "—",
      },
      {
        accessorKey: "parentLabel",
        header: "Parent",
        cell: ({ row }) =>
          row.original.gParent == null ? (
            <Badge className="bg-violet-600">Root</Badge>
          ) : (
            row.original.parentLabel
          ),
      },
      {
        accessorKey: "childCount",
        header: "Children",
        cell: ({ row }) =>
          row.original.childCount > 0 ? (
            <Badge variant="outline">{row.original.childCount}</Badge>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "depth",
        header: "Level",
        cell: ({ row }) => (
          <Badge variant="secondary">L{row.original.depth + 1}</Badge>
        ),
      },
    ],
    []
  );
}
