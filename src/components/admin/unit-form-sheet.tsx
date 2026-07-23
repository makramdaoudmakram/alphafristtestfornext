"use client";

import { useEffect, useState } from "react";
import type { UnitItem } from "@/types/unit";
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

export type UnitFormValues = {
  uNameAr: string;
  uNameEn: string;
};

const emptyValues: UnitFormValues = {
  uNameAr: "",
  uNameEn: "",
};

function toFormValues(unit: UnitItem): UnitFormValues {
  return {
    uNameAr: unit.uNameAr ?? "",
    uNameEn: unit.uNameEn ?? "",
  };
}

export function UnitFormSheet({
  open,
  onOpenChange,
  unit,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: UnitItem | null;
  saving?: boolean;
  onSubmit: (values: UnitFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<UnitFormValues>(emptyValues);

  useEffect(() => {
    if (open && unit) {
      setValues(toFormValues(unit));
    }
  }, [open, unit]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Update unit</SheetTitle>
          <SheetDescription>
            Edit unit names. The unit code cannot be changed.
          </SheetDescription>
        </SheetHeader>

        {unit ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label>Unit code</Label>
              <Input value={unit.uCode} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-uNameAr">Arabic name</Label>
              <Input
                id="sheet-uNameAr"
                value={values.uNameAr}
                onChange={(e) =>
                  setValues((current) => ({ ...current, uNameAr: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-uNameEn">English name</Label>
              <Input
                id="sheet-uNameEn"
                value={values.uNameEn}
                onChange={(e) =>
                  setValues((current) => ({ ...current, uNameEn: e.target.value }))
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
