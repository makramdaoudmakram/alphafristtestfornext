"use client";

import { useEffect, useState } from "react";
import type { PharmFormValues, PharmItem } from "@/types/pharm";
import { emptyPharmFormValues } from "@/types/pharm";
import {
  PharmFormFields,
  pharmItemToFormValues,
} from "@/components/admin/pharm-form-fields";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type PharmFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PharmItem | null;
  saving?: boolean;
  onSubmit: (values: PharmFormValues) => Promise<void>;
};

export function PharmFormSheet({
  open,
  onOpenChange,
  item,
  saving = false,
  onSubmit,
}: PharmFormSheetProps) {
  const [values, setValues] = useState<PharmFormValues>(emptyPharmFormValues);

  useEffect(() => {
    if (open && item) {
      setValues(pharmItemToFormValues(item));
    }
  }, [open, item]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Update pharm</SheetTitle>
          <SheetDescription>
            Edit all Parm fields for #{item?.parmId ?? "—"}.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <PharmFormFields
            values={values}
            onChange={(patch) =>
              setValues((current) => ({ ...current, ...patch }))
            }
            idPrefix="edit-"
          />
          <SheetFooter className="gap-2 sm:justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
