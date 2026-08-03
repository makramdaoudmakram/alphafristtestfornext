"use client";

import type {
  PermissionActionKey,
  PermissionModuleGroup,
} from "@/types/user-page-permissions";
import { PermissionFeatureRow } from "@/components/admin/user-permissions/permission-feature-row";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PermissionModuleCardProps = {
  module: PermissionModuleGroup;
  onActionChange: (
    permissionId: number,
    action: PermissionActionKey,
    checked: boolean
  ) => void;
  disabled?: boolean;
};

export function PermissionModuleCard({
  module,
  onActionChange,
  disabled = false,
}: PermissionModuleCardProps) {
  return (
    <Card className="h-full border-2 border-black">
      <CardHeader className="border-b border-black pb-3">
        <CardTitle className="text-base text-black">{module.module}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {module.permissions.map((permission) => (
          <PermissionFeatureRow
            key={permission.id}
            permission={permission}
            disabled={disabled}
            onActionChange={(action, checked) =>
              onActionChange(permission.id, action, checked)
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}
