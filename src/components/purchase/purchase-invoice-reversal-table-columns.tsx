"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PostedPurchaseInvoiceReversalItem } from "@/types/purchase";

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatAmount(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQuantity(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

export function usePurchaseInvoiceReversalColumns({
  reversingId,
  onReverse,
}: {
  reversingId: number | null;
  onReverse: (row: PostedPurchaseInvoiceReversalItem) => void;
}): ColumnDef<PostedPurchaseInvoiceReversalItem>[] {
  return useMemo(
    () => [
      {
        accessorKey: "vendorName",
        header: "Vendor",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.vendorName || "—"}
          </span>
        ),
      },
      {
        accessorKey: "venBillNo",
        header: "Vendor Bill No",
        enableSorting: false,
        cell: ({ row }) => row.original.venBillNo || "—",
      },
      {
        accessorKey: "venBillDate",
        header: "Vendor Date",
        enableSorting: false,
        cell: ({ row }) => formatDate(row.original.venBillDate),
      },
      {
        accessorKey: "insertTime",
        header: "Insert Date",
        enableSorting: false,
        cell: ({ row }) => formatDate(row.original.insertTime),
      },
      {
        accessorKey: "userName",
        header: "User Name",
        enableSorting: false,
        cell: ({ row }) => row.original.userName || "—",
      },
      {
        accessorKey: "totalBill",
        header: "Total Bill",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{formatAmount(row.original.totalBill)}</span>
        ),
      },
      {
        accessorKey: "pthNetBill",
        header: "Net Bill",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{formatAmount(row.original.pthNetBill)}</span>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Quantity",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{formatQuantity(row.original.quantity)}</span>
        ),
      },
      {
        id: "action",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => {
          const busy = reversingId === row.original.id;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={reversingId != null}
                  onClick={(event) => {
                    event.stopPropagation();
                    onReverse(row.original);
                  }}
                >
                  <Undo2 className={busy ? "animate-spin" : undefined} />
                  Reverse
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Reverse this posted invoice and make it editable again
              </TooltipContent>
            </Tooltip>
          );
        },
      },
    ],
    [onReverse, reversingId]
  );
}
