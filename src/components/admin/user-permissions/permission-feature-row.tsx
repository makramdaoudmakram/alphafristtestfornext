"use client";

import { PermissionCheckboxItem } from "@/components/admin/user-permissions/permission-checkbox-item";
import {
  PERMISSION_ACTION_KEYS,
  PERMISSION_ACTION_LABELS,
  type PagePermissionItem,
  type PermissionActionKey,
} from "@/types/user-page-permissions";

type PermissionFeatureRowProps = {
  permission: PagePermissionItem;
  onActionChange: (action: PermissionActionKey, checked: boolean) => void;
  disabled?: boolean;
};

export function PermissionFeatureRow({
  permission,
  onActionChange,
  disabled = false,
}: PermissionFeatureRowProps) {
  return (
    <div className="space-y-2 rounded-md border border-black/40 p-3">
      <p className="text-sm font-medium text-orange-600">{permission.name}</p>
      <div className="flex flex-col gap-1">
        {PERMISSION_ACTION_KEYS.map((action) => (
          <PermissionCheckboxItem
            key={`${permission.id}-${action}`}
            id={`${permission.id}-${action}`}
            label={PERMISSION_ACTION_LABELS[action]}
            checked={permission.actions[action]}
            disabled={disabled}
            onCheckedChange={(checked) => onActionChange(action, checked)}
          />
        ))}
      </div>
    </div>
  );
}
