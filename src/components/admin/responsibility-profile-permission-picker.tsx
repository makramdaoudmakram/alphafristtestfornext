"use client";

import { useMemo, useState } from "react";
import type { PermissionListItem } from "@/types/permissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function groupPermissionsByModule(permissions: PermissionListItem[]) {
  return permissions.reduce<Record<string, PermissionListItem[]>>((acc, item) => {
    const key = item.moduleCode || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

type ResponsibilityProfilePermissionPickerProps = {
  allPermissions: PermissionListItem[];
  selectedIds: number[];
  onToggle: (permissionId: number, checked: boolean) => void;
  disabled?: boolean;
};

export function ResponsibilityProfilePermissionPicker({
  allPermissions,
  selectedIds,
  onToggle,
  disabled = false,
}: ResponsibilityProfilePermissionPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
  const active = allPermissions.filter((p) => p.isActive);
    if (!term) return active;
    return active.filter(
      (p) =>
        p.permissionCode.toLowerCase().includes(term) ||
        p.permissionName.toLowerCase().includes(term) ||
        p.moduleCode.toLowerCase().includes(term)
    );
  }, [allPermissions, search]);

  const permissionGroups = useMemo(
    () => groupPermissionsByModule(filtered),
    [filtered]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Permissions ({selectedIds.length} selected)</Label>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search permissions…"
          className="h-8 max-w-xs"
          disabled={disabled}
        />
      </div>
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
