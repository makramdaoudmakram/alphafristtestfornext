"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { CompanyItem } from "@/types/company";
import { Badge } from "@/components/ui/badge";

export function useCompanyColumns(): ColumnDef<CompanyItem>[] {
  return useMemo(
    () => [
      {
        accessorKey: "comId",
        header: "ID",
        cell: ({ row }) => (
          <Badge variant="secondary">#{row.original.comId}</Badge>
        ),
      },
      {
        accessorKey: "comCode",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.comCode?.trim() || "—"}</span>
        ),
      },
      {
        accessorKey: "comNameAr",
        header: "Arabic name",
        cell: ({ row }) => row.original.comNameAr?.trim() || "—",
      },
      {
        accessorKey: "comNameEn",
        header: "English name",
        cell: ({ row }) => row.original.comNameEn?.trim() || "—",
      },
      {
        accessorKey: "comTel",
        header: "Phone",
        cell: ({ row }) => row.original.comTel?.trim() || "—",
      },
      {
        accessorKey: "comActive",
        header: "Active",
        cell: ({ row }) =>
          row.original.comActive ? (
            <Badge className="bg-emerald-600">Active</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          ),
      },
    ],
    []
  );
}
