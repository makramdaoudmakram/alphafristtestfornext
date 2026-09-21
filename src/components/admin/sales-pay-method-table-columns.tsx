"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { ComboboxOption } from "@/components/ui/searchable-combobox";
import type { SalesPayMethodItem } from "@/types/sales-pay-method";
import { Badge } from "@/components/ui/badge";

export function useSalesPayMethodColumns(
  accountOptions: ComboboxOption[] = [],
  salesKindOptions: ComboboxOption[] = []
): ColumnDef<SalesPayMethodItem>[] {
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
        accessorKey: "paymentName",
        header: "Payment name",
        cell: ({ row }) => row.original.paymentName?.trim() || "—",
      },
      {
        enableSorting: true,
        accessorKey: "salesKindId",
        header: "Sales kind",
        cell: ({ row }) => {
          const id = row.original.salesKindId;
          if (!id) return "—";
          const match = salesKindOptions.find((option) => option.value === String(id));
          return match?.label || `#${id}`;
        },
      },
      {
        enableSorting: true,
        accessorKey: "affectsCash",
        header: "Affects cash",
        cell: ({ row }) => (row.original.affectsCash ? "Yes" : "No"),
      },
      {
        enableSorting: true,
        accessorKey: "accountCode",
        header: "Account code",
        cell: ({ row }) => {
          const code = row.original.accountCode?.trim();
          if (!code) return "—";
          const match = accountOptions.find((option) => option.value === code);
          return match?.label || code;
        },
      },
      {
        enableSorting: true,
        accessorKey: "active",
        header: "Active",
        cell: ({ row }) => (
          <Badge variant={row.original.active ? "default" : "secondary"}>
            {row.original.active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
    ],
    [accountOptions, salesKindOptions]
  );
}
