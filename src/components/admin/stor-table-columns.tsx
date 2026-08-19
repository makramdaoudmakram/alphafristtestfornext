"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { StorItem } from "@/types/stor";
import { Badge } from "@/components/ui/badge";

function formatCostCenter(row: StorItem): string {
  return row.costCenterName?.trim() || "—";
}

function formatAccount(row: StorItem): string {
  const code = row.accountNo?.trim();
  const name = row.accountName?.trim();
  if (code && name && name !== code) return `${code} - ${name}`;
  return code || name || "—";
}

export function useStorColumns(): ColumnDef<StorItem>[] {
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
        accessorKey: "storArName",
        header: "Arabic name",
        cell: ({ row }) => row.original.storArName?.trim() || "—",
      },
      {
        accessorKey: "storEnName",
        header: "English name",
        cell: ({ row }) => row.original.storEnName?.trim() || "—",
      },
      {
        id: "costCenter",
        header: "Cost center",
        cell: ({ row }) => (
          <span className="text-sm">{formatCostCenter(row.original)}</span>
        ),
      },
      {
        id: "accountNo",
        header: "Account no",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{formatAccount(row.original)}</span>
        ),
      },
    ],
    []
  );
}
