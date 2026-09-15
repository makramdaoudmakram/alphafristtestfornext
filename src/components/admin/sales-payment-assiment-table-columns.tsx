"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { SalesPaymentAssimentItem } from "@/types/sales-payment-assiment";
import { Badge } from "@/components/ui/badge";

export function useSalesPaymentAssimentColumns(): ColumnDef<SalesPaymentAssimentItem>[] {
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
        accessorKey: "pharmId",
        header: "Pharmacy",
        cell: ({ row }) => {
          const name = row.original.pharmName?.trim();
          const id = row.original.pharmId?.trim();
          if (name && id) return `${name} (${id})`;
          return name || id || "—";
        },
      },
      {
        enableSorting: true,
        accessorKey: "paymentName",
        header: "Payment method",
        cell: ({ row }) => {
          const name = row.original.paymentName?.trim();
          return name
            ? `${name} (#${row.original.spmId})`
            : `#${row.original.spmId}`;
        },
      },
    ],
    []
  );
}
