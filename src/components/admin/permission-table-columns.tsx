"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { PermissionListItem } from "@/types/permissions";
import { Badge } from "@/components/ui/badge";

export function usePermissionColumns(): ColumnDef<PermissionListItem>[] {
  return useMemo(
    () => [
      {
        accessorKey: "permissionName",
        header: "Name",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.permissionName}</p>
            <p className="text-muted-foreground text-xs">
              {row.original.permissionCode}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "moduleCode",
        header: "Module",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.moduleCode}</Badge>
        ),
      },
      {
        accessorKey: "permissionType",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.permissionType}</Badge>
        ),
      },
      {
        accessorKey: "permissionDescription",
        header: "Description",
        cell: ({ row }) =>
          row.original.permissionDescription?.trim() || "—",
      },
    ],
    []
  );
}
