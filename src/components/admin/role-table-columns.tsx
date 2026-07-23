"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { RoleSummary } from "@/types/permissions";
import { Badge } from "@/components/ui/badge";

export function useRoleColumns(): ColumnDef<RoleSummary>[] {
  return useMemo(
    () => [
      {
        accessorKey: "roleName",
        header: "Role",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.roleName}</p>
            <p className="text-muted-foreground text-xs">{row.original.roleCode}</p>
          </div>
        ),
      },
      {
        accessorKey: "roleDescription",
        header: "Description",
        cell: ({ row }) => row.original.roleDescription?.trim() || "—",
      },
      {
        accessorKey: "roleId",
        header: "ID",
        cell: ({ row }) => (
          <Badge variant="secondary">ID: {row.original.roleId}</Badge>
        ),
      },
    ],
    []
  );
}
