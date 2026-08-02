"use client";

import {
  FormFieldInline,
  FormFieldInlineWrap,
} from "@/components/ui/form-field-inline";
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
        <FormFieldInline
          id={`${idPrefix}itmComCode`}
          label="Company item code"
          value={formValues.itmComCode}
          onChange={(event) => setField("itmComCode", event.target.value)}
        />
        <FormFieldInlineWrap id={`${idPrefix}comId`} label="Company">
          <SearchableCombobox
            value={formValues.comId}
            onValueChange={(value) => setField("comId", value)}
            options={lookups.companyOptions}
            placeholder="Select company"
          />
        </FormFieldInlineWrap>
        <FormFieldInlineWrap id={`${idPrefix}itmGroup`} label="Group">
          <SearchableCombobox
            value={formValues.itmGroup}
            onValueChange={(value) => setField("itmGroup", value)}
            options={lookups.groupOptions}
            placeholder="Select group"
          />
        </FormFieldInlineWrap>
        <FormFieldInlineWrap id={`${idPrefix}itemForm`} label="Item format">
          <SearchableCombobox
            value={formValues.itemForm}
            onValueChange={(value) => setField("itemForm", value)}
            options={lookups.formatOptions}
            placeholder="Select format"
          />
        </FormFieldInlineWrap>
        <FormFieldInlineWrap id={`${idPrefix}itmOrigin`} label="Item origin">
          <SearchableCombobox
            value={formValues.itmOrigin}
            onValueChange={(value) => setField("itmOrigin", value)}
            options={lookups.originOptions}
            placeholder="Select origin"
          />
        </FormFieldInlineWrap>
        <FormFieldInlineWrap id={`${idPrefix}itmUnit1`} label="Unit 1">
          <SearchableCombobox
            value={formValues.itmUnit1}
            onValueChange={(value) => setField("itmUnit1", value)}
            options={lookups.unitOptions}
            placeholder="Select unit"
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
        <FormFieldInline
          id={`${idPrefix}itmDefPharmPrice`}
          label="Purchase price"
          type="number"
          step="0.01"
          value={formValues.itmDefPharmPrice}
          onChange={(event) => setField("itmDefPharmPrice", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmDefTax`}
          label="Default tax"
          type="number"
          step="0.01"
          value={formValues.itmDefTax}
          onChange={(event) => setField("itmDefTax", event.target.value)}
        />
        <FormFieldInlineWrap id={`${idPrefix}itmUnit2`} label="Unit 2">
          <SearchableCombobox
            value={formValues.itmUnit2}
            onValueChange={(value) => setField("itmUnit2", value)}
            options={lookups.unitOptions}
            placeholder="Select unit"
          />
        </FormFieldInlineWrap>
        <FormFieldInlineWrap id={`${idPrefix}itmUnit3`} label="Unit 3">
          <SearchableCombobox
            value={formValues.itmUnit3}
            onValueChange={(value) => setField("itmUnit3", value)}
            options={lookups.unitOptions}
            placeholder="Select unit"
          />
        </FormFieldInlineWrap>
        <FormFieldInline
          id={`${idPrefix}itmUnit1Unit2`}
          label="Unit 1 / Unit 2"
          type="number"
          step="0.01"
          value={formValues.itmUnit1Unit2}
          onChange={(event) => setField("itmUnit1Unit2", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmUnit1Unit3`}
          label="Unit 1 / Unit 3"
          type="number"
          step="0.01"
          value={formValues.itmUnit1Unit3}
          onChange={(event) => setField("itmUnit1Unit3", event.target.value)}
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
