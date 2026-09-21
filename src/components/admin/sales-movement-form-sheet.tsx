"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComboboxOption } from "@/components/ui/searchable-combobox";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SALES_MOVEMENT_ACCOUNT_FIELDS,
  SALES_MOVEMENT_PARENT_OPTIONS,
  type SalesMovementParent,
  type SalesmovmentDetail,
  type SalesmovmentUpsertRequest,
} from "@/types/sales-movment";

export type SalesMovementFormValues = SalesmovmentUpsertRequest;

export function emptySalesMovementForm(
  parent: SalesMovementParent = 1
): SalesMovementFormValues {
  return {
    movId: null,
    movName: null,
    movParint: parent,
    pharmId: null,
    store1: null,
    store2: null,
    cashDebit: null,
    creditCardDebit: null,
    creditCardMachinNo: null,
    discountEmployeesDebit: null,
    discountMedicalDebit: null,
    medicinesSalesCredit: null,
    accesSalesCredit: null,
    salesTaxCredit: null,
    salesCostDebit: null,
    accessCostDebit: null,
    pharmStorCredit: null,
    extraordinaryPurchasesDebit: null,
    extraordinaryPurchasesCredit: null,
    expensesDebit: null,
    expensesCredit: null,
    transferDebit: null,
    transferCredit: null,
    postMedicalDebit: null,
    postEmployeesDebit: null,
    excessDeficitdept: null,
    excessDeficitcredit: null,
    cashdiscount: null,
    otheraRevinue: null,
  };
}

export function salesmovmentToForm(
  item: SalesmovmentDetail
): SalesMovementFormValues {
  return {
    movId: item.movId,
    movName: item.movName,
    movParint: item.movParint === 2 ? 2 : 1,
    pharmId: item.pharmId,
    store1: item.store1,
    store2: item.store2,
    cashDebit: item.cashDebit,
    creditCardDebit: item.creditCardDebit,
    creditCardMachinNo: item.creditCardMachinNo,
    discountEmployeesDebit: item.discountEmployeesDebit,
    discountMedicalDebit: item.discountMedicalDebit,
    medicinesSalesCredit: item.medicinesSalesCredit,
    accesSalesCredit: item.accesSalesCredit,
    salesTaxCredit: item.salesTaxCredit,
    salesCostDebit: item.salesCostDebit,
    accessCostDebit: item.accessCostDebit,
    pharmStorCredit: item.pharmStorCredit,
    extraordinaryPurchasesDebit: item.extraordinaryPurchasesDebit,
    extraordinaryPurchasesCredit: item.extraordinaryPurchasesCredit,
    expensesDebit: item.expensesDebit,
    expensesCredit: item.expensesCredit,
    transferDebit: item.transferDebit,
    transferCredit: item.transferCredit,
    postMedicalDebit: item.postMedicalDebit,
    postEmployeesDebit: item.postEmployeesDebit,
    excessDeficitdept: item.excessDeficitdept,
    excessDeficitcredit: item.excessDeficitcredit,
    cashdiscount: item.cashdiscount,
    otheraRevinue: item.otheraRevinue,
  };
}

export function validateSalesMovementForm(
  values: SalesMovementFormValues
): string | null {
  if (values.movId == null || values.movId <= 0) {
    return "MovId is required.";
  }
  if (!values.movName?.trim()) {
    return "Movement name is required.";
  }
  if (values.movParint !== 1 && values.movParint !== 2) {
    return "Movement type must be Sales or Return Sales.";
  }
  if (values.pharmId == null || values.pharmId <= 0) {
    return "Pharmacy is required.";
  }
  return null;
}

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

function withClear(options: ComboboxOption[]): ComboboxOption[] {
  return [{ value: "", label: "— None —" }, ...options];
}

function toNullableInt(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function SalesMovementFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  lookupsLoading,
  pharmOptions,
  storOptions,
  accountOptions,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SalesmovmentDetail | null;
  saving?: boolean;
  lookupsLoading?: boolean;
  pharmOptions: ComboboxOption[];
  storOptions: ComboboxOption[];
  accountOptions: ComboboxOption[];
  onSubmit: (values: SalesMovementFormValues) => Promise<void>;
}) {
  const isEdit = item != null && item.id > 0;
  const [values, setValues] = useState<SalesMovementFormValues>(
    emptySalesMovementForm(1)
  );

  useEffect(() => {
    if (!open) return;
    setValues(item ? salesmovmentToForm(item) : emptySalesMovementForm(1));
  }, [open, item]);

  function patch(partial: Partial<SalesMovementFormValues>) {
    setValues((current) => ({ ...current, ...partial }));
  }

  const parentOptions = useMemo(
    () =>
      SALES_MOVEMENT_PARENT_OPTIONS.map((o) => ({
        value: String(o.value),
        label: o.label,
      })),
    []
  );

  const store1Options = useMemo(
    () =>
      mergeOption(
        storOptions,
        values.store1 != null ? String(values.store1) : ""
      ),
    [storOptions, values.store1]
  );
  const store2Options = useMemo(
    () =>
      mergeOption(
        storOptions,
        values.store2 != null ? String(values.store2) : ""
      ),
    [storOptions, values.store2]
  );
  const pharmMerged = useMemo(
    () =>
      mergeOption(
        pharmOptions,
        values.pharmId != null ? String(values.pharmId) : ""
      ),
    [pharmOptions, values.pharmId]
  );

  const busy = !!saving || !!lookupsLoading;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Update sales movement" : "New sales movement"}
          </SheetTitle>
          <SheetDescription>
            Pharmacy, stores, and accounts use existing master lookups. Account
            lists display ACCName and save ACCCode.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 px-4 pb-4"
        >
          {isEdit ? (
            <div className="space-y-2">
              <Label>ID</Label>
              <Input value={item.id} disabled />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sheet-movId">MovId</Label>
              <Input
                id="sheet-movId"
                type="number"
                min={1}
                value={values.movId ?? ""}
                onChange={(e) => patch({ movId: toNullableInt(e.target.value) })}
                disabled={busy}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-movName">Movement name</Label>
              <Input
                id="sheet-movName"
                value={values.movName ?? ""}
                onChange={(e) => patch({ movName: e.target.value || null })}
                maxLength={50}
                disabled={busy}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <SearchableCombobox
                value={String(values.movParint)}
                onValueChange={(value) =>
                  patch({ movParint: Number(value) === 2 ? 2 : 1 })
                }
                options={parentOptions}
                placeholder="Select type..."
                searchPlaceholder="Search type..."
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label>Pharmacy</Label>
              <SearchableCombobox
                value={values.pharmId != null ? String(values.pharmId) : ""}
                onValueChange={(value) =>
                  patch({ pharmId: toNullableInt(value) })
                }
                options={pharmMerged}
                placeholder="Select pharmacy..."
                searchPlaceholder="Search pharmacy..."
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label>Store 1</Label>
              <SearchableCombobox
                value={values.store1 != null ? String(values.store1) : ""}
                onValueChange={(value) =>
                  patch({ store1: toNullableInt(value) })
                }
                options={withClear(store1Options)}
                placeholder="Select store..."
                searchPlaceholder="Search store..."
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label>Store 2</Label>
              <SearchableCombobox
                value={values.store2 != null ? String(values.store2) : ""}
                onValueChange={(value) =>
                  patch({ store2: toNullableInt(value) })
                }
                options={withClear(store2Options)}
                placeholder="Select store..."
                searchPlaceholder="Search store..."
                disabled={busy}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sheet-creditCardMachinNo">
                Credit card machine no.
              </Label>
              <Input
                id="sheet-creditCardMachinNo"
                value={values.creditCardMachinNo ?? ""}
                onChange={(e) =>
                  patch({
                    creditCardMachinNo: e.target.value || null,
                  })
                }
                maxLength={15}
                disabled={busy}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {SALES_MOVEMENT_ACCOUNT_FIELDS.map(({ key, label }) => {
              const current = (values[key] as string | null) ?? "";
              const options = mergeOption(accountOptions, current);
              return (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <SearchableCombobox
                    value={current}
                    onValueChange={(value) =>
                      patch({
                        [key]: value.trim() || null,
                      } as Partial<SalesMovementFormValues>)
                    }
                    options={withClear(options)}
                    placeholder="Select account..."
                    searchPlaceholder="Search account name..."
                    disabled={busy}
                  />
                </div>
              );
            })}
          </div>

          <SheetFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isEdit ? "update" : "default"}
              disabled={busy}
            >
              {saving ? "Saving..." : isEdit ? "Save changes" : "Create"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
