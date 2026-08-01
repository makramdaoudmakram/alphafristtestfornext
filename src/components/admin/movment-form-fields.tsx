"use client";

import type { ComboboxOption } from "@/components/ui/searchable-combobox";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getActivityTypeOptions,
  getBranchTypeOptions,
  getMovmentEffectOptions,
} from "@/lib/movment-enums";
import type { MovmentFormValues } from "@/lib/movment-form";

type MovmentFormFieldsProps = {
  values: MovmentFormValues;
  onChange: (values: MovmentFormValues) => void;
  movParientOptions: ComboboxOption[];
  idPrefix?: string;
};

const activityOptions = getActivityTypeOptions();
const branchOptions = getBranchTypeOptions();
const movmentEffectOptions = getMovmentEffectOptions();

export function MovmentFormFields({
  values,
  onChange,
  movParientOptions,
  idPrefix = "",
}: MovmentFormFieldsProps) {
  function patch(partial: Partial<MovmentFormValues>) {
    onChange({ ...values, ...partial });
  }

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
          options={branchOptions}
          placeholder="Select branch..."
          searchPlaceholder="Search branch..."
        />
      </div>

      <div className="space-y-2">
        <Label>MovStor2</Label>
        <SearchableCombobox
          value={values.movStor2}
          onValueChange={(value) => patch({ movStor2: value })}
          options={branchOptions}
          placeholder="Select branch..."
          searchPlaceholder="Search branch..."
        />
      </div>

      {(
        [
          ["movAccountEntry1", "MovAccountEntry1"],
          ["movAccountEntry2", "MovAccountEntry2"],
          ["movAccountEntry3", "MovAccountEntry3"],
          ["movAccountEntry4", "MovAccountEntry4"],
          ["movAccountEntry5", "MovAccountEntry5"],
          ["movAccountEntry6", "MovAccountEntry6"],
          ["movAccountEntry7", "MovAccountEntry7"],
          ["movAccountEntry8", "MovAccountEntry8"],
        ] as const
      ).map(([field, label]) => (
        <div key={field} className="space-y-2">
          <Label>{label}</Label>
          <SearchableCombobox
            value={values[field]}
            onValueChange={(value) => patch({ [field]: value })}
            options={activityOptions}
            placeholder="Select activity..."
            searchPlaceholder="Search activity..."
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
