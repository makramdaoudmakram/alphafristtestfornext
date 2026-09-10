"use client";

import {
  FormFieldInline,
  FormFieldInlineWrap,
  formControlFocusClass,
} from "@/components/ui/form-field-inline";
import { Input } from "@/components/ui/input";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import type { ItemCatalogFormValues } from "@/lib/item-catalog-form";
import type {
  ItemCatalogLookupOptions,
  ItemCatalogSetField,
} from "@/components/admin/item-catalog/types";

type GeneralInformationTabProps = {
  formValues: ItemCatalogFormValues;
  setField: ItemCatalogSetField;
  lookups: ItemCatalogLookupOptions;
  compact?: boolean;
  idPrefix?: string;
};

const unitConversionInputClass =
  "h-9 w-14 shrink-0 px-2 text-center sm:w-16";

function UnitRow({
  unitId,
  unitLabel,
  unitValue,
  onUnitChange,
  unitOptions,
  conversionId,
  conversionValue,
  onConversionChange,
  showConversion,
}: {
  unitId: string;
  unitLabel: string;
  unitValue: string;
  onUnitChange: (value: string) => void;
  unitOptions: ItemCatalogLookupOptions["unitOptions"];
  conversionId?: string;
  conversionValue?: string;
  onConversionChange?: (value: string) => void;
  showConversion: boolean;
}) {
  return (
    <FormFieldInlineWrap id={unitId} label={unitLabel}>
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchableCombobox
            value={unitValue}
            onValueChange={onUnitChange}
            options={unitOptions}
            placeholder="Select unit"
          />
        </div>
        {showConversion && conversionId && onConversionChange ? (
          <Input
            id={conversionId}
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            aria-label={`${unitLabel} conversion factor`}
            className={`${formControlFocusClass} ${unitConversionInputClass}`}
            value={conversionValue ?? ""}
            onChange={(event) => onConversionChange(event.target.value)}
          />
        ) : null}
      </div>
    </FormFieldInlineWrap>
  );
}

export function GeneralInformationTab({
  formValues,
  setField,
  lookups,
  idPrefix = "",
}: GeneralInformationTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-3">
        <FormFieldInline
          id={`${idPrefix}itmCode`}
          label="Item code"
          value={formValues.itmCode}
          onChange={(event) => setField("itmCode", event.target.value)}
          required
        />
        <FormFieldInline
          id={`${idPrefix}itmCode2`}
          label="User code"
          value={formValues.itmCode2}
          onChange={(event) => setField("itmCode2", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmIntCode`}
          label="International code"
          value={formValues.itmIntCode}
          onChange={(event) => setField("itmIntCode", event.target.value)}
        />

        <FormFieldInlineWrap id={`${idPrefix}itmGroup`} label="Group">
          <SearchableCombobox
            value={formValues.itmGroup}
            onValueChange={(value) => setField("itmGroup", value)}
            options={lookups.groupOptions}
            placeholder="Select group"
          />
        </FormFieldInlineWrap>
        <FormFieldInlineWrap id={`${idPrefix}itemForm`} label="Dosage Format">
          <SearchableCombobox
            value={formValues.itemForm}
            onValueChange={(value) => setField("itemForm", value)}
            options={lookups.formatOptions}
            placeholder="Select dosage format"
          />
        </FormFieldInlineWrap>
        <FormFieldInlineWrap id={`${idPrefix}brandId`} label="Brand">
          <SearchableCombobox
            value={formValues.brandId}
            onValueChange={(value) => setField("brandId", value)}
            options={lookups.brandOptions}
            placeholder="Select brand"
          />
        </FormFieldInlineWrap>
        <FormFieldInlineWrap
          id={`${idPrefix}itmOrigin`}
          label="Item Organization"
        >
          <SearchableCombobox
            value={formValues.itmOrigin}
            onValueChange={(value) => setField("itmOrigin", value)}
            options={lookups.originOptions}
            placeholder="Select item organization"
          />
        </FormFieldInlineWrap>
      </div>

      <div className="min-w-0 space-y-3">
        <FormFieldInline
          id={`${idPrefix}itmDefSellPrice`}
          label="Sales price"
          type="number"
          step="0.01"
          value={formValues.itmDefSellPrice}
          onChange={(event) => setField("itmDefSellPrice", event.target.value)}
        />

        <UnitRow
          unitId={`${idPrefix}itmUnit1`}
          unitLabel="Unit 1"
          unitValue={formValues.itmUnit1}
          onUnitChange={(value) => setField("itmUnit1", value)}
          unitOptions={lookups.unitOptions}
          showConversion={false}
        />
        <UnitRow
          unitId={`${idPrefix}itmUnit2`}
          unitLabel="Unit 2"
          unitValue={formValues.itmUnit2}
          onUnitChange={(value) => setField("itmUnit2", value)}
          unitOptions={lookups.unitOptions}
          conversionId={`${idPrefix}itmUnit1Unit2`}
          conversionValue={formValues.itmUnit1Unit2}
          onConversionChange={(value) => setField("itmUnit1Unit2", value)}
          showConversion
        />
        <UnitRow
          unitId={`${idPrefix}itmUnit3`}
          unitLabel="Unit 3"
          unitValue={formValues.itmUnit3}
          onUnitChange={(value) => setField("itmUnit3", value)}
          unitOptions={lookups.unitOptions}
          conversionId={`${idPrefix}itmUnit1Unit3`}
          conversionValue={formValues.itmUnit1Unit3}
          onConversionChange={(value) => setField("itmUnit1Unit3", value)}
          showConversion
        />

        <FormFieldInline
          id={`${idPrefix}itmNotes`}
          label="Notes"
          value={formValues.itmNotes}
          onChange={(event) => setField("itmNotes", event.target.value)}
        />
      </div>
    </div>
  );
}
