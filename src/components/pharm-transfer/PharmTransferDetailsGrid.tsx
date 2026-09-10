"use client";

import { useCallback, useMemo, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
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
  getPharmTransferFocusColumnAfter,
  PHARM_TRANSFER_DETAIL_EDITABLE_COLUMNS,
  PHARM_TRANSFER_DETAIL_GRID_COLUMNS,
  PHARM_TRANSFER_DETAIL_GRID_LEGACY_WIDTH_KEY,
  PHARM_TRANSFER_DETAIL_GRID_STORAGE_KEY,
} from "@/components/pharm-transfer/pharm-transfer-detail-grid-columns";
import { getUnitConversionInfo } from "@/lib/api-client";
import {
  applyPharmTransferUnitPrices,
  computePharmTransferLineAmount,
  resolvePharmTransferBasePrices,
} from "@/lib/pharm-transfer-calculations";
import { validatePharmTransferQtyAgainstAvailable } from "@/lib/pharm-transfer-item-stock-search";
import {
  buildRowUnitComboboxOptions,
  findCatalogItemByCode,
} from "@/lib/item-unit-options";
import { cn } from "@/lib/utils";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PharmTransferDetail, PharmTransferDetailPatch } from "@/types/pharm-transfer";
import type { UnitItem } from "@/types/unit";

const gridInputClass = cn("h-8 w-full min-w-0 tabular-nums", formControlFocusClass);

type PharmTransferDetailsGridProps = {
  rows: PharmTransferDetail[];
  itemByCode: Map<string, ItemCatalogItem>;
  units: UnitItem[];
  unitsLoading?: boolean;
  token?: string | null;
  disabled: boolean;
  selectedRowIndex: number;
  onSelectRow: (index: number) => void;
  onChangeRow: (index: number, patch: PharmTransferDetailPatch) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  itemLanguage?: "en" | "ar";
};

export function PharmTransferDetailsGrid({
  rows,
  itemByCode,
  units,
  unitsLoading = false,
  token,
  disabled,
  selectedRowIndex,
  onSelectRow,
  onChangeRow,
  onAddRow,
  onRemoveRow,
  itemLanguage = "en",
}: PharmTransferDetailsGridProps) {
  const keyboardRef = useRef<{
    focusColumnAfter: (rowIndex: number, appliedColumnKey: string) => void;
  } | null>(null);

  const resolveItemName = useCallback(
    (row: PharmTransferDetail) => {
      if (itemLanguage === "ar") {
        return row.itmNameAr?.trim() || row.itmNameEn?.trim() || row.itmId;
      }
      return row.itmNameEn?.trim() || row.itmNameAr?.trim() || row.itmId;
    },
    [itemLanguage]
  );

  const applyUnitConversionToRow = useCallback(
    async (index: number, row: PharmTransferDetail, unitId: number) => {
      const code = row.itmId.trim();
      if (!token || !code || unitId <= 0) {
        onChangeRow(index, { unitId });
        return;
      }

      try {
        // Same as Purchase: recover Unit-1 bases from the current unit's PriceQtyNet
        // before applying the new unit factor (loaded rows may not have true bases).
        let baseItmSell: number;
        let baseCostPrice: number;

        if (row.unitId > 0 && row.unitId !== unitId) {
          const current = await getUnitConversionInfo(token, code, row.unitId, 1);
          const currentFactor =
            current.priceQtyNet != null &&
            Number.isFinite(current.priceQtyNet) &&
            current.priceQtyNet > 0
              ? current.priceQtyNet
              : 1;
          baseItmSell = (Number(row.itmSell) || 0) / currentFactor;
          baseCostPrice = (Number(row.purchPrice) || 0) / currentFactor;
        } else {
          const bases = resolvePharmTransferBasePrices(row);
          baseItmSell = bases.baseItmSell;
          baseCostPrice = bases.baseCostPrice;
        }

        const info = await getUnitConversionInfo(token, code, unitId, 1);
        if (info.errorMessage?.trim()) {
          toast.error(info.errorMessage.trim());
          return;
        }

        const prices = applyPharmTransferUnitPrices(
          baseItmSell,
          baseCostPrice,
          info.priceQtyNet
        );

        onChangeRow(index, {
          unitId,
          unitName: info.unitName || row.unitName,
          itmSell: prices.itmSell,
          purchPrice: prices.purchPrice,
          baseItmSell,
          baseCostPrice,
          priceQtyNet: prices.priceQtyNet,
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unit conversion failed."
        );
      }
    },
    [onChangeRow, token]
  );

  const columns = useMemo<ColumnDef<PharmTransferDetail>[]>(
    () => [
      {
        id: "line",
        header: "#",
        cell: ({ row }) => row.index + 1,
        meta: { editable: false },
      },
      {
        id: "itmNameEn",
        header: "Item Name",
        cell: ({ row }) => (
          <span className="block truncate px-1 py-1.5 text-sm">
            {resolveItemName(row.original) || "—"}
          </span>
        ),
        meta: { editable: false },
      },
      {
        id: "batchNo",
        header: "Batch No",
        cell: ({ row }) => (
          <span className="block truncate px-1 py-1.5 text-sm tabular-nums">
            {row.original.batchNo?.trim() || "—"}
          </span>
        ),
        meta: { editable: false },
      },
      {
        id: "expDate",
        header: "Exp. Date",
        cell: ({ row }) => (
          <span className="block truncate px-1 py-1.5 text-sm tabular-nums">
            {row.original.expDate?.trim() || "—"}
          </span>
        ),
        meta: { editable: false },
      },
      {
        id: "qnty",
        header: "Quantity",
        cell: ({ row }) => {
          const index = row.index;
          return (
            <Input
              type="number"
              min={0}
              step="any"
              disabled={disabled}
              className={gridInputClass}
              value={Number.isFinite(row.original.qnty) ? row.original.qnty : ""}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                const qnty = Number.isFinite(parsed) ? parsed : 0;
                const availableError = validatePharmTransferQtyAgainstAvailable(
                  qnty,
                  row.original.stockAvailableQty
                );
                if (availableError) {
                  toast.error(availableError);
                }
                onChangeRow(index, { qnty });
              }}
            />
          );
        },
        meta: { editable: true },
      },
      {
        id: "unitId",
        header: "Unit",
        cell: ({ row }) => {
          const index = row.index;
          const detail = row.original;
          const hasItem = Boolean(detail.itmId.trim());
          const catalogItem = hasItem
            ? findCatalogItemByCode(detail.itmId, itemByCode)
            : null;
          const options: ComboboxOption[] = buildRowUnitComboboxOptions(
            units,
            catalogItem,
            hasItem
          );

          return (
            <SearchableCombobox
              disabled={disabled || unitsLoading || !hasItem}
              options={options}
              value={detail.unitId > 0 ? String(detail.unitId) : ""}
              onValueChange={(value) => {
                const unitId = Number(value);
                void applyUnitConversionToRow(
                  index,
                  detail,
                  Number.isFinite(unitId) ? unitId : 0
                );
              }}
              placeholder={
                unitsLoading
                  ? "Loading…"
                  : hasItem && options.length === 0
                    ? "No units"
                    : "Unit"
              }
              className="h-8"
            />
          );
        },
        meta: { editable: true },
      },
      {
        id: "itmSell",
        header: "Sales Price",
        cell: ({ row }) => (
          <Input
            type="number"
            readOnly
            disabled
            className={cn(gridInputClass, "bg-muted/50")}
            value={Number.isFinite(row.original.itmSell) ? row.original.itmSell : ""}
          />
        ),
        meta: { editable: false },
      },
      {
        id: "lineTotal",
        header: "Total Amount",
        cell: ({ row }) => (
          <Input
            readOnly
            disabled
            className={cn(gridInputClass, "bg-muted/50")}
            value={computePharmTransferLineAmount(row.original).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          />
        ),
        meta: { editable: false },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={disabled}
            onClick={() => onRemoveRow(row.index)}
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Remove row</span>
          </Button>
        ),
        meta: { editable: false },
      },
    ],
    [
      applyUnitConversionToRow,
      disabled,
      itemByCode,
      onChangeRow,
      onRemoveRow,
      resolveItemName,
      units,
      unitsLoading,
    ]
  );

  return (
    <MasterDetailGrid
      moduleKey="transfer"
      storageKey={PHARM_TRANSFER_DETAIL_GRID_STORAGE_KEY}
      legacyWidthStorageKey={PHARM_TRANSFER_DETAIL_GRID_LEGACY_WIDTH_KEY}
      columnConfig={PHARM_TRANSFER_DETAIL_GRID_COLUMNS}
      columns={columns}
      data={rows}
      getRowId={(row) => row.clientRowId}
      editableColumns={PHARM_TRANSFER_DETAIL_EDITABLE_COLUMNS}
      selectedRowIndex={selectedRowIndex}
      onSelectRow={onSelectRow}
      disabled={disabled}
      onAddRow={onAddRow}
      onRemoveRow={onRemoveRow}
      keyboardRef={keyboardRef}
      getFocusColumnAfter={getPharmTransferFocusColumnAfter}
      toolbar={
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onAddRow}>
          <Plus className="mr-1 size-4" />
          Add row
        </Button>
      }
      hint="Use Search Item above the grid to add stock items. Unit changes recalculate sales prices like Purchase."
    />
  );
}
