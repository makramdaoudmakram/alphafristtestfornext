"use client";

import { useCallback, useMemo, useState } from "react";
import {
  clonePermissionModules,
  PLACEHOLDER_USER_PAGE_PERMISSIONS,
} from "@/data/placeholder-user-page-permissions";
import type {
  PermissionActionKey,
  PermissionModuleGroups,
} from "@/types/user-page-permissions";
import { PermissionModuleCard } from "@/components/admin/user-permissions/permission-module-card";

type UserPermissionsProps = {
  initialModules?: PermissionModuleGroups;
  disabled?: boolean;
  className?: string;
};

export function UserPermissions({
  initialModules = PLACEHOLDER_USER_PAGE_PERMISSIONS,
  disabled = false,
  className,
}: UserPermissionsProps) {
  const [modules, setModules] = useState<PermissionModuleGroups>(() =>
    clonePermissionModules(initialModules)
  );

  const handleActionChange = useCallback(
    (
      moduleName: string,
      permissionId: number,
      action: PermissionActionKey,
      checked: boolean
    ) => {
      setModules((current) =>
        current.map((group) =>
          group.module !== moduleName
            ? group
            : {
                ...group,
                permissions: group.permissions.map((item) =>
                  item.id === permissionId
                    ? {
                        ...item,
                        actions: { ...item.actions, [action]: checked },
                      }
                    : item
                ),
              }
        )
      );
    },
    []
  );

  const moduleCards = useMemo(
    () =>
      modules.map((group) => (
        <PermissionModuleCard
          key={group.module}
          module={group}
          disabled={disabled}
          onActionChange={(permissionId, action, checked) =>
            handleActionChange(group.module, permissionId, action, checked)
          }
        />
      )),
    [modules, disabled, handleActionChange]
  );

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {moduleCards}
      </div>
    </div>
  );
}
