import type { ItemCatalogFormValues } from "@/lib/item-catalog-form";
import type { ComboboxOption } from "@/components/ui/searchable-combobox";

export type ItemCatalogSetField = <K extends keyof ItemCatalogFormValues>(
  key: K,
  value: ItemCatalogFormValues[K]
) => void;

export type ItemCatalogLookupOptions = {
  companyOptions: ComboboxOption[];
  unitOptions: ComboboxOption[];
  formatOptions: ComboboxOption[];
  originOptions: ComboboxOption[];
  groupOptions: ComboboxOption[];
};

export type ItemCatalogFormProps = {
  formValues: ItemCatalogFormValues;
  setField: ItemCatalogSetField;
  activeTab: string;
  onTabChange: (tab: string) => void;
  lookups: ItemCatalogLookupOptions;
  compact?: boolean;
  idPrefix?: string;
};
