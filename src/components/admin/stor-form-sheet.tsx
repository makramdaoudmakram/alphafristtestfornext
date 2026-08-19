"use client";

import { useEffect, useState } from "react";
import type { StorItem, StorUpsertRequest } from "@/types/stor";
import { CostCenterIdCombobox } from "@/components/admin/cost-center-id-combobox";
import { StorAccountCombobox } from "@/components/admin/stor-account-combobox";
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

export type StorFormValues = StorUpsertRequest;

function toFormValues(item: StorItem): StorFormValues {
  return {
    storArName: item.storArName,
    storEnName: item.storEnName,
    costCenterId: item.costCenterId,
    accountNo: item.accountNo?.trim() ?? "",
  };
}

function costCenterFallbackLabel(item: StorItem): string | null {
  return item.costCenterName?.trim() || null;
}

function accountFallbackLabel(item: StorItem): string | null {
  const code = item.accountNo?.trim();
  const name = item.accountName?.trim();
  if (code && name && name !== code) return `${code} - ${name}`;
  return code || name || null;
}

export function StorFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: StorItem | null;
  saving?: boolean;
  onSubmit: (values: StorFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<StorFormValues>({
    storArName: null,
    storEnName: null,
    costCenterId: 0,
    accountNo: "",
  });

  useEffect(() => {
    if (open && item) {
      setValues(toFormValues(item));
    }
  }, [open, item]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Update store</SheetTitle>
          <SheetDescription>
            Cost center saves as CostCenterId. Account no saves as ACCCode (parent
            account 116).
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <div className="space-y-2">
              <Label>ID</Label>
              <Input value={item.id} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-stor-ar">Arabic name</Label>
              <Input
                id="sheet-stor-ar"
                value={values.storArName ?? ""}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    storArName: e.target.value || null,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-stor-en">English name</Label>
              <Input
                id="sheet-stor-en"
                value={values.storEnName ?? ""}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    storEnName: e.target.value || null,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Cost center *</Label>
              <CostCenterIdCombobox
                value={values.costCenterId > 0 ? values.costCenterId : null}
                onValueChange={(id) =>
                  setValues((v) => ({
                    ...v,
                    costCenterId: id ?? 0,
                  }))
                }
                fallbackLabel={costCenterFallbackLabel(item)}
              />
            </div>
            <div className="space-y-2">
              <Label>Account no *</Label>
              <StorAccountCombobox
                value={values.accountNo}
                onValueChange={(accCode) =>
                  setValues((v) => ({ ...v, accountNo: accCode }))
                }
                fallbackLabel={accountFallbackLabel(item)}
              />
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
