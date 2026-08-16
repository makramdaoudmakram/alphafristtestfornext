"use client";

import { useEffect, useState } from "react";
import type { CostCenterItem } from "@/types/cost-center";
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

export type CostCenterFormValues = {
  code: string;
  name: string;
};

function toFormValues(item: CostCenterItem): CostCenterFormValues {
  return {
    code: item.code ?? "",
    name: item.name ?? "",
  };
}

export function CostCenterFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CostCenterItem | null;
  saving?: boolean;
  onSubmit: (values: CostCenterFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<CostCenterFormValues>({
    code: "",
    name: "",
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
          <SheetTitle>Update cost center</SheetTitle>
          <SheetDescription>
            Code is stored on vouchers and GeneralLedger as CostCenter. Changing
            a used code is blocked by the API.
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
              <Label htmlFor="sheet-cc-code">Code</Label>
              <Input
                id="sheet-cc-code"
                className="font-mono"
                value={values.code}
                onChange={(e) =>
                  setValues((c) => ({ ...c, code: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-cc-name">Name</Label>
              <Input
                id="sheet-cc-name"
                value={values.name}
                onChange={(e) =>
                  setValues((c) => ({ ...c, name: e.target.value }))
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
