"use client";

import { PageGuard } from "@/components/permissions/page-guard";
import { RolePermissionsEditor } from "@/components/permissions/role-permissions-editor";
import { PERMISSIONS } from "@/lib/route-permissions";

export function PermissionsPageContent() {
  return (
    <PageGuard permission={PERMISSIONS.permissions.manage}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Role Permissions</h2>
          <p className="text-muted-foreground text-sm">
            Full control: assign permissions to Admin, Viewer, or other roles.
            Changes are saved to aghapany_AlphaAPI.
          </p>
        </div>
        <RolePermissionsEditor />
      </div>
    </PageGuard>
  );
}
