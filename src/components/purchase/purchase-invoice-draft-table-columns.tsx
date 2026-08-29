"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PurchaseInvoiceDraftItem } from "@/types/purchase";

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

export function usePurchaseInvoiceDraftColumns({
  postingId,
  onPost,
}: {
  postingId: number | null;
  onPost: (row: PurchaseInvoiceDraftItem) => void;
}): ColumnDef<PurchaseInvoiceDraftItem>[] {
  return useMemo(
    () => [
      {
        accessorKey: "pthId",
        header: "PthId",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">{row.original.pthId || "—"}</span>
        ),
      },
      {
        accessorKey: "vendorName",
        header: "Vendor",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.vendorName || "—"}</span>
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
        accessorKey: "phtDate",
        header: "Purchase Date",
        enableSorting: false,
        cell: ({ row }) => formatDate(row.original.phtDate),
      },
      {
        accessorKey: "movementName",
        header: "Movement",
        enableSorting: false,
        cell: ({ row }) => row.original.movementName || "—",
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
        accessorKey: "userName",
        header: "User",
        enableSorting: false,
        cell: ({ row }) => row.original.userName || "—",
      },
      {
        accessorKey: "insertTime",
        header: "Insert Date",
        enableSorting: false,
        cell: ({ row }) => formatDate(row.original.insertTime),
      },
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => row.original.status || "Draft",
      },
      {
        id: "action",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => {
          const busy = postingId === row.original.id;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={postingId != null}
                  onClick={(event) => {
                    event.stopPropagation();
                    onPost(row.original);
                  }}
                  className={cn(
                    "border-transparent bg-yellow-500 text-yellow-950 shadow-sm",
                    "hover:bg-yellow-600 hover:text-yellow-950",
                    "focus-visible:ring-yellow-500/40",
                    "disabled:opacity-50"
                  )}
                >
                  <BookOpen className={busy ? "animate-spin" : undefined} />
                  Post
                </Button>
              </TooltipTrigger>
              <TooltipContent>Post this purchase invoice to the General Ledger</TooltipContent>
            </Tooltip>
          );
        },
      },
    ],
    [onPost, postingId]
  );
}
