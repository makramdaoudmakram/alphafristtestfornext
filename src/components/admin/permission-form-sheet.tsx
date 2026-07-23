"use client";

import { useEffect, useState } from "react";
import type { PermissionListItem } from "@/types/permissions";
import { PERMISSION_TYPES } from "@/lib/route-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type PermissionFormValues = {
  permissionCode: string;
  permissionName: string;
  permissionDescription: string;
  permissionType: string;
  moduleCode: string;
};

const emptyValues: PermissionFormValues = {
  permissionCode: "",
  permissionName: "",
  permissionDescription: "",
  permissionType: "Page",
  moduleCode: "",
};

function toFormValues(permission: PermissionListItem): PermissionFormValues {
  return {
    permissionCode: permission.permissionCode,
    permissionName: permission.permissionName,
    permissionDescription: permission.permissionDescription ?? "",
    permissionType: permission.permissionType,
    moduleCode: permission.moduleCode,
  };
}

export function PermissionFormSheet({
  open,
  onOpenChange,
  permission,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission: PermissionListItem | null;
  saving?: boolean;
  onSubmit: (values: PermissionFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<PermissionFormValues>(emptyValues);

  useEffect(() => {
    if (open && permission) {
      setValues(toFormValues(permission));
    }
  }, [open, permission]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Update permission</SheetTitle>
          <SheetDescription>
            Edit permission details and save changes to the Alfa API.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
          <div className="space-y-2">
            <Label htmlFor="sheet-permissionCode">Permission code</Label>
            <Input
              id="sheet-permissionCode"
              value={values.permissionCode}
              onChange={(e) =>
                setValues((current) => ({
                  ...current,
                  permissionCode: e.target.value,
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheet-permissionName">Permission name</Label>
            <Input
              id="sheet-permissionName"
              value={values.permissionName}
              onChange={(e) =>
                setValues((current) => ({
                  ...current,
                  permissionName: e.target.value,
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheet-moduleCode">Module code</Label>
            <Input
              id="sheet-moduleCode"
              value={values.moduleCode}
              onChange={(e) =>
                setValues((current) => ({
                  ...current,
                  moduleCode: e.target.value,
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheet-permissionType">Type</Label>
            <Select
              value={values.permissionType}
              onValueChange={(permissionType) =>
                setValues((current) => ({ ...current, permissionType }))
              }
            >
              <SelectTrigger id="sheet-permissionType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERMISSION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheet-permissionDescription">Description</Label>
            <Input
              id="sheet-permissionDescription"
              value={values.permissionDescription}
              onChange={(e) =>
                setValues((current) => ({
                  ...current,
                  permissionDescription: e.target.value,
                }))
              }
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
      </SheetContent>
    </Sheet>
  );
}
