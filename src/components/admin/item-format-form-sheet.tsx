"use client";

import { useEffect, useState } from "react";
import type { ItemFormatItem } from "@/types/item-format";
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

export type ItemFormatFormValues = {
  itfNameAr: string;
  itfNameEn: string;
};

const emptyValues: ItemFormatFormValues = {
  itfNameAr: "",
  itfNameEn: "",
};

function toFormValues(item: ItemFormatItem): ItemFormatFormValues {
  return {
    itfNameAr: item.itfNameAr ?? "",
    itfNameEn: item.itfNameEn ?? "",
  };
}

export function ItemFormatFormSheet({
  open,
  onOpenChange,
  item,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemFormatItem | null;
  saving?: boolean;
  onSubmit: (values: ItemFormatFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ItemFormatFormValues>(emptyValues);

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
          <SheetTitle>Update item format</SheetTitle>
          <SheetDescription>
            Edit item format names. Code #{item?.itfCode ?? "—"} cannot be changed.
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-itfNameAr">Arabic name</Label>
              <Input
                id="sheet-itfNameAr"
                value={values.itfNameAr}
                onChange={(e) =>
                  setValues((c) => ({ ...c, itfNameAr: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-itfNameEn">English name</Label>
              <Input
                id="sheet-itfNameEn"
                value={values.itfNameEn}
                onChange={(e) =>
                  setValues((c) => ({ ...c, itfNameEn: e.target.value }))
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
