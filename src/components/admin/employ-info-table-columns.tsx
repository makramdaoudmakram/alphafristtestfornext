"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { EmployInfoItem } from "@/types/employ-info";
import { Badge } from "@/components/ui/badge";
import { formatEmployType } from "@/lib/employ-info-enums";

export function useEmployInfoColumns(): ColumnDef<EmployInfoItem>[] {
  return useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Employee Name",
        cell: ({ row }) => row.original.name?.trim() || "—",
      },
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => row.original.code?.trim() || "—",
      },
      {
        accessorKey: "costCenterName",
        header: "Cost Center",
        cell: ({ row }) => row.original.costCenterName?.trim() || "—",
      },
      {
        accessorKey: "employTypeName",
        header: "Employee Type",
        cell: ({ row }) =>
          row.original.employTypeName?.trim() ||
          formatEmployType(row.original.employType),
      },
      {
        accessorKey: "active",
        header: "Active",
        cell: ({ row }) =>
          row.original.active ? (
            <Badge variant="secondary">Active</Badge>
          ) : (
            <span className="text-muted-foreground">Inactive</span>
          ),
      },
    ],
    []
  );
}
