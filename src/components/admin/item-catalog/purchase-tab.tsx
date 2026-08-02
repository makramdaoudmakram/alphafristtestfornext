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

type PurchaseTabProps = {
  formValues: ItemCatalogFormValues;
  setField: ItemCatalogSetField;
  lookups: ItemCatalogLookupOptions;
  idPrefix?: string;
};

export function PurchaseTab({
  formValues,
  setField,
  lookups,
  idPrefix = "",
}: PurchaseTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-3">
        <FormFieldInline
          id={`${idPrefix}itmDefPharmPrice-purchase`}
          label="Purchase price"
          type="number"
          step="0.01"
          value={formValues.itmDefPharmPrice}
          onChange={(event) => setField("itmDefPharmPrice", event.target.value)}
        />
        <FormFieldInlineWrap
          id={`${idPrefix}itmPurchaseUnit`}
          label="Purchase unit"
        >
          <SearchableCombobox
            value={formValues.itmPurchaseUnit}
            onValueChange={(value) => setField("itmPurchaseUnit", value)}
            options={lookups.unitOptions}
            placeholder="Select purchase unit"
          />
        </FormFieldInlineWrap>
      </div>
      <div className="min-w-0 space-y-3">
        <FormFieldInline
          id={`${idPrefix}itmNopurreturn`}
          label="No purchase return"
          type="number"
          value={formValues.itmNopurreturn}
          onChange={(event) => setField("itmNopurreturn", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmRequestLimit`}
          label="Request limit"
          type="number"
          step="0.01"
          value={formValues.itmRequestLimit}
          onChange={(event) => setField("itmRequestLimit", event.target.value)}
        />
      </div>
    </div>
  );
}
