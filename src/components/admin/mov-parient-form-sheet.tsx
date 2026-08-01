"use client";

import { useEffect, useState } from "react";
import type { MovParientItem } from "@/types/mov-parient";
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

export type MovParientFormValues = {
  movParientAname: string;
  movParientEname: string;
};

const emptyValues: MovParientFormValues = {
  movParientAname: "",
  movParientEname: "",
};

function toFormValues(item: MovParientItem): MovParientFormValues {
  return {
    movParientAname: item.movParientAname ?? "",
    movParientEname: item.movParientEname ?? "",
  };
}

export function MovParientFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MovParientItem | null;
  saving?: boolean;
  onSubmit: (values: MovParientFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<MovParientFormValues>(emptyValues);

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
          <SheetTitle>Update move parient</SheetTitle>
          <SheetDescription>
            Edit movement names. ID #{item?.movParientId ?? "—"} cannot be changed.
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-movParientAname">Arabic name</Label>
              <Input
                id="sheet-movParientAname"
                value={values.movParientAname}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    movParientAname: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-movParientEname">English name</Label>
              <Input
                id="sheet-movParientEname"
                value={values.movParientEname}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    movParientEname: e.target.value,
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
