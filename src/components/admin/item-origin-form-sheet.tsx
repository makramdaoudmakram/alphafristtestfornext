"use client";

import { useEffect, useState } from "react";
import type { ItemOriginItem } from "@/types/item-origin";
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

export type ItemOriginFormValues = {
  ioTextAr: string;
};

const emptyValues: ItemOriginFormValues = {
  ioTextAr: "",
};

function toFormValues(item: ItemOriginItem): ItemOriginFormValues {
  return {
    ioTextAr: item.ioTextAr ?? "",
  };
}

export function ItemOriginFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemOriginItem | null;
  saving?: boolean;
  onSubmit: (values: ItemOriginFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ItemOriginFormValues>(emptyValues);

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
          <SheetTitle>Update item origin</SheetTitle>
          <SheetDescription>
            Edit origin text. ID #{item?.ioId ?? "—"} cannot be changed.
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-ioTextAr">Arabic text</Label>
              <Input
                id="sheet-ioTextAr"
                value={values.ioTextAr}
                onChange={(e) =>
                  setValues((c) => ({ ...c, ioTextAr: e.target.value }))
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
