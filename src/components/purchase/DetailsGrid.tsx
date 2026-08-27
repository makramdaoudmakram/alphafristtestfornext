"use client";

import { useCallback, useMemo, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { MasterDetailGrid } from "@/components/grid/master-detail-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import {
  SearchableCombobox,
  type ComboboxOption,
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
import { getUnitConversionInfo } from "@/lib/api-client";
import { catalogDefaultPrices } from "@/lib/item-catalog-search";
import {
  buildRowUnitComboboxOptions,
  findCatalogItemByCode,
  getItemDefaultUnitId,
} from "@/lib/item-unit-options";
import { formatStorDisplayName } from "@/lib/purchase-stores";
import {
  applyPriceQtyNetToBasePrices,
  basePricesFromDisplayed,
  resolveRowBasePrices,
} from "@/lib/purchase-unit-conversion";
import { cn } from "@/lib/utils";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PurchaseDetail, PurchaseDetailPatch } from "@/types/purchase";
import type { StorItem } from "@/types/stor";
import type { UnitItem } from "@/types/unit";

const gridInputClass = cn("h-8 w-full min-w-0 tabular-nums", formControlFocusClass);

function stockConversionQuantity(row: PurchaseDetail): number {
  return (Number(row.qnty) || 0) + (Number(row.bonus) || 0);
}

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Keep Qty + Bonus from the same visible detail row when recalculating tax. */
function withSameRowQtyBonus(
  row: PurchaseDetail,
  patch: PurchaseDetailPatch
): PurchaseDetailPatch {
  return {
    qnty: row.qnty,
    bonus: row.bonus,
    ...patch,
  };
}

type NumericDetailField =
  | "qnty"
  | "bonus"
  | "itmPurPrice"
  | "itmSell"
  | "itmTaxTotal"
  | "itmExtraDis"
  | "itmDisPer"
  | "itmDisMon"
  | "itmCost"
  | "itmNet"
  | "stdItmStock";

type OptionalNumericDetailField = "taxPercent" | "itmTaxPrice";

type DetailsGridProps = {
  rows: PurchaseDetail[];
  catalogItems: ItemCatalogItem[];
  itemByCode: Map<string, ItemCatalogItem>;
  units: UnitItem[];
  unitsLoading?: boolean;
  stores: StorItem[];
  storesLoading?: boolean;
  token?: string | null;
  catalogLoading?: boolean;
  catalogLoaded?: boolean;
  disabled: boolean;
  selectedRowIndex: number;
  onSelectRow: (index: number) => void;
  onChangeRow: (index: number, patch: PurchaseDetailPatch) => void;
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
  stores,
  storesLoading = false,
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
  const conversionSeqRef = useRef(new Map<string, number>());

  const storeOptions = useMemo<ComboboxOption[]>(
    () =>
      stores
        .map((store) => ({
          value: String(store.id),
          label: formatStorDisplayName(store),
        }))
        .filter((option) => option.label.length > 0),
    [stores]
  );

  const applyUnitConversionToRow = useCallback((
    rowIndex: number,
    row: PurchaseDetail,
    itemCode: string,
    unitId: number | null,
    basePrices?: { baseItmPurPrice: number; baseItmSell: number },
    options?: { skipDiscPercent?: boolean; skipTax?: boolean }
  ) => {
    const code = itemCode.trim();
    if (!token || !code || unitId == null || unitId <= 0) return;

    const requestId = (conversionSeqRef.current.get(row.clientRowId) ?? 0) + 1;
    conversionSeqRef.current.set(row.clientRowId, requestId);

    void (async () => {
      let base = basePrices;
      if (!base && (row.baseItmPurPrice == null || row.baseItmSell == null)) {
        if (row.unitId != null && row.unitId > 0 && row.unitId !== unitId) {
          const current = await getUnitConversionInfo(
            token,
            code,
            row.unitId,
            stockConversionQuantity(row)
          );
          if (conversionSeqRef.current.get(row.clientRowId) !== requestId) return;
          base = basePricesFromDisplayed(
            row.itmPurPrice,
            row.itmSell,
            current.priceQtyNet
          );
        }
      }
      base ??= resolveRowBasePrices(row);

      const info = await getUnitConversionInfo(
        token,
        code,
        unitId,
        stockConversionQuantity(row)
      );
      if (conversionSeqRef.current.get(row.clientRowId) !== requestId) return;

      const nextPrices = applyPriceQtyNetToBasePrices(
        base.baseItmPurPrice,
        base.baseItmSell,
        info.priceQtyNet
      );

      onChangeRow(
        rowIndex,
        withSameRowQtyBonus(row, {
          unitId,
          itmPurPrice: nextPrices.itmPurPrice,
          itmSell: nextPrices.itmSell,
          baseItmPurPrice: base.baseItmPurPrice,
          baseItmSell: base.baseItmSell,
          priceQtyNet: nextPrices.priceQtyNet,
          skipDiscPercent: options?.skipDiscPercent === true ? true : undefined,
          skipTax: options?.skipTax === true ? true : undefined,
        })
      );
    })();
  }, [onChangeRow, token]);

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
          onChange={(e) => {
            const nextValue = Number(e.target.value) || 0;
            const patch = {
              [field]: nextValue,
            } as Partial<PurchaseDetail>;
            if (field === "itmPurPrice" || field === "itmSell") {
              const recovered = basePricesFromDisplayed(
                field === "itmPurPrice" ? nextValue : row.original.itmPurPrice,
                field === "itmSell" ? nextValue : row.original.itmSell,
                row.original.priceQtyNet
              );
              patch.baseItmPurPrice = recovered.baseItmPurPrice;
              patch.baseItmSell = recovered.baseItmSell;
            }
            onChangeRow(
              row.index,
              field === "qnty" ||
              field === "bonus" ||
              field === "itmPurPrice" ||
              field === "itmExtraDis" ||
              field === "itmSell" ||
              field === "itmNet"
                ? withSameRowQtyBonus(row.original, patch)
                : patch
            );
          }}
          className={gridInputClass}
        />
      ),
    });

    const optionalNumberCell = (
      field: OptionalNumericDetailField,
      dataCol: string,
      header: string
    ): ColumnDef<PurchaseDetail> => ({
      id: field,
      accessorKey: field,
      header,
      cell: ({ row }) => {
        const value = row.original[field];
        return (
          <Input
            data-row={row.index}
            data-col={dataCol}
            type="number"
            step="0.01"
            disabled={disabled}
            value={value == null ? "" : value}
            onFocus={() => onSelectRow(row.index)}
            onChange={(e) => {
              const parsed = parseOptionalNumber(e.target.value);
              onChangeRow(
                row.index,
                withSameRowQtyBonus(row.original, {
                  [field]: parsed,
                } as Partial<PurchaseDetail>)
              );
            }}
            className={gridInputClass}
          />
        );
      },
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
            onItemApplied={(item) => {
              onCatalogItemApplied?.(item);
              const itemCode = item.itmCode?.trim() ?? "";
              const unitId = getItemDefaultUnitId(item);
              const { itmPurPrice, itmSell } = catalogDefaultPrices(item);
              applyUnitConversionToRow(row.index, row.original, itemCode, unitId, {
                baseItmPurPrice: itmPurPrice,
                baseItmSell: itmSell,
              }, { skipDiscPercent: true, skipTax: true });
            }}
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
            onItemApplied={(item) => {
              onCatalogItemApplied?.(item);
              const itemCode = item.itmCode?.trim() ?? "";
              const unitId = getItemDefaultUnitId(item);
              const { itmPurPrice, itmSell } = catalogDefaultPrices(item);
              applyUnitConversionToRow(row.index, row.original, itemCode, unitId, {
                baseItmPurPrice: itmPurPrice,
                baseItmSell: itmSell,
              }, { skipDiscPercent: true, skipTax: true });
            }}
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
                const unitId =
                  Number.isFinite(parsed) && parsed > 0 ? parsed : null;
                onChangeRow(row.index, { unitId });
                applyUnitConversionToRow(
                  row.index,
                  row.original,
                  row.original.itmId?.trim() ?? "",
                  unitId
                );
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
      optionalNumberCell("taxPercent", "taxPercent", "TaxPercent"),
      optionalNumberCell("itmTaxPrice", "itmTaxPrice", "Tax price"),
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
        cell: ({ row }) => {
          const storeId = row.original.stoId?.trim() ?? "";
          const known = storeOptions.some((option) => option.value === storeId);
          return (
            <SearchableCombobox
              value={storeId}
              onValueChange={(value) => onChangeRow(row.index, { stoId: value })}
              options={storeOptions}
              orphanLabel={known || !storeId ? null : "—"}
              disabled={disabled || storesLoading}
              dataRow={row.index}
              dataCol="stoId"
              placeholder={storesLoading ? "Loading…" : "Store"}
              searchPlaceholder="Search store..."
              emptyMessage={
                storesLoading
                  ? "Loading stores…"
                  : "No stores found. Select a Movement that has stores."
              }
              className="h-8 w-full min-w-0 text-xs"
            />
          );
        },
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
    storeOptions,
    storesLoading,
    onCatalogItemApplied,
    onChangeRow,
    onRemoveRow,
    onSelectRow,
    applyUnitConversionToRow,
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
        catalogLoading ||
        unitsLoading ||
        storesLoading ||
        (catalogLoaded && catalogItems.length === 0) ? (
          <>
            {catalogLoading ? (
              <span className="text-muted-foreground block">
                Loading item catalog…
              </span>
            ) : null}
            {unitsLoading ? (
              <span className="text-muted-foreground block">
                Loading unit names…
              </span>
            ) : null}
            {storesLoading ? (
              <span className="text-muted-foreground block">
                Loading stores…
              </span>
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
