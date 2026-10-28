"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { SalesPaymentClassifyItem } from "@/types/sales-payment-classify";
import { Badge } from "@/components/ui/badge";

export function useSalesPaymentClassifyColumns(): ColumnDef<SalesPaymentClassifyItem>[] {
  return useMemo(
    () => [
      {
        enableSorting: true,
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <Badge variant="secondary">#{row.original.id}</Badge>
        ),
      },
      {
        enableSorting: true,
        accessorKey: "salesclassifyName",
        header: "Classification name",
        cell: ({ row }) => row.original.salesclassifyName?.trim() || "—",
      },
    ],
    []
  );
}
