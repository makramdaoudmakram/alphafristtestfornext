"use client";

import { useEffect, useState } from "react";
import type { UnitItem } from "@/types/unit";
import { Button } from "@/components/ui/button";
import { FormFieldInline, formControlFocusClass } from "@/components/ui/form-field-inline";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3 px-4">
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-4">
              <Label className="text-muted-foreground shrink-0 text-sm font-medium sm:text-end">
                Unit code
              </Label>
              <Input
                value={unit.uCode}
                disabled
                className={cn("bg-muted/40", formControlFocusClass)}
              />
            </div>

            <FormFieldInline
              id="sheet-uNameAr"
              label="Arabic name"
              value={values.uNameAr}
              onChange={(e) =>
                setValues((current) => ({ ...current, uNameAr: e.target.value }))
              }
              required
            />

            <FormFieldInline
              id="sheet-uNameEn"
              label="English name"
              value={values.uNameEn}
              onChange={(e) =>
                setValues((current) => ({ ...current, uNameEn: e.target.value }))
              }
              required
            />

            <SheetFooter className="px-0 pt-2 pb-4 sm:pl-[calc(9.5rem+1rem)]">
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
