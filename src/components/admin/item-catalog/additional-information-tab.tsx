"use client";

import { FormFieldInline } from "@/components/ui/form-field-inline";
import type { ItemCatalogFormValues } from "@/lib/item-catalog-form";
import type { ItemCatalogSetField } from "@/components/admin/item-catalog/types";

type AdditionalInformationTabProps = {
  formValues: ItemCatalogFormValues;
  setField: ItemCatalogSetField;
  idPrefix?: string;
};

export function AdditionalInformationTab({
  formValues,
  setField,
  idPrefix = "",
}: AdditionalInformationTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-3">
        <FormFieldInline
          id={`${idPrefix}itmScientificN1`}
          label="Scientific name 1"
          value={formValues.itmScientificN1}
          onChange={(event) => setField("itmScientificN1", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmScientificN2`}
          label="Scientific name 2"
          value={formValues.itmScientificN2}
          onChange={(event) => setField("itmScientificN2", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmScientificGroupId`}
          label="Scientific group"
          type="number"
          step="0.01"
          value={formValues.itmScientificGroupId}
          onChange={(event) =>
            setField("itmScientificGroupId", event.target.value)
          }
        />
        <FormFieldInline
          id={`${idPrefix}itmUsageMannerId`}
          label="Usage manner"
          type="number"
          step="0.01"
          value={formValues.itmUsageMannerId}
          onChange={(event) => setField("itmUsageMannerId", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}ucpCode`}
          label="UCP code"
          value={formValues.ucpCode}
          onChange={(event) => setField("ucpCode", event.target.value)}
        />
      </div>
      <div className="min-w-0 space-y-3">
        <FormFieldInline
          id={`${idPrefix}itmG1`}
          label="G1"
          type="number"
          step="0.01"
          value={formValues.itmG1}
          onChange={(event) => setField("itmG1", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmG2`}
          label="G2"
          type="number"
          step="0.01"
          value={formValues.itmG2}
          onChange={(event) => setField("itmG2", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmG3`}
          label="G3"
          type="number"
          step="0.01"
          value={formValues.itmG3}
          onChange={(event) => setField("itmG3", event.target.value)}
        />
        <FormFieldInline
          id={`${idPrefix}itmGId`}
          label="G ID"
          type="number"
          value={formValues.itmGId}
          onChange={(event) => setField("itmGId", event.target.value)}
        />
      </div>
    </div>
  );
}
