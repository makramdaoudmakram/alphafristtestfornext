"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MasterDetailGrid } from "@/components/grid/master-detail-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import {
  INVENTORY_ADJUSTMENT_DETAIL_EDITABLE_COLUMNS,
  INVENTORY_ADJUSTMENT_DETAIL_GRID_COLUMNS,
  INVENTORY_ADJUSTMENT_DETAIL_GRID_LEGACY_WIDTH_KEY,
  INVENTORY_ADJUSTMENT_DETAIL_GRID_STORAGE_KEY,
} from "@/components/inventory-adjustment/inventory-adjustment-detail-grid-columns";
import { buildRowUnitComboboxOptions } from "@/lib/item-unit-options";
import { formatExpDateMmYyyy } from "@/lib/purchase-exp-date";
import { cn } from "@/lib/utils";
import type { InventoryAdjustmentDetail } from "@/types/inventory-adjustment";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PharmReciveItemLanguage } from "@/types/pharm-recive";
import type { UnitItem } from "@/types/unit";
import {
  decreaseExceedsAvailableMessage,
  isDecreaseGreaterThanAvailableQty,
} from "@/validation/inventory-adjustment.schema";

const gridInputClass = cn("h-8 w-full min-w-0 tabular-nums", formControlFocusClass);

function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(value);
}

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function stockItemName(
  row: InventoryAdjustmentDetail,
  language: PharmReciveItemLanguage
): string {
  if (language === "ar") {
    return row.itmNameAr.trim() || row.itmNameEn.trim() || row.itmCode || "—";
  }
  return row.itmNameEn.trim() || row.itmNameAr.trim() || row.itmCode || "—";
}

function parseQtyInput(raw: string): number {
  const next = Number(raw);
  return Number.isFinite(next) && next >= 0 ? next : 0;
}

type InventoryAdjustmentDetailsGridProps = {
  details: InventoryAdjustmentDetail[];
  language: PharmReciveItemLanguage;
  units: UnitItem[];
  itemByCode: Map<string, ItemCatalogItem>;
  disabled?: boolean;
  latestDetailGroupId?: number;
  selectedRowIndex: number;
  onSelectRow: (index: number) => void;
  onChangeRow: (index: number, patch: Partial<InventoryAdjustmentDetail>) => void;
  onRemoveRow: (index: number) => void;
  onUnitChange: (index: number, unitId: number) => void;
};

export function InventoryAdjustmentDetailsGrid({
  details,
  language,
  units,
  itemByCode,
  disabled = false,
  latestDetailGroupId = 0,
  selectedRowIndex,
  onSelectRow,
  onChangeRow,
  onRemoveRow,
  onUnitChange,
}: InventoryAdjustmentDetailsGridProps) {
  const columns = useMemo<ColumnDef<InventoryAdjustmentDetail>[]>(
    () => [
      {
        id: "line",
        header: "#",
        cell: ({ row }) => row.index + 1,
      },
      {
        id: "batchNo",
        header: "Batch No",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.batchNo || "—"}</span>
        ),
      },
      {
        id: "expDate",
        header: "Exp MM/YYYY",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {row.original.expDate
              ? formatExpDateMmYyyy(row.original.expDate)
              : "—"}
          </span>
        ),
      },
      {
        id: "itmCode",
        header: "Item Code",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.itmCode || "—"}</span>
        ),
      },
      {
        id: "itemName",
        header: "Item Name",
        cell: ({ row }) => (
          <span className="text-sm">{stockItemName(row.original, language)}</span>
        ),
      },
      {
        id: "itmStockQty",
        header: "Stock",
        cell: ({ row }) => {
          const physical = Number.isFinite(row.original.itmStockQty)
            ? row.original.itmStockQty
            : 0;
          const pending = Number.isFinite(row.original.itmTransferQty)
            ? row.original.itmTransferQty
            : 0;
          const available = Number.isFinite(row.original.itmAvailableQty)
            ? row.original.itmAvailableQty
            : physical;
          return (
            <div className="flex flex-col gap-0.5 text-xs leading-tight">
              <span className="tabular-nums">
                Physical: <span className="font-medium">{formatQty(physical)}</span>
              </span>
              <span className="text-muted-foreground tabular-nums">
                Pending transfer: {formatQty(pending)}
              </span>
              <span className="tabular-nums text-foreground">
                Available:{" "}
                <span className="font-medium">{formatQty(available)}</span>
              </span>
            </div>
          );
        },
      },
      {
        id: "itmIncresQty",
        header: "Increase",
        meta: { editable: true },
        cell: ({ row }) => (
          <Input
            data-row={row.index}
            data-col="itmIncresQty"
            type="number"
            step="any"
            min={0}
            disabled={disabled}
            value={
              Number.isFinite(row.original.itmIncresQty) ? row.original.itmIncresQty : 0
            }
            onFocus={() => onSelectRow(row.index)}
            onChange={(e) => {
              onChangeRow(row.index, {
                itmIncresQty: parseQtyInput(e.target.value),
              });
            }}
            className={gridInputClass}
          />
        ),
      },
      {
        id: "itemShortQty",
        header: "Decrease",
        meta: { editable: true },
        cell: ({ row }) => {
          const availableQty = Number.isFinite(row.original.itmAvailableQty)
            ? row.original.itmAvailableQty
            : Number.isFinite(row.original.itmStockQty)
              ? row.original.itmStockQty
              : 0;
          const decreaseQty = Number.isFinite(row.original.itemShortQty)
            ? row.original.itemShortQty
            : 0;
          const decreaseInvalid = isDecreaseGreaterThanAvailableQty(
            decreaseQty,
            availableQty
          );
          const invalidMessage = decreaseExceedsAvailableMessage(availableQty);

          return (
            <Input
              data-row={row.index}
              data-col="itemShortQty"
              type="number"
              step="any"
              min={0}
              max={availableQty}
              disabled={disabled}
              aria-invalid={decreaseInvalid}
              title={decreaseInvalid ? invalidMessage : undefined}
              value={decreaseQty}
              onFocus={() => onSelectRow(row.index)}
              onChange={(e) => {
                const next = parseQtyInput(e.target.value);
                if (isDecreaseGreaterThanAvailableQty(next, availableQty)) {
                  toast.error(invalidMessage, {
                    id: "inventory-adjustment-decrease-qty",
                  });
                  return;
                }
                onChangeRow(row.index, {
                  itemShortQty: next,
                });
              }}
              className={gridInputClass}
            />
          );
        },
      },
      {
        id: "totalpurchvalue",
        header: "Total Purchase Value",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {formatMoney(row.original.totalpurchvalue)}
          </span>
        ),
      },
      {
        id: "totalsalesvalue",
        header: "Total Sales Value",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {formatMoney(row.original.totalsalesvalue)}
          </span>
        ),
      },
      {
        id: "unitId",
        header: "Unit",
        meta: { editable: true },
        cell: ({ row }) => {
          const catalogItem =
            itemByCode.get(row.original.itmCode.trim().toLowerCase()) ?? null;
          const unitOptions: ComboboxOption[] = buildRowUnitComboboxOptions(
            units,
            catalogItem,
            Boolean(row.original.itmCode.trim())
          );

          return (
            <SearchableCombobox
              value={
                row.original.unitId != null && row.original.unitId > 0
                  ? String(row.original.unitId)
                  : ""
              }
              onValueChange={(value) => {
                const parsed = Number(value);
                if (!Number.isFinite(parsed) || parsed <= 0) return;
                onUnitChange(row.index, parsed);
              }}
              options={unitOptions}
              disabled={disabled || !row.original.itmCode.trim()}
              dataRow={row.index}
              dataCol="unitId"
              placeholder="Unit"
              className="h-8"
            />
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label="Remove row"
            onClick={() => onRemoveRow(row.index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [disabled, itemByCode, language, onChangeRow, onRemoveRow, onSelectRow, onUnitChange, units]
  );

  return (
    <MasterDetailGrid
      moduleKey="inventory-adjustment"
      storageKey={INVENTORY_ADJUSTMENT_DETAIL_GRID_STORAGE_KEY}
      legacyWidthStorageKey={INVENTORY_ADJUSTMENT_DETAIL_GRID_LEGACY_WIDTH_KEY}
      columnConfig={INVENTORY_ADJUSTMENT_DETAIL_GRID_COLUMNS}
      columns={columns}
      data={details}
      getRowId={(row) => row.clientRowId}
      editableColumns={INVENTORY_ADJUSTMENT_DETAIL_EDITABLE_COLUMNS}
      selectedRowIndex={selectedRowIndex}
      onSelectRow={onSelectRow}
      disabled={disabled}
      onRemoveRow={onRemoveRow}
      emptyMessage="Select an item to add inventory count rows."
      scrollClassName="max-h-[min(28rem,60vh)]"
      getRowClassName={(row) =>
        latestDetailGroupId > 0 && row.detailGroupId !== latestDetailGroupId
          ? "bg-muted/30"
          : undefined
      }
    />
  );
}
