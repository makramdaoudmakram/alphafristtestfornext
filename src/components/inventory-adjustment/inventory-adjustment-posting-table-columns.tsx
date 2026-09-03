"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getGridStorageKeys, GRID_MODULE_KEYS } from "@/lib/grid-storage-keys";
import type { GridColumnDefinition } from "@/types/grid-column";
import { isInventoryAdjustmentPosted } from "@/types/inventory-adjustment";
import type { InventoryPostingListItem } from "@/types/inventory-adjustment";

export const {
  preferencesKey: INVENTORY_ADJUSTMENT_POSTING_GRID_STORAGE_KEY,
  legacyWidthKey: INVENTORY_ADJUSTMENT_POSTING_GRID_LEGACY_WIDTH_KEY,
} = getGridStorageKeys(GRID_MODULE_KEYS.inventoryAdjustmentPosting);

export const INVENTORY_ADJUSTMENT_POSTING_GRID_COLUMNS: readonly GridColumnDefinition[] =
  [
    { key: "expand", title: "", required: true, defaultWidth: 44, hideFromMenu: true },
    { key: "fhId", title: "Doc No", defaultWidth: 88 },
    { key: "invDat", title: "Date", defaultWidth: 104 },
    { key: "movementName", title: "Movement Name", required: true, defaultWidth: 220 },
    { key: "invTotalStockQty", title: "Total Stock Qty", defaultWidth: 120 },
    { key: "invTotalIncresQty", title: "Total Increase Qty", defaultWidth: 132 },
    { key: "invTotalShortQty", title: "Total Decrease Qty", defaultWidth: 132 },
    {
      key: "invActTotalSalPriceIncres",
      title: "Increase Sales Value",
      defaultWidth: 148,
    },
    {
      key: "invActTotalSalPriceShort",
      title: "Decrease Sales Value",
      defaultWidth: 148,
    },
    {
      key: "invActTotalPPriceIncress",
      title: "Increase Purchase Value",
      defaultWidth: 160,
    },
    {
      key: "invActTotalPPriceShort",
      title: "Decrease Purchase Value",
      defaultWidth: 160,
    },
    { key: "netInventory", title: "Net Inventory", defaultWidth: 128 },
    {
      key: "action",
      title: "Action",
      required: true,
      defaultWidth: 104,
      hideFromMenu: true,
    },
  ] as const;

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

function formatMovementName(row: InventoryPostingListItem) {
  return row.movementName.trim() || "—";
}

export function useInventoryAdjustmentPostingColumns({
  expandedId,
  postingId,
  onPost,
}: {
  expandedId: number | null;
  postingId: number | null;
  onPost: (row: InventoryPostingListItem) => void;
}): ColumnDef<InventoryPostingListItem>[] {
  return useMemo(
    () => [
      {
        id: "expand",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const expanded = expandedId === row.original.id;
          const Icon = expanded ? ChevronDown : ChevronRight;
          return (
            <Icon className="text-muted-foreground size-4" aria-hidden />
          );
        },
      },
      {
        accessorKey: "fhId",
        header: "Doc No",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {row.original.fhId ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "invDat",
        header: "Date",
        enableSorting: false,
        cell: ({ row }) => formatDate(row.original.invDat),
      },
      {
        accessorKey: "movementName",
        header: "Movement Name",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block truncate font-medium" title={formatMovementName(row.original)}>
            {formatMovementName(row.original)}
          </span>
        ),
      },
      {
        accessorKey: "invTotalStockQty",
        header: "Total Stock Qty",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatQuantity(row.original.invTotalStockQty)}
          </span>
        ),
      },
      {
        accessorKey: "invTotalIncresQty",
        header: "Total Increase Qty",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums text-emerald-600">
            {formatQuantity(row.original.invTotalIncresQty)}
          </span>
        ),
      },
      {
        accessorKey: "invTotalShortQty",
        header: "Total Decrease Qty",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums text-red-600">
            {formatQuantity(row.original.invTotalShortQty)}
          </span>
        ),
      },
      {
        accessorKey: "invActTotalSalPriceIncres",
        header: "Increase Sales Value",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums text-emerald-600">
            {formatAmount(row.original.invActTotalSalPriceIncres)}
          </span>
        ),
      },
      {
        accessorKey: "invActTotalSalPriceShort",
        header: "Decrease Sales Value",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums text-red-600">
            {formatAmount(row.original.invActTotalSalPriceShort)}
          </span>
        ),
      },
      {
        accessorKey: "invActTotalPPriceIncress",
        header: "Increase Purchase Value",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums text-emerald-600">
            {formatAmount(row.original.invActTotalPPriceIncress)}
          </span>
        ),
      },
      {
        accessorKey: "invActTotalPPriceShort",
        header: "Decrease Purchase Value",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums text-red-600">
            {formatAmount(row.original.invActTotalPPriceShort)}
          </span>
        ),
      },
      {
        accessorKey: "netInventory",
        header: "Net Inventory",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatAmount(row.original.netInventory)}
          </span>
        ),
      },
      {
        id: "action",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => {
          const busy = postingId === row.original.id;
          const canPost = !isInventoryAdjustmentPosted(row.original.movStat);
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={postingId != null || !canPost}
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
              <TooltipContent>
                Post this inventory adjustment and create General Ledger entries
              </TooltipContent>
            </Tooltip>
          );
        },
      },
    ],
    [expandedId, onPost, postingId]
  );
}
