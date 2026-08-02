"use client";

import { FormFieldInline } from "@/components/ui/form-field-inline";
import type { ItemCatalogFormValues } from "@/lib/item-catalog-form";
import type { ItemCatalogSetField } from "@/components/admin/item-catalog/types";

type InventoryTabProps = {
  formValues: ItemCatalogFormValues;
  setField: ItemCatalogSetField;
  idPrefix?: string;
};

export function InventoryTab({
  formValues,
  setField,
  idPrefix = "",
}: InventoryTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-3">
        <FormFieldInline
          id={`${idPrefix}itmLocation`}
          label="Location"
          value={formValues.itmLocation}
          onChange={(event) => setField("itmLocation", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmMinLimit`}
          label="Min limit"
          type="number"
          step="0.01"
          value={formValues.itmMinLimit}
          onChange={(event) => setField("itmMinLimit", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmMaxLimit`}
          label="Max limit"
          type="number"
          step="0.01"
          value={formValues.itmMaxLimit}
          onChange={(event) => setField("itmMaxLimit", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmDefaultLimit`}
          label="Default limit"
          type="number"
          step="0.01"
          value={formValues.itmDefaultLimit}
          onChange={(event) => setField("itmDefaultLimit", event.target.value)}
        />
      </div>
      <div className="min-w-0 space-y-3">
        <FormFieldInline
          id={`${idPrefix}itmMidUnitDif`}
          label="Mid unit diff"
          type="number"
          step="0.01"
          value={formValues.itmMidUnitDif}
          onChange={(event) => setField("itmMidUnitDif", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmSmallUnitDif`}
          label="Small unit diff"
          type="number"
          step="0.01"
          value={formValues.itmSmallUnitDif}
          onChange={(event) => setField("itmSmallUnitDif", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmFracQty`}
          label="Fraction qty"
          type="number"
          value={formValues.itmFracQty}
          onChange={(event) => setField("itmFracQty", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmIsShortage`}
          label="Is shortage"
          type="number"
          value={formValues.itmIsShortage}
          onChange={(event) => setField("itmIsShortage", event.target.value)}
        />
      </div>
    </div>
  );
}
