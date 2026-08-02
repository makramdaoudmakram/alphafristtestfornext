"use client";

import { ItemHeader } from "@/components/admin/item-catalog/item-header";
import { ItemOptionsCard } from "@/components/admin/item-catalog/item-options-card";
import { ItemTabs } from "@/components/admin/item-catalog/item-tabs";
import type { ItemCatalogFormProps } from "@/components/admin/item-catalog/types";
import { cn } from "@/lib/utils";

export function ItemCatalogForm({
  formValues,
  setField,
  activeTab,
  onTabChange,
  lookups,
  compact = false,
  idPrefix = "",
}: ItemCatalogFormProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col gap-3",
        compact && "item-catalog-edit-form"
      )}
    >
      <ItemHeader
        formValues={formValues}
        setField={setField}
        idPrefix={idPrefix}
      />
      <ItemOptionsCard
        formValues={formValues}
        setField={setField}
        idPrefix={idPrefix}
      />
      <ItemTabs
        formValues={formValues}
        setField={setField}
        activeTab={activeTab}
        onTabChange={onTabChange}
        lookups={lookups}
        compact={compact}
        idPrefix={idPrefix}
      />
    </div>
  );
}
