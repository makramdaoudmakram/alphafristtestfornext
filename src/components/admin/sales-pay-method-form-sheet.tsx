"use client";

import { useEffect, useMemo, useState } from "react";
import type { SalesPayMethodItem } from "@/types/sales-pay-method";
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

export type SalesPayMethodFormValues = {
  paymentName: string;
  affectsCash: boolean;
  accountCode: string;
  active: boolean;
};

const emptyValues: SalesPayMethodFormValues = {
  paymentName: "",
  affectsCash: true,
  accountCode: "",
  active: true,
};

function toFormValues(item: SalesPayMethodItem): SalesPayMethodFormValues {
  return {
    paymentName: item.paymentName ?? "",
    affectsCash: item.affectsCash,
    accountCode: item.accountCode ?? "",
    active: item.active,
  };
}

function withClearAndOrphan(
  options: ComboboxOption[],
  selected: string
): ComboboxOption[] {
  const trimmed = selected.trim();
  const base = [{ value: "", label: "— None —" }, ...options];
  if (!trimmed || base.some((o) => o.value === trimmed)) return base;
  return [...base, { value: trimmed, label: trimmed }];
}

export function SalesPayMethodFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  accountOptions,
  lookupsLoading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SalesPayMethodItem | null;
  saving?: boolean;
  accountOptions: ComboboxOption[];
  lookupsLoading?: boolean;
  onSubmit: (values: SalesPayMethodFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<SalesPayMethodFormValues>(emptyValues);

  useEffect(() => {
    if (open && item) setValues(toFormValues(item));
  }, [open, item]);

  const sheetAccountOptions = useMemo(
    () => withClearAndOrphan(accountOptions, values.accountCode),
    [accountOptions, values.accountCode]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Update payment method</SheetTitle>
          <SheetDescription>
            Edit method #{item?.id ?? "—"}. Account code must exist in Accounts
            Chart.
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-paymentName">Payment name</Label>
              <Input
                id="sheet-paymentName"
                value={values.paymentName}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    paymentName: e.target.value,
                  }))
                }
                maxLength={50}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Account code (optional)</Label>
              <SearchableCombobox
                value={values.accountCode}
                onValueChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    accountCode: value,
                  }))
                }
                options={sheetAccountOptions}
                placeholder={
                  lookupsLoading ? "Loading accounts..." : "Select account"
                }
                searchPlaceholder="Search account code or name..."
                emptyMessage="No accounts found."
                disabled={lookupsLoading || saving}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="sheet-affectsCash"
                type="checkbox"
                className="size-4"
                checked={values.affectsCash}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    affectsCash: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="sheet-affectsCash">Affects cash</Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="sheet-active"
                type="checkbox"
                className="size-4"
                checked={values.active}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    active: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="sheet-active">Active</Label>
            </div>

            <SheetFooter className="px-0 pb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="update" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
