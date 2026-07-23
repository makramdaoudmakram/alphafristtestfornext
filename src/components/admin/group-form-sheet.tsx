"use client";

import { useEffect, useMemo, useState } from "react";
import type { GroupItem } from "@/types/group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getGroupLabel } from "@/lib/group-tree";

export type GroupFormValues = {
  gNameAr: string;
  gNameEn: string;
  gParent: string;
};

const emptyValues: GroupFormValues = {
  gNameAr: "",
  gNameEn: "",
  gParent: "",
};

function toFormValues(group: GroupItem): GroupFormValues {
  return {
    gNameAr: group.gNameAr ?? "",
    gNameEn: group.gNameEn ?? "",
    gParent: group.gParent != null ? String(group.gParent) : "",
  };
}

export function GroupFormSheet({
  open,
  onOpenChange,
  group,
  groups,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupItem | null;
  groups: GroupItem[];
  saving?: boolean;
  onSubmit: (values: GroupFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<GroupFormValues>(emptyValues);

  const parentOptions = useMemo<ComboboxOption[]>(
    () =>
      groups
        .filter((item) => item.id !== group?.id)
        .map((item) => ({
          value: String(item.id),
          label: `${getGroupLabel(item)} (#${item.id})`,
        })),
    [groups, group?.id]
  );

  useEffect(() => {
    if (open && group) {
      setValues(toFormValues(group));
    }
  }, [open, group]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Update group</SheetTitle>
          <SheetDescription>
            Change names or move this group under another parent. A group cannot
            become its own parent or child.
          </SheetDescription>
        </SheetHeader>

        {group ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label>Group ID</Label>
              <Input value={group.id} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-gNameAr">Arabic name</Label>
              <Input
                id="sheet-gNameAr"
                value={values.gNameAr}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    gNameAr: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-gNameEn">English name</Label>
              <Input
                id="sheet-gNameEn"
                value={values.gNameEn}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    gNameEn: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-gParent">Parent group</Label>
              <SearchableCombobox
                value={values.gParent}
                onValueChange={(value) =>
                  setValues((current) => ({ ...current, gParent: value }))
                }
                options={parentOptions}
                placeholder="Root level (no parent)"
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
