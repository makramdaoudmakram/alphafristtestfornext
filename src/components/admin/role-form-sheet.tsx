"use client";

import { useEffect, useState } from "react";
import type { RoleSummary } from "@/types/permissions";
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

export type RoleFormValues = {
  roleCode: string;
  roleName: string;
  roleDescription: string;
};

const emptyValues: RoleFormValues = {
  roleCode: "",
  roleName: "",
  roleDescription: "",
};

function toFormValues(role: RoleSummary): RoleFormValues {
  return {
    roleCode: role.roleCode,
    roleName: role.roleName,
    roleDescription: role.roleDescription ?? "",
  };
}

export function RoleFormSheet({
  open,
  onOpenChange,
  role,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleSummary | null;
  saving?: boolean;
  onSubmit: (values: RoleFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<RoleFormValues>(emptyValues);

  useEffect(() => {
    if (open && role) {
      setValues(toFormValues(role));
    }
  }, [open, role]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Update role</SheetTitle>
          <SheetDescription>
            Edit role details and save changes to the Alfa API.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
          <div className="space-y-2">
            <Label htmlFor="sheet-roleCode">Role code</Label>
            <Input
              id="sheet-roleCode"
              value={values.roleCode}
              onChange={(e) =>
                setValues((current) => ({ ...current, roleCode: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheet-roleName">Role name</Label>
            <Input
              id="sheet-roleName"
              value={values.roleName}
              onChange={(e) =>
                setValues((current) => ({ ...current, roleName: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheet-roleDescription">Description</Label>
            <Input
              id="sheet-roleDescription"
              value={values.roleDescription}
              onChange={(e) =>
                setValues((current) => ({
                  ...current,
                  roleDescription: e.target.value,
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
