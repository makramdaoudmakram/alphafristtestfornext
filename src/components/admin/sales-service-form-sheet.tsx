"use client";

import { useEffect, useState } from "react";
import type { SalesServiceItem } from "@/types/sales-service";
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

export type SalesServiceFormValues = {
  serviceName: string;
  serviceType: string;
  cost: string;
  active: boolean;
};

const emptyValues: SalesServiceFormValues = {
  serviceName: "",
  serviceType: "Delivery",
  cost: "0",
  active: true,
};

function toFormValues(item: SalesServiceItem): SalesServiceFormValues {
  return {
    serviceName: item.serviceName ?? "",
    serviceType: item.serviceType ?? "Delivery",
    cost: Number.isFinite(item.cost) ? String(item.cost) : "0",
    active: item.active,
  };
}

export function SalesServiceFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SalesServiceItem | null;
  saving?: boolean;
  onSubmit: (values: SalesServiceFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<SalesServiceFormValues>(emptyValues);

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
          <SheetTitle>Update sales service</SheetTitle>
          <SheetDescription>
            Edit service #{item?.id ?? "—"}. Names must be unique. Cost is the
            master default value used later in Sales Payment.
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <div className="space-y-2">
              <Label htmlFor="sheet-serviceName">Service name</Label>
              <Input
                id="sheet-serviceName"
                value={values.serviceName}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    serviceName: e.target.value,
                  }))
                }
                maxLength={70}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-serviceType">Service type</Label>
              <Input
                id="sheet-serviceType"
                value={values.serviceType}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    serviceType: e.target.value,
                  }))
                }
                maxLength={30}
                placeholder="Delivery"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-cost">Cost</Label>
              <Input
                id="sheet-cost"
                type="number"
                min={0}
                step="0.0001"
                value={values.cost}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    cost: e.target.value,
                  }))
                }
                required
              />
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
