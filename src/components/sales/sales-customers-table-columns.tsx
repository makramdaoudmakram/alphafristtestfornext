"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { CustomerItem } from "@/types/customer";
import { Badge } from "@/components/ui/badge";

function displayName(customer: CustomerItem): string {
  return customer.custNameEn || customer.custNameAr || "—";
}

export function useSalesCustomersColumns(): ColumnDef<CustomerItem>[] {
  return useMemo(
    () => [
      {
        enableSorting: true,
        accessorKey: "custCode",
        header: "Code",
        cell: ({ row }) =>
          row.original.custCode > 0 ? (
            <Badge variant="secondary">#{row.original.custCode}</Badge>
          ) : (
            "—"
          ),
      },
      {
        enableSorting: true,
        accessorKey: "accountId",
        header: "Account No",
        cell: ({ row }) => row.original.accountId?.trim() || "—",
      },
      {
        enableSorting: true,
        accessorKey: "custNameEn",
        header: "Customer name",
        cell: ({ row }) => displayName(row.original),
      },
      {
        enableSorting: false,
        accessorKey: "custNameAr",
        header: "Arabic name",
        cell: ({ row }) => row.original.custNameAr?.trim() || "—",
      },
      {
        enableSorting: false,
        accessorKey: "custMobile",
        header: "Mobile",
        cell: ({ row }) => row.original.custMobile?.trim() || "—",
      },
      {
        enableSorting: false,
        accessorKey: "pharmCode",
        header: "Pharm",
        cell: ({ row }) => row.original.pharmCode?.trim() || "—",
      },
      {
        enableSorting: false,
        accessorKey: "custAddress",
        header: "Address",
        cell: ({ row }) => row.original.custAddress?.trim() || "—",
      },
      {
        enableSorting: false,
        accessorKey: "custActive",
        header: "Active",
        cell: ({ row }) => (
          <Badge variant={row.original.custActive ? "default" : "secondary"}>
            {row.original.custActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
    ],
    []
  );
}
