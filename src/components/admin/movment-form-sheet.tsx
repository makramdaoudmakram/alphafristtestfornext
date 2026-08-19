"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const initializedForIdRef = useRef<number | null>(null);
  const itemId = item?.id ?? null;

  useEffect(() => {
    if (!open) {
      initializedForIdRef.current = null;
      setValues(emptyMovmentFormValues);
      return;
    }
    if (!item || itemId == null) return;
    if (initializedForIdRef.current === itemId) return;
    setValues(toMovmentFormValues(item));
    initializedForIdRef.current = itemId;
  }, [open, itemId, item]);

  const handleChange = useCallback((next: MovmentFormValues) => {
    setValues(next);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Update movement</SheetTitle>
          <SheetDescription>
            Edit movement #{item?.id ?? "—"}. Stores come from the Stor table
            (Arabic name). Account entries come from Accounts Chart.
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <MovmentFormFields
              values={values}
              onChange={handleChange}
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
