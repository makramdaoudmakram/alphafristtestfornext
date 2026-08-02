"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckboxOption } from "@/components/admin/item-catalog/checkbox-option";
import type { ItemCatalogFormValues } from "@/lib/item-catalog-form";
import type { ItemCatalogSetField } from "@/components/admin/item-catalog/types";

type ItemOptionsCardProps = {
  formValues: ItemCatalogFormValues;
  setField: ItemCatalogSetField;
  idPrefix?: string;
};

const OPTION_FIELDS = [
  { key: "itmActive", label: "Active" },
  { key: "itmIsmedicine", label: "Medicine" },
  { key: "itmHasExpire", label: "Has expiry" },
  { key: "itmSrvc", label: "Service item" },
  { key: "itmStopSell", label: "Stop sell" },
  { key: "itmStopPur", label: "Stop purchase" },
  { key: "itmPrintBarcode", label: "Print barcode" },
  { key: "itmAllowDiscount", label: "Allow discount" },
  { key: "itmFreez", label: "Frozen" },
] as const satisfies ReadonlyArray<{
  key: keyof ItemCatalogFormValues;
  label: string;
}>;

export function ItemOptionsCard({
  formValues,
  setField,
  idPrefix = "",
}: ItemOptionsCardProps) {
  return (
    <Card className="shrink-0">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base">Item options</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {OPTION_FIELDS.map(({ key, label }) => (
            <CheckboxOption
              key={key}
              id={`${idPrefix}${key}`}
              label={label}
              checked={Boolean(formValues[key])}
              onChange={(checked) => setField(key, checked)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
