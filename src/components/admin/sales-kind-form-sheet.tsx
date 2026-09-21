"use client";

import { useEffect, useState } from "react";
import type { SalesKindItem } from "@/types/sales-kind";
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

export type SalesKindFormValues = {
  salesKindName: string;
  isActive: boolean;
  deleveryMandatory: boolean;
};

const emptyValues: SalesKindFormValues = {
  salesKindName: "",
  isActive: true,
  deleveryMandatory: false,
};

function toFormValues(item: SalesKindItem): SalesKindFormValues {
  return {
    salesKindName: item.salesKindName ?? "",
    isActive: item.isActive,
    deleveryMandatory: item.deleveryMandatory,
  };
}

export function SalesKindFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SalesKindItem | null;
  saving?: boolean;
  onSubmit: (values: SalesKindFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<SalesKindFormValues>(emptyValues);

  useEffect(() => {
    if (open && item) setValues(toFormValues(item));
  }, [open, item]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Update sales kind</SheetTitle>
          <SheetDescription>
            Edit sales kind #{item?.id ?? "—"}. Names must be unique.
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-salesKindName">Sales kind name</Label>
              <Input
                id="sheet-salesKindName"
                value={values.salesKindName}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    salesKindName: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="sheet-deleveryMandatory"
                type="checkbox"
                className="size-4"
                checked={values.deleveryMandatory}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    deleveryMandatory: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="sheet-deleveryMandatory">Delivery mandatory</Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="sheet-isActive"
                type="checkbox"
                className="size-4"
                checked={values.isActive}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    isActive: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="sheet-isActive">Active</Label>
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
