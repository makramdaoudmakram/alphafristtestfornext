"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FormFieldInline } from "@/components/ui/form-field-inline";
import type { ItemCatalogFormValues } from "@/lib/item-catalog-form";
import type { ItemCatalogSetField } from "@/components/admin/item-catalog/types";

type ItemHeaderProps = {
  formValues: ItemCatalogFormValues;
  setField: ItemCatalogSetField;
  idPrefix?: string;
};

export function ItemHeader({
  formValues,
  setField,
  idPrefix = "",
}: ItemHeaderProps) {
  return (
    <Card className="shrink-0">
      <CardContent className="space-y-3 pt-5">
        <div className="grid gap-3 md:grid-cols-2">
          <FormFieldInline
            id={`${idPrefix}itmNameAr`}
            label="Item name (Arabic)"
            value={formValues.itmNameAr}
            onChange={(event) => setField("itmNameAr", event.target.value)}
            dir="rtl"
            className="sm:grid-cols-[8.5rem_minmax(0,1fr)]"
          />
          <FormFieldInline
            id={`${idPrefix}itmNameEn`}
            label="Item name (English)"
            value={formValues.itmNameEn}
            onChange={(event) => setField("itmNameEn", event.target.value)}
            className="sm:grid-cols-[8.5rem_minmax(0,1fr)]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
