"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { UserSummary } from "@/types/permissions";
import { Badge } from "@/components/ui/badge";

export function useUserColumns(): ColumnDef<UserSummary>[] {
  return useMemo(
    () => [
      {
        accessorKey: "email",
        header: "User",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.email}</p>
            <p className="text-muted-foreground text-xs">{row.original.userId}</p>
          </div>
        ),
      },
      {
        accessorKey: "roles",
        header: "Assigned roles",
        cell: ({ row }) =>
          row.original.roles.length ? (
            <div className="flex flex-wrap gap-1">
              {row.original.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">None</span>
          ),
      },
    ],
    []
  );
}
