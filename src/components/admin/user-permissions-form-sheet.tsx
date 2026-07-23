"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  UserPermissionItem,
  UserPermissionOverride,
  UserSummary,
} from "@/types/permissions";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";

function overrideFromItem(item: UserPermissionItem): UserPermissionOverride {
  if (item.userOverride === true) return "grant";
  if (item.userOverride === false) return "deny";
  return "inherit";
}

function groupByModule(permissions: UserPermissionItem[]) {
  return permissions.reduce<Record<string, UserPermissionItem[]>>((acc, item) => {
    if (!acc[item.moduleCode]) acc[item.moduleCode] = [];
    acc[item.moduleCode].push(item);
    return acc;
  }, {});
}

export function UserPermissionsFormSheet({
  open,
  onOpenChange,
  user,
  permissions,
  loadingPermissions,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserSummary | null;
  permissions: UserPermissionItem[];
  loadingPermissions?: boolean;
  saving?: boolean;
  onSubmit: (
    overrides: Record<number, UserPermissionOverride>
  ) => Promise<void>;
}) {
  const [overrides, setOverrides] = useState<Record<number, UserPermissionOverride>>(
    {}
  );

  useEffect(() => {
    if (!open) return;

    const initial: Record<number, UserPermissionOverride> = {};
    for (const item of permissions) {
      initial[item.permissionId] = overrideFromItem(item);
    }
    setOverrides(initial);
  }, [open, permissions]);

  const grouped = useMemo(() => groupByModule(permissions), [permissions]);

  function setOverride(permissionId: number, value: UserPermissionOverride) {
    setOverrides((current) => ({ ...current, [permissionId]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(overrides);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>User permissions</SheetTitle>
          <SheetDescription>
            Grant or deny permissions for {user?.email ?? "this user"}. Inherit
            uses the role default. Effective access is role allows plus user
            grants minus user denies.
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

            <div className="space-y-4">
              <Label>Permission overrides</Label>
              {loadingPermissions ? (
                <p className="text-muted-foreground text-sm">
                  Loading permissions...
                </p>
              ) : permissions.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No permissions defined in the system.
                </p>
              ) : (
                Object.entries(grouped).map(([moduleCode, items]) => (
                  <div key={moduleCode} className="space-y-2">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      {moduleCode}
                    </p>
                    <div className="divide-y rounded-lg border">
                      {items.map((item) => (
                        <div
                          key={item.permissionId}
                          className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              {item.permissionName}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {item.permissionCode} · {item.permissionType}
                            </p>
                            {item.fromRole ? (
                              <Badge variant="secondary" className="mt-1">
                                From role
                              </Badge>
                            ) : null}
                          </div>
                          <Select
                            value={
                              overrides[item.permissionId] ??
                              overrideFromItem(item)
                            }
                            onValueChange={(value) =>
                              setOverride(
                                item.permissionId,
                                value as UserPermissionOverride
                              )
                            }
                          >
                            <SelectTrigger className="w-full sm:w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inherit">Inherit</SelectItem>
                              <SelectItem value="grant">Grant</SelectItem>
                              <SelectItem value="deny">Deny</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
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
              <Button type="submit" variant="update" disabled={saving || loadingPermissions}>
                {saving ? "Saving..." : "Save overrides"}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
