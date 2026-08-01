"use client";

import { useEffect, useState } from "react";
import type { MovmentItem } from "@/types/movment";
import type { ComboboxOption } from "@/components/ui/searchable-combobox";
import { MovmentFormFields } from "@/components/admin/movment-form-fields";
import {
  emptyMovmentFormValues,
  toMovmentFormValues,
  type MovmentFormValues,
} from "@/lib/movment-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function MovmentFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  movParientOptions,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MovmentItem | null;
  saving?: boolean;
  movParientOptions: ComboboxOption[];
  onSubmit: (values: MovmentFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<MovmentFormValues>(emptyMovmentFormValues);

  useEffect(() => {
    if (open && item) setValues(toMovmentFormValues(item));
  }, [open, item]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Update movement</SheetTitle>
          <SheetDescription>
            Edit movement #{item?.id ?? "—"}. Account entries use ActivityType; store fields use BranchType.
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <MovmentFormFields
              values={values}
              onChange={setValues}
              movParientOptions={movParientOptions}
              idPrefix="sheet-"
            />
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
