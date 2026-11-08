"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  canAccessPermission,
  isAdminRole,
  usePermissions,
} from "@/components/permissions/permission-provider";
import { PERMISSIONS } from "@/lib/route-permissions";

/** Sends pharmacy operators with active pharmacy to the management dashboard. */
export function DashboardHomeRedirect() {
  const router = useRouter();
  const { roles, permissions, operationalPermissions, activePharmacyId, ready, loading } =
    usePermissions();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!ready || loading || didRedirect.current) return;
    if (isAdminRole(roles)) return;
    if (!activePharmacyId) return;
    if (
      !canAccessPermission(
        PERMISSIONS.sales.view,
        roles,
        permissions,
        operationalPermissions
      )
    ) {
      return;
    }

    didRedirect.current = true;
    router.replace("/dashboard/pharmacy");
  }, [
    activePharmacyId,
    loading,
    operationalPermissions,
    permissions,
    ready,
    roles,
    router,
  ]);

  return null;
}
