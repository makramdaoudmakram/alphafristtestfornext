"use client";

import { useMemo, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { MasterDetailGrid } from "@/components/grid/master-detail-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchableCombobox,
} from "@/components/ui/searchable-combobox";
import { ExpDateMmYyyyInput } from "@/components/purchase/ExpDateMmYyyyInput";
import { ItemCatalogAutocompleteCell } from "@/components/purchase/ItemCatalogAutocompleteCell";
import {
  getPurchaseFocusColumnAfter,
  PURCHASE_DETAIL_EDITABLE_COLUMNS,
  PURCHASE_DETAIL_GRID_COLUMNS,
  PURCHASE_DETAIL_GRID_LEGACY_WIDTH_KEY,
  PURCHASE_DETAIL_GRID_STORAGE_KEY,
} from "@/components/purchase/purchase-detail-grid-columns";
import { getBranchTypeSelectOptions } from "@/lib/movment-enums";
import {
  buildRowUnitComboboxOptions,
  findCatalogItemByCode,
} from "@/lib/item-unit-options";
import { cn } from "@/lib/utils";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PurchaseDetail } from "@/types/purchase";
import type { UnitItem } from "@/types/unit";

const branchTypeOptions = getBranchTypeSelectOptions();
const gridInputClass = cn("h-8 w-full min-w-0 tabular-nums", formControlFocusClass);

type NumericDetailField =
  | "qnty"
  | "bonus"
  | "itmPurPrice"
  | "itmSell"
  | "itmTaxPrice"
  | "itmTaxTotal"
  | "itmExtraDis"
  | "itmDisPer"
  | "itmDisMon"
  | "itmCost"
  | "itmNet"
  | "stdItmStock";

type DetailsGridProps = {
  rows: PurchaseDetail[];
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
  onChangeRow: (index: number, patch: Partial<PurchaseDetail>) => void;
  onCatalogItemApplied?: (item: ItemCatalogItem) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
};

export function DetailsGrid({
  rows,
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
  } | null>(null);

  const columns = useMemo<ColumnDef<PurchaseDetail>[]>(() => {
    const numberCell = (
      field: NumericDetailField,
      dataCol: string,
      header: string
    ): ColumnDef<PurchaseDetail> => ({
      id: field,
      accessorKey: field,
      header,
      cell: ({ row }) => (
        <Input
          data-row={row.index}
          data-col={dataCol}
          type="number"
          step="0.01"
          disabled={disabled}
          value={row.original[field]}
          onFocus={() => onSelectRow(row.index)}
          onChange={(e) =>
            onChangeRow(row.index, {
              [field]: Number(e.target.value) || 0,
            } as Partial<PurchaseDetail>)
          }
          className={gridInputClass}
        />
      ),
    });

    return [
      {
        id: "line",
        header: "#",
        cell: ({ row }) => row.index + 1,
      },
      {
        id: "itmNameAr",
        header: "Itm_Name_Ar",
        cell: ({ row }) => (
          <ItemCatalogAutocompleteCell
            field="nameAr"
            rowIndex={row.index}
            dataCol="itmNameAr"
            value={row.original.itmNameAr}
            token={token}
            catalogItems={catalogItems}
            disabled={disabled}
            inputClassName="w-full min-w-0"
            onFocusRow={() => onSelectRow(row.index)}
            onChangeRow={(patch) => onChangeRow(row.index, patch)}
            onItemApplied={onCatalogItemApplied}
            onAfterApply={() =>
              keyboardRef.current?.focusColumnAfter(row.index, "itmNameAr")
            }
          />
        ),
      },
      {
        id: "itmNameEn",
        header: "Itm_Name_En",
        cell: ({ row }) => (
          <ItemCatalogAutocompleteCell
            field="nameEn"
            rowIndex={row.index}
            dataCol="itmNameEn"
            value={row.original.itmNameEn}
            token={token}
            catalogItems={catalogItems}
            disabled={disabled}
            inputClassName="w-full min-w-0"
            onFocusRow={() => onSelectRow(row.index)}
            onChangeRow={(patch) => onChangeRow(row.index, patch)}
            onItemApplied={onCatalogItemApplied}
            onAfterApply={() =>
              keyboardRef.current?.focusColumnAfter(row.index, "itmNameEn")
            }
          />
        ),
      },
      numberCell("qnty", "qnty", "Qty"),
      numberCell("bonus", "bonus", "Bonus"),
      {
        id: "unitId",
        header: "Unit",
        cell: ({ row }) => {
          const hasItem = Boolean(row.original.itmId?.trim());
          const catalogItem = hasItem
            ? findCatalogItemByCode(
                row.original.itmId,
                itemByCode,
                catalogItems
              )
            : null;
          const rowUnitOptions = buildRowUnitComboboxOptions(
            units,
            catalogItem,
            hasItem
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
                onChangeRow(row.index, {
                  unitId: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
                });
              }}
              options={rowUnitOptions}
              disabled={disabled || unitsLoading}
              dataRow={row.index}
              dataCol="unitId"
              placeholder={unitsLoading ? "Loading…" : "Unit"}
              searchPlaceholder="Search unit..."
              emptyMessage={
                unitsLoading
                  ? "Loading units…"
                  : hasItem
                    ? "No units configured for this item."
                    : "No units found."
              }
              className="h-8 w-full min-w-0 text-xs"
            />
          );
        },
      },
      numberCell("itmPurPrice", "itmPurPrice", "Purch"),
      numberCell("itmSell", "itmSell", "ItmSell"),
      numberCell("itmTaxPrice", "itmTaxPrice", "Tax price"),
      numberCell("itmTaxTotal", "itmTaxTotal", "Tax"),
      numberCell("itmExtraDis", "itmExtraDis", "Extra disc"),
      numberCell("itmDisPer", "itmDisPer", "Disc %"),
      numberCell("itmDisMon", "itmDisMon", "Disc amt"),
      numberCell("itmCost", "itmCost", "Cost"),
      numberCell("itmNet", "itmNet", "Net"),
      numberCell("stdItmStock", "stdItmStock", "Std stock"),
      {
        id: "stoId",
        accessorKey: "stoId",
        header: "Store",
        cell: ({ row }) => (
          <Select
            value={row.original.stoId?.trim() || undefined}
            onValueChange={(value) => onChangeRow(row.index, { stoId: value })}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn("h-8 w-full min-w-0 text-xs", formControlFocusClass)}
              data-row={row.index}
              data-col="stoId"
              onFocus={() => onSelectRow(row.index)}
            >
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              {branchTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        id: "expDate",
        accessorKey: "expDate",
        header: "Exp MM/YYYY",
        cell: ({ row }) => (
          <ExpDateMmYyyyInput
            rowIndex={row.index}
            storedValue={row.original.expDate}
            disabled={disabled}
            onFocusRow={() => onSelectRow(row.index)}
            onCommit={(expDate) => onChangeRow(row.index, { expDate })}
          />
        ),
      },
      {
        id: "lineTotal",
        accessorKey: "lineTotal",
        header: "Line total",
        cell: ({ row }) => (
          <span className="block w-full truncate px-2 text-right text-sm font-medium tabular-nums">
            {row.original.lineTotal.toFixed(2)}
          </span>
        ),
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
            aria-label="Delete row"
          >
            <Trash2 className="size-4" />
          </Button>
        ),
      },
    ];
  }, [
    disabled,
    catalogItems,
    itemByCode,
    token,
    units,
    unitsLoading,
    onCatalogItemApplied,
    onChangeRow,
    onRemoveRow,
    onSelectRow,
  ]);

  return (
    <MasterDetailGrid
      moduleKey="purchase"
      storageKey={PURCHASE_DETAIL_GRID_STORAGE_KEY}
      legacyWidthStorageKey={PURCHASE_DETAIL_GRID_LEGACY_WIDTH_KEY}
      columnConfig={PURCHASE_DETAIL_GRID_COLUMNS}
      columns={columns}
      data={rows}
      getRowId={(row) => row.clientRowId}
      editableColumns={PURCHASE_DETAIL_EDITABLE_COLUMNS}
      selectedRowIndex={selectedRowIndex}
      onSelectRow={onSelectRow}
      disabled={disabled}
      onAddRow={onAddRow}
      onRemoveRow={onRemoveRow}
      keyboardRef={keyboardRef}
      getFocusColumnAfter={getPurchaseFocusColumnAfter}
      isGridField={(target) =>
        target.tagName === "INPUT" ||
        target.tagName === "BUTTON" ||
        target.closest('[data-combobox-root="true"]') != null ||
        (target.tagName === "BUTTON" && target.dataset.col === "stoId")
      }
      shouldIgnoreKeyDown={(target, event) => {
        const comboboxRoot = target.closest('[data-combobox-root="true"]');
        if (
          comboboxRoot?.getAttribute("data-combobox-open") === "true" &&
          (event.key === "ArrowUp" ||
            event.key === "ArrowDown" ||
            event.key === "Enter" ||
            event.key === "Escape")
        ) {
          return true;
        }
        return false;
      }}
      emptyMessage="No detail lines. Click Add row or press Insert."
      toolbar={
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={onAddRow}
        >
          <Plus className="size-4" />
          Add row
        </Button>
      }
      hint={
        <>
          Drag column borders to resize. Use ⋮ to show or hide columns (saved automatically).
          Keyboard: type in Arabic / English name for autocomplete (max 15). ↑↓ to highlight a
          suggestion, Enter to apply and jump to Qty.
          {catalogLoading ? (
            <span className="text-muted-foreground block pt-1">
              Loading item catalog…
            </span>
          ) : null}
          {unitsLoading ? (
            <span className="text-muted-foreground block pt-1">
              Loading unit names…
            </span>
          ) : null}
          {catalogLoaded && catalogItems.length === 0 ? (
            <span className="text-destructive block pt-1">
              Item catalog not loaded — stay signed in and confirm the API is running.
            </span>
          ) : null}
        </>
      }
    />
  );
}
