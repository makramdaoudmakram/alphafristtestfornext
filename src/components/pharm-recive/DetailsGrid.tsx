"use client";

import { useMemo, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { MasterDetailGrid } from "@/components/grid/master-detail-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import { ItemCatalogAutocompleteCell } from "@/components/return/ItemCatalogAutocompleteCell";
import { formatExpDateMmYyyy } from "@/lib/purchase-exp-date";
import {
  PHARM_RECIVE_DETAIL_EDITABLE_COLUMNS,
  PHARM_RECIVE_DETAIL_GRID_COLUMNS,
  PHARM_RECIVE_DETAIL_GRID_STORAGE_KEY,
  getPharmReciveFocusColumnAfter,
} from "@/components/pharm-recive/pharm-recive-detail-grid-columns";
import { catalogDefaultPrices } from "@/lib/item-catalog-search";
import {
  buildRowUnitComboboxOptions,
  findCatalogItemByCode,
  getItemDefaultUnitId,
} from "@/lib/item-unit-options";
import { cn } from "@/lib/utils";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type {
  PharmReciveDetail,
  PharmReciveDetailPatch,
  PharmReciveItemLanguage,
} from "@/types/pharm-recive";
import type { ReturnDetailPatch } from "@/types/return";
import type { UnitItem } from "@/types/unit";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";

const gridInputClass = cn("h-8 w-full min-w-0 tabular-nums", formControlFocusClass);

function mapReturnPatchToPharmRecive(patch: ReturnDetailPatch): PharmReciveDetailPatch {
  return {
    itmId: patch.itmId,
    itmNameAr: patch.itmNameAr,
    itmNameEn: patch.itmNameEn,
    expDate: patch.expDate,
    qnty: patch.qnty,
    itmPurPrice: patch.itmPurPrice,
    itmSellPrice: patch.itmSell,
    itemCostPrice: patch.itmCost ?? patch.itmPurPrice,
    unitId: patch.unitId,
    itmStock: patch.stdItmStock,
    batchNo: patch.batchNo,
  };
}

type DetailsGridProps = {
  rows: PharmReciveDetail[];
  itemLanguage: PharmReciveItemLanguage;
  catalogItems: ItemCatalogItem[];
  itemByCode: Map<string, ItemCatalogItem>;
  units: UnitItem[];
  unitsLoading?: boolean;
  token?: string | null;
  catalogLoading?: boolean;
  catalogLoaded?: boolean;
  disabled: boolean;
  selectedRowIndex: number;
  onSelectRow: (index: number) => void;
  onChangeRow: (index: number, patch: PharmReciveDetailPatch) => void;
  onCatalogItemApplied?: (item: ItemCatalogItem) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
};

export function DetailsGrid({
  rows,
  itemLanguage,
  catalogItems,
  itemByCode,
  units,
  unitsLoading = false,
  token,
  catalogLoading = false,
  catalogLoaded = false,
  disabled,
  selectedRowIndex,
  onSelectRow,
  onChangeRow,
  onCatalogItemApplied,
  onAddRow,
  onRemoveRow,
}: DetailsGridProps) {
  const keyboardRef = useRef<{
    focusColumnAfter: (rowIndex: number, appliedColumnKey: string) => void;
    focusCell: (rowIndex: number, columnKey: string) => void;
  } | null>(null);

  const itemField = itemLanguage === "ar" ? "nameAr" : "nameEn";

  const columns = useMemo<ColumnDef<PharmReciveDetail>[]>(
    () => [
      {
        id: "line",
        header: "#",
        size: 44,
        cell: ({ row }) => row.index + 1,
      },
      {
        id: "itemName",
        header: "Item",
        size: 180,
        meta: { editable: true },
        cell: ({ row }) => (
          <ItemCatalogAutocompleteCell
            field={itemField}
            rowIndex={row.index}
            dataCol="itemName"
            value={
              (itemLanguage === "ar"
                ? row.original.itmNameAr
                : row.original.itmNameEn
              )?.trim() ||
              row.original.itmId?.trim() ||
              ""
            }
            token={token}
            catalogItems={catalogItems}
            disabled={disabled}
            inputClassName="w-full min-w-0"
            onFocusRow={() => onSelectRow(row.index)}
            onChangeRow={(patch) =>
              onChangeRow(row.index, mapReturnPatchToPharmRecive(patch))
            }
            onItemApplied={(item) => {
              onCatalogItemApplied?.(item);
              const { itmPurPrice, itmSell } = catalogDefaultPrices(item);
              onChangeRow(row.index, {
                itmId: item.itmCode?.trim() ?? "",
                itmNameAr: item.itmNameAr?.trim() ?? "",
                itmNameEn: item.itmNameEn?.trim() ?? "",
                unitId: getItemDefaultUnitId(item),
                itmPurPrice,
                itmSellPrice: itmSell,
                itemCostPrice: itmPurPrice,
                batchNo: "",
                expDate: "",
                maxSearchQty: undefined,
                itmStock: 0,
              });
            }}
            onAfterApply={() =>
              keyboardRef.current?.focusColumnAfter(row.index, "itemName")
            }
          />
        ),
      },
      {
        id: "expDate",
        header: "Exp MM/YYYY",
        size: 112,
        cell: ({ row }) => (
          <Input
            readOnly
            disabled
            className={cn(gridInputClass, "bg-muted/50 opacity-90")}
            value={formatExpDateMmYyyy(row.original.expDate)}
          />
        ),
      },
      {
        id: "unitId",
        header: "Unit",
        size: 120,
        meta: { editable: true },
        cell: ({ row }) => {
          const hasItem = Boolean(row.original.itmId?.trim());
          const catalogItem = hasItem
            ? findCatalogItemByCode(
                row.original.itmId,
                itemByCode,
                catalogItems
              )
            : null;
          const options = buildRowUnitComboboxOptions(
            units,
            catalogItem,
            hasItem
          );
          return (
            <SearchableCombobox
              options={options}
              value={row.original.unitId != null ? String(row.original.unitId) : ""}
              disabled={disabled || unitsLoading}
              placeholder="Unit"
              onValueChange={(value) =>
                onChangeRow(row.index, {
                  unitId: value ? Number(value) : null,
                })
              }
            />
          );
        },
      },
      {
        id: "qnty",
        header: "Quantity",
        size: 96,
        meta: { editable: true },
        cell: ({ row }) => (
          <Input
            data-row={row.index}
            data-col="qnty"
            type="number"
            step="1"
            min={1}
            disabled={disabled}
            className={gridInputClass}
            value={row.original.qnty}
            onFocus={() => onSelectRow(row.index)}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) return;
              const parsed = Number(raw);
              if (!Number.isFinite(parsed)) return;
              onChangeRow(row.index, { qnty: parsed });
            }}
          />
        ),
      },
      {
        id: "itmSellPrice",
        header: "Sales Price",
        size: 110,
        meta: { editable: true },
        cell: ({ row }) => (
          <Input
            data-row={row.index}
            data-col="itmSellPrice"
            type="number"
            step="0.01"
            min={0}
            disabled={disabled}
            className={gridInputClass}
            value={row.original.itmSellPrice}
            onFocus={() => onSelectRow(row.index)}
            onChange={(e) =>
              onChangeRow(row.index, { itmSellPrice: Number(e.target.value) || 0 })
            }
          />
        ),
      },
      {
        id: "lineTotal",
        header: "Total",
        size: 100,
        cell: ({ row }) => (
          <Input
            readOnly
            disabled
            className={cn(gridInputClass, "bg-muted/50 opacity-90")}
            value={row.original.lineTotal.toFixed(2)}
          />
        ),
      },
      {
        id: "batchNo",
        header: "Batch No",
        size: 120,
        cell: ({ row }) => (
          <Input
            readOnly
            disabled
            className={cn(gridInputClass, "bg-muted/50 opacity-90")}
            maxLength={15}
            value={row.original.batchNo}
          />
        ),
      },
      {
        id: "actions",
        header: "",
        size: 52,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={disabled}
            onClick={() => onRemoveRow(row.index)}
            aria-label="Delete row"
          >
            <Trash2 className="size-4" />
          </Button>
        ),
      },
    ],
    [
      catalogItems,
      disabled,
      itemByCode,
      itemField,
      itemLanguage,
      onCatalogItemApplied,
      onChangeRow,
      onRemoveRow,
      onSelectRow,
      token,
      units,
      unitsLoading,
    ]
  );

  return (
    <MasterDetailGrid
      moduleKey="pharm-recive"
      storageKey={PHARM_RECIVE_DETAIL_GRID_STORAGE_KEY}
      columnConfig={PHARM_RECIVE_DETAIL_GRID_COLUMNS}
      columns={columns}
      data={rows}
      getRowId={(row) => row.clientRowId}
      editableColumns={PHARM_RECIVE_DETAIL_EDITABLE_COLUMNS}
      selectedRowIndex={selectedRowIndex}
      onSelectRow={onSelectRow}
      disabled={disabled}
      onAddRow={onAddRow}
      onRemoveRow={onRemoveRow}
      keyboardRef={keyboardRef}
      getFocusColumnAfter={getPharmReciveFocusColumnAfter}
      emptyMessage="No detail lines. Click Add row or use item search."
      toolbar={
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onAddRow}>
          <Plus className="size-4" />
          Add row
        </Button>
      }
      hint={
        catalogLoading || (catalogLoaded && catalogItems.length === 0) ? (
          <>
            {catalogLoading ? (
              <span className="text-muted-foreground block">Loading item catalog…</span>
            ) : null}
            {catalogLoaded && catalogItems.length === 0 ? (
              <span className="text-destructive block">
                Item catalog not loaded — stay signed in and confirm the API is running.
              </span>
            ) : null}
          </>
        ) : undefined
      }
    />
  );
}
