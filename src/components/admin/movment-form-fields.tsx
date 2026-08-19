"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { ComboboxOption } from "@/components/ui/searchable-combobox";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStors } from "@/lib/api-client";
import { getChartLeaves } from "@/lib/manual-journal-api";
import { getMovmentEffectOptions } from "@/lib/movment-enums";
import type { MovmentFormValues } from "@/lib/movment-form";

type MovmentFormFieldsProps = {
  values: MovmentFormValues;
  onChange: (values: MovmentFormValues) => void;
  movParientOptions: ComboboxOption[];
  idPrefix?: string;
};

const movmentEffectOptions = getMovmentEffectOptions();

const ACCOUNT_ENTRY_FIELDS = [
  ["movAccountEntry1", "MovAccountEntry1"],
  ["movAccountEntry2", "MovAccountEntry2"],
  ["movAccountEntry3", "MovAccountEntry3"],
  ["movAccountEntry4", "MovAccountEntry4"],
  ["movAccountEntry5", "MovAccountEntry5"],
  ["movAccountEntry6", "MovAccountEntry6"],
  ["movAccountEntry7", "MovAccountEntry7"],
  ["movAccountEntry8", "MovAccountEntry8"],
] as const;

function mergeOption(
  options: ComboboxOption[],
  value: string
): ComboboxOption[] {
  const trimmed = value.trim();
  if (!trimmed || options.some((option) => option.value === trimmed)) {
    return options;
  }
  return [...options, { value: trimmed, label: trimmed }];
}

export function MovmentFormFields({
  values,
  onChange,
  movParientOptions,
  idPrefix = "",
}: MovmentFormFieldsProps) {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const [storOptions, setStorOptions] = useState<ComboboxOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<ComboboxOption[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const loadLookups = useCallback(async () => {
    if (!token) {
      setStorOptions([]);
      setAccountOptions([]);
      return;
    }

    setLookupsLoading(true);
    try {
      const [stores, accounts] = await Promise.all([
        getStors(token),
        getChartLeaves(token),
      ]);
      setStorOptions(
        stores
          .map((store) => ({
            value: String(store.id),
            label: store.storArName?.trim() || `Store ${store.id}`,
          }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { numeric: true })
          )
      );
      setAccountOptions(
        accounts
          .filter((account) => account.accCode?.trim())
          .map((account) => ({
            value: account.accCode.trim(),
            label: account.name.trim() || account.accCode.trim(),
          }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { numeric: true })
          )
      );
    } catch {
      setStorOptions([]);
      setAccountOptions([]);
    } finally {
      setLookupsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (status === "loading") return;
    void loadLookups();
  }, [status, loadLookups]);

  const stor1Options = useMemo(
    () => mergeOption(storOptions, values.movStor),
    [storOptions, values.movStor]
  );
  const stor2Options = useMemo(
    () => mergeOption(storOptions, values.movStor2),
    [storOptions, values.movStor2]
  );
  const accountOptionsByField = useMemo(() => {
    const map = {} as Record<(typeof ACCOUNT_ENTRY_FIELDS)[number][0], ComboboxOption[]>;
    for (const [field] of ACCOUNT_ENTRY_FIELDS) {
      map[field] = mergeOption(accountOptions, values[field]);
    }
    return map;
  }, [accountOptions, values]);

  function patch(partial: Partial<MovmentFormValues>) {
    onChange({ ...values, ...partial });
  }

  const lookupsBusy = lookupsLoading && storOptions.length === 0 && accountOptions.length === 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}movChiledId`}>Child ID</Label>
        <Input
          id={`${idPrefix}movChiledId`}
          inputMode="numeric"
          value={values.movChiledId}
          onChange={(e) => patch({ movChiledId: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}movChiledName`}>Child name</Label>
        <Input
          id={`${idPrefix}movChiledName`}
          value={values.movChiledName}
          onChange={(e) => patch({ movChiledName: e.target.value })}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label>Move parient</Label>
        <SearchableCombobox
          value={values.movParientId}
          onValueChange={(value) => patch({ movParientId: value })}
          options={movParientOptions}
          placeholder="Select move parient..."
          searchPlaceholder="Search move parient..."
        />
      </div>

      <div className="flex flex-wrap items-center gap-6 md:col-span-2">
        <div className="flex items-center gap-2">
          <input
            id={`${idPrefix}movSingleStore`}
            type="checkbox"
            checked={values.movSingleStore}
            onChange={(e) => patch({ movSingleStore: e.target.checked })}
            className="size-4 rounded border"
          />
          <Label htmlFor={`${idPrefix}movSingleStore`}>Single store</Label>
        </div>
        <div className="flex items-center gap-2">
          <input
            id={`${idPrefix}movActive`}
            type="checkbox"
            checked={values.movActive}
            onChange={(e) => patch({ movActive: e.target.checked })}
            className="size-4 rounded border"
          />
          <Label htmlFor={`${idPrefix}movActive`}>Active</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>MovStor</Label>
        <SearchableCombobox
          value={values.movStor}
          onValueChange={(value) => patch({ movStor: value })}
          options={stor1Options}
          placeholder={lookupsBusy ? "Loading…" : "Select store..."}
          searchPlaceholder="Search store..."
          emptyMessage="No stores found."
          disabled={lookupsBusy}
        />
      </div>

      <div className="space-y-2">
        <Label>MovStor2</Label>
        <SearchableCombobox
          value={values.movStor2}
          onValueChange={(value) => patch({ movStor2: value })}
          options={stor2Options}
          placeholder={lookupsBusy ? "Loading…" : "Select store..."}
          searchPlaceholder="Search store..."
          emptyMessage="No stores found."
          disabled={lookupsBusy}
        />
      </div>

      {ACCOUNT_ENTRY_FIELDS.map(([field, label]) => (
        <div key={field} className="space-y-2">
          <Label>{label}</Label>
          <SearchableCombobox
            value={values[field]}
            onValueChange={(value) => patch({ [field]: value })}
            options={accountOptionsByField[field]}
            placeholder={lookupsBusy ? "Loading…" : "Select account..."}
            searchPlaceholder="Search account..."
            emptyMessage="No accounts found."
            disabled={lookupsBusy}
          />
        </div>
      ))}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}movClint1`}>MovClint1</Label>
        <Input
          id={`${idPrefix}movClint1`}
          value={values.movClint1}
          onChange={(e) => patch({ movClint1: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}movClint2`}>MovClint2</Label>
        <Input
          id={`${idPrefix}movClint2`}
          value={values.movClint2}
          onChange={(e) => patch({ movClint2: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Stock effect</Label>
        <SearchableCombobox
          value={values.movStockEffict}
          onValueChange={(value) => patch({ movStockEffict: value })}
          options={movmentEffectOptions}
          placeholder="Select stock effect..."
          searchPlaceholder="Search stock effect..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}movPage`}>Page</Label>
        <Input
          id={`${idPrefix}movPage`}
          value={values.movPage}
          onChange={(e) => patch({ movPage: e.target.value })}
        />
      </div>
    </div>
  );
}
