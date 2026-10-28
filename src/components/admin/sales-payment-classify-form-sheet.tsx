"use client";

import { useEffect, useState } from "react";
import type { SalesPaymentClassifyItem } from "@/types/sales-payment-classify";
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

export type SalesPaymentClassifyFormValues = {
  salesclassifyName: string;
};

const emptyValues: SalesPaymentClassifyFormValues = {
  salesclassifyName: "",
};

function toFormValues(item: SalesPaymentClassifyItem): SalesPaymentClassifyFormValues {
  return {
    salesclassifyName: item.salesclassifyName ?? "",
  };
}

export function SalesPaymentClassifyFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SalesPaymentClassifyItem | null;
  saving?: boolean;
  onSubmit: (values: SalesPaymentClassifyFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<SalesPaymentClassifyFormValues>(emptyValues);

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
          <SheetTitle>Update payment classification</SheetTitle>
          <SheetDescription>
            Edit classification #{item?.id ?? "—"}. Names must be unique.
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-salesclassifyName">Classification name</Label>
              <Input
                id="sheet-salesclassifyName"
                value={values.salesclassifyName}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    salesclassifyName: e.target.value,
                  }))
                }
                required
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
