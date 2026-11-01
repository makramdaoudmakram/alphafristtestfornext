"use client";

import { useMemo } from "react";
import type { PermissionListItem } from "@/types/permissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

function groupPermissionsByModule(permissions: PermissionListItem[]) {
  return permissions.reduce<Record<string, PermissionListItem[]>>((acc, item) => {
    const key = item.moduleCode || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

type PharmacyJobPermissionPickerProps = {
  allPermissions: PermissionListItem[];
  selectedIds: number[];
  onToggle: (permissionId: number, checked: boolean) => void;
  disabled?: boolean;
};

export function PharmacyJobPermissionPicker({
  allPermissions,
  selectedIds,
  onToggle,
  disabled = false,
}: PharmacyJobPermissionPickerProps) {
  const permissionGroups = useMemo(
    () =>
      groupPermissionsByModule(
        allPermissions.filter((permission) => permission.isActive)
      ),
    [allPermissions]
  );

  return (
    <div className="space-y-3">
      <Label>Permissions</Label>
      {Object.entries(permissionGroups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([moduleCode, items]) => (
          <div key={moduleCode} className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">{moduleCode}</p>
            <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
              {items
                .sort((a, b) => a.permissionCode.localeCompare(b.permissionCode))
                .map((permission) => (
                  <label
                    key={permission.permissionId}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedIds.includes(permission.permissionId)}
                      disabled={disabled}
                      onChange={(e) =>
                        onToggle(permission.permissionId, e.target.checked)
                      }
                    />
                    <span>
                      <span className="font-medium">{permission.permissionCode}</span>
                      <span className="text-muted-foreground block text-xs">
                        {permission.permissionName}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}
