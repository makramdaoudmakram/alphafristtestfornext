"use client";

import { useEffect, useState } from "react";
import type { RoleSummary, UserSummary } from "@/types/permissions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export function UserRolesFormSheet({
  open,
  onOpenChange,
  user,
  roles,
  initialRoleIds,
  loadingRoles,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserSummary | null;
  roles: RoleSummary[];
  initialRoleIds: number[];
  loadingRoles?: boolean;
  saving?: boolean;
  onSubmit: (roleIds: number[]) => Promise<void>;
}) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedRoleIds(initialRoleIds);
    }
  }, [open, initialRoleIds]);

  function toggleRole(roleId: number) {
    setSelectedRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId]
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(selectedRoleIds);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Assign roles</SheetTitle>
          <SheetDescription>
            Choose which roles {user?.email ?? "this user"} should have.
          </SheetDescription>
        </SheetHeader>

        {user ? (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label>User</Label>
              <div className="rounded-md border p-3">
                <p className="font-medium">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {user.roles.length ? (
                    user.roles.map((role) => (
                      <Badge key={role} variant="outline">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No roles</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              {loadingRoles ? (
                <p className="text-muted-foreground text-sm">Loading roles...</p>
              ) : (
                <div className="grid gap-2">
                  {roles.map((role) => (
                    <label
                      key={role.roleId}
                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(role.roleId)}
                        onChange={() => toggleRole(role.roleId)}
                        className="size-4 rounded border"
                      />
                      <div>
                        <p className="text-sm font-medium">{role.roleName}</p>
                        <p className="text-muted-foreground text-xs">
                          {role.roleCode}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
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
              <Button type="submit" variant="update" disabled={saving || loadingRoles}>
                {saving ? "Saving..." : "Save roles"}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
