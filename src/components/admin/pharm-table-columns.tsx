"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@/components/data-table";
import type { PharmItem } from "@/types/pharm";
import { Badge } from "@/components/ui/badge";

function cellText(value: string | undefined) {
  const text = value?.trim();
  if (!text) return "—";
  return (
    <span className="block max-w-[10rem] truncate" title={text}>
      {text}
    </span>
  );
}

export function usePharmColumns(): ColumnDef<PharmItem>[] {
  return useMemo(
    () => [
      {
        accessorKey: "parmId",
        header: "ParmId",
        cell: ({ row }) => (
          <Badge variant="secondary">#{row.original.parmId}</Badge>
        ),
      },
      {
        accessorKey: "parmArName",
        header: "Arabic name",
        cell: ({ row }) => cellText(row.original.parmArName),
      },
      {
        accessorKey: "parmEnName",
        header: "English name",
        cell: ({ row }) => cellText(row.original.parmEnName),
      },
      {
        id: "costCenter",
        header: "Cost center",
        cell: ({ row }) =>
          cellText(row.original.costCenterName || row.original.costCenter),
      },
      {
        id: "stor",
        header: "Store",
        cell: ({ row }) => cellText(row.original.storName || row.original.parmStor),
      },
      {
        accessorKey: "parmTel",
        header: "Telephone",
        cell: ({ row }) => cellText(row.original.parmTel),
      },
      {
        accessorKey: "parmAdress",
        header: "Address",
        cell: ({ row }) => cellText(row.original.parmAdress),
      },
      {
        accessorKey: "parmBussReg",
        header: "ParmBussReg",
        cell: ({ row }) => cellText(row.original.parmBussReg),
      },
      {
        accessorKey: "parmTaxNo",
        header: "ParmTaxNo",
        cell: ({ row }) => cellText(row.original.parmTaxNo),
      },
      {
        accessorKey: "parmOwnerName",
        header: "ParmOwnerName",
        cell: ({ row }) => cellText(row.original.parmOwnerName),
      },
      {
        accessorKey: "parmOwnerAdress",
        header: "ParmOwnerAdress",
        cell: ({ row }) => cellText(row.original.parmOwnerAdress),
      },
      {
        accessorKey: "parmOwnerMob",
        header: "ParmOwnerMob",
        cell: ({ row }) => cellText(row.original.parmOwnerMob),
      },
      {
        accessorKey: "parmOwnerTel",
        header: "ParmOwnerTel",
        cell: ({ row }) => cellText(row.original.parmOwnerTel),
      },
      {
        accessorKey: "parmOwnerEMail",
        header: "ParmOwnerEMail",
        cell: ({ row }) => cellText(row.original.parmOwnerEMail),
      },
      {
        accessorKey: "parmMangerName",
        header: "ParmMangerName",
        cell: ({ row }) => cellText(row.original.parmMangerName),
      },
      {
        accessorKey: "parmMangerAdress",
        header: "ParmMangerAdress",
        cell: ({ row }) => cellText(row.original.parmMangerAdress),
      },
      {
        accessorKey: "parmMangerTel",
        header: "ParmMangerTel",
        cell: ({ row }) => cellText(row.original.parmMangerTel),
      },
      {
        accessorKey: "parmMangerMob",
        header: "ParmMangerMob",
        cell: ({ row }) => cellText(row.original.parmMangerMob),
      },
      {
        accessorKey: "parmOrder",
        header: "ParmOrder",
        cell: ({ row }) => row.original.parmOrder,
      },
    ],
    []
  );
}
