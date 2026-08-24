"use client";

import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import { ExpDateMmYyyyInput } from "@/components/purchase/ExpDateMmYyyyInput";
import {
  buildRowUnitComboboxOptions,
  findCatalogItemByCode,
} from "@/lib/item-unit-options";
import { cn } from "@/lib/utils";
import type { ItemCatalogItem } from "@/types/item-catalog";
import type { PurTransDExcelPreviewRow } from "@/types/purchase";
import type { UnitItem } from "@/types/unit";

export const EXCEL_IMPORT_EDITABLE_FIELDS = [
  "qnty",
  "bonus",
  "unitId",
  "itmPurPrice",
  "itmSell",
  "itmTaxPrice",
  "itmExtraDis",
  "itmDisPer",
  "itmDisMon",
  "expDate",
  "stoId",
] as const;

export type ExcelImportEditableField =
  (typeof EXCEL_IMPORT_EDITABLE_FIELDS)[number];

const DECIMAL_FIELDS = new Set<ExcelImportEditableField>([
  "qnty",
  "bonus",
  "itmPurPrice",
  "itmSell",
  "itmTaxPrice",
  "itmExtraDis",
  "itmDisPer",
  "itmDisMon",
]);

const gridInputClass = cn(
  "h-8 w-full min-w-[5.5rem] tabular-nums",
  formControlFocusClass
);

type PurchaseExcelImportEditableCellProps = {
  row: PurTransDExcelPreviewRow;
  field: ExcelImportEditableField;
  disabled: boolean;
  itemByCode: Map<string, ItemCatalogItem>;
  units: UnitItem[];
  unitsLoading: boolean;
  storeOptions: ComboboxOption[];
  storesLoading: boolean;
  invalid: boolean;
  onChange: (field: ExcelImportEditableField, value: string) => void;
};

export function isExcelImportEditableField(
  field: string
): field is ExcelImportEditableField {
  return (EXCEL_IMPORT_EDITABLE_FIELDS as readonly string[]).includes(field);
}

export function PurchaseExcelImportEditableCell({
  row,
  field,
  disabled,
  itemByCode,
  units,
  unitsLoading,
  storeOptions,
  storesLoading,
  invalid,
  onChange,
}: PurchaseExcelImportEditableCellProps) {
  const value = row[field] ?? "";

  if (field === "unitId") {
    const hasItem = Boolean(row.itmId?.trim());
    const catalogItem = hasItem
      ? findCatalogItemByCode(row.itmId, itemByCode)
      : null;
    const unitOptions = buildRowUnitComboboxOptions(units, catalogItem, hasItem);
    const selected = value.trim();
    const known = unitOptions.some((option) => option.value === selected);

    return (
      <SearchableCombobox
        value={selected}
        onValueChange={(next) => onChange("unitId", next)}
        options={unitOptions}
        orphanLabel={known || !selected ? null : selected}
        disabled={disabled || unitsLoading}
        placeholder={unitsLoading ? "Loading…" : "Unit"}
        searchPlaceholder="Search unit..."
        emptyMessage={
          unitsLoading
            ? "Loading units…"
            : hasItem
              ? "No units configured for this item."
              : "No units found."
        }
        className={cn(
          "h-8 w-full min-w-[7.5rem] text-xs",
          invalid && "border-destructive"
        )}
      />
    );
  }

  if (field === "stoId") {
    const selected = value.trim();
    const known = storeOptions.some((option) => option.value === selected);

    return (
      <SearchableCombobox
        value={selected}
        onValueChange={(next) => onChange("stoId", next)}
        options={storeOptions}
        orphanLabel={known || !selected ? null : selected}
        disabled={disabled || storesLoading}
        placeholder={storesLoading ? "Loading…" : "Store"}
        searchPlaceholder="Search store..."
        emptyMessage={
          storesLoading ? "Loading stores…" : "No stores found."
        }
        className={cn(
          "h-8 w-full min-w-[8rem] text-xs",
          invalid && "border-destructive"
        )}
      />
    );
  }

  if (field === "expDate") {
    return (
      <div className={cn("min-w-[6.5rem]", invalid && "rounded-md ring-1 ring-destructive")}>
        <ExpDateMmYyyyInput
          rowIndex={row.excelRowNumber}
          storedValue={value}
          disabled={disabled}
          onFocusRow={() => undefined}
          onCommit={(expDate) => onChange("expDate", expDate)}
        />
      </div>
    );
  }

  if (DECIMAL_FIELDS.has(field)) {
    return (
      <Input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={value}
        aria-invalid={invalid}
        onChange={(event) => onChange(field, event.target.value)}
        className={cn(gridInputClass, invalid && "border-destructive")}
      />
    );
  }

  return (
    <Input
      disabled={disabled}
      value={value}
      aria-invalid={invalid}
      onChange={(event) => onChange(field, event.target.value)}
      className={cn(gridInputClass, invalid && "border-destructive")}
    />
  );
}
