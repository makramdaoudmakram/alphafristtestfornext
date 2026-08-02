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

type SalesTabProps = {
  formValues: ItemCatalogFormValues;
  setField: ItemCatalogSetField;
  lookups: ItemCatalogLookupOptions;
  idPrefix?: string;
};

export function SalesTab({
  formValues,
  setField,
  lookups,
  idPrefix = "",
}: SalesTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-3">
        <FormFieldInline
          id={`${idPrefix}itmDefSellPrice-sales`}
          label="Sales price"
          type="number"
          step="0.01"
          value={formValues.itmDefSellPrice}
          onChange={(event) => setField("itmDefSellPrice", event.target.value)}
        />
        <FormFieldInlineWrap id={`${idPrefix}itmSellUnit`} label="Sell unit">
          <SearchableCombobox
            value={formValues.itmSellUnit}
            onValueChange={(value) => setField("itmSellUnit", value)}
            options={lookups.unitOptions}
            placeholder="Select sell unit"
          />
        </FormFieldInlineWrap>
        <FormFieldInline
          id={`${idPrefix}itmMaxDiscPer`}
          label="Max discount %"
          type="number"
          step="0.01"
          value={formValues.itmMaxDiscPer}
          onChange={(event) => setField("itmMaxDiscPer", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmMaxDiscVal`}
          label="Max discount value"
          type="number"
          step="0.01"
          value={formValues.itmMaxDiscVal}
          onChange={(event) => setField("itmMaxDiscVal", event.target.value)}
        />
      </div>
      <div className="min-w-0 space-y-3">
        <FormFieldInline
          id={`${idPrefix}itmSalesDisc`}
          label="Sales discount"
          type="number"
          step="0.01"
          value={formValues.itmSalesDisc}
          onChange={(event) => setField("itmSalesDisc", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmSellNostock`}
          label="Sell no stock"
          type="number"
          value={formValues.itmSellNostock}
          onChange={(event) => setField("itmSellNostock", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmFavourite`}
          label="Favourite"
          type="number"
          value={formValues.itmFavourite}
          onChange={(event) => setField("itmFavourite", event.target.value)}
        />
      </div>
    </div>
  );
}
