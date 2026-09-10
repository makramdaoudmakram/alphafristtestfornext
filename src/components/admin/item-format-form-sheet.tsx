"use client";

import { useEffect, useState } from "react";
import type { ItemFormatItem } from "@/types/item-format";
import type { ComboboxOption } from "@/components/ui/searchable-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type ItemFormatFormValues = {
  groupId: string;
  itfNameAr: string;
  itfNameEn: string;
};

const emptyValues: ItemFormatFormValues = {
  groupId: "",
  itfNameAr: "",
  itfNameEn: "",
};

function toFormValues(item: ItemFormatItem): ItemFormatFormValues {
  return {
    groupId: item.groupId > 0 ? String(item.groupId) : "",
    itfNameAr: item.itfNameAr ?? "",
    itfNameEn: item.itfNameEn ?? "",
  };
}

export function ItemFormatFormSheet({
  open,
  onOpenChange,
  item,
  groupOptions,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemFormatItem | null;
  groupOptions: ComboboxOption[];
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
          <SheetTitle>Update dosage form</SheetTitle>
          <SheetDescription>
            Edit dosage form names. Code #{item?.itfCode ?? "—"} cannot be changed.
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-groupId">Group</Label>
              <SearchableCombobox
                value={values.groupId}
                onValueChange={(value) =>
                  setValues((current) => ({ ...current, groupId: value }))
                }
                options={groupOptions}
                placeholder="Select group"
              />
            </div>
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
