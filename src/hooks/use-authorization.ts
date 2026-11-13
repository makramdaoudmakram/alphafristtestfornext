"use client";

import { useCallback, useMemo } from "react";
import {
  usePermissions,
  canAccessPermission,
  isAdminRole,
} from "@/components/permissions/permission-provider";
import {
  getRoutePermissionForPath,
  type RouteViewPermission,
} from "@/lib/route-permissions";
import {
  resolvePageKeyFromPathname,
  canAccessPage,
} from "@/lib/pharmacy-page-access";

/**
 * Central frontend authorization — uses the same capability codes as the API registry.
 */
export function useAuthorization() {
  const {
    roles,
    permissions,
    operationalPermissions,
    pharmacyPageAccessApplies,
    pharmacyPageEnabledByKey,
    loading,
    ready,
    hasPermission,
    canAccessPage: canAccessPharmacyPage,
  } = usePermissions();

  const canAccessCapability = useCallback(
    (code: string) =>
      canAccessPermission(code, roles, permissions, operationalPermissions),
    [roles, permissions, operationalPermissions]
  );

  const canAccessRoute = useCallback(
    (pathname: string) => {
      const level2 = getRoutePermissionForPath(pathname);
      if (level2 === false) {
        return false;
      }

      const level2Allowed =
        level2 === null
          ? true
          : Array.isArray(level2)
            ? level2.some((code) => canAccessCapability(code))
            : canAccessCapability(level2);

      const pageKey = resolvePageKeyFromPathname(pathname);
      const level1Allowed = canAccessPage(
        pageKey,
        pharmacyPageAccessApplies,
        pharmacyPageEnabledByKey
      );

      return level1Allowed && level2Allowed;
    },
    [
      canAccessCapability,
      pharmacyPageAccessApplies,
      pharmacyPageEnabledByKey,
    ]
  );

  const canPerformAction = useCallback(
    (capabilityCode: string) => canAccessCapability(capabilityCode),
    [canAccessCapability]
  );

  return useMemo(
    () => ({
      loading,
      ready,
      roles,
      permissions,
      operationalPermissions,
      isAdministrative: isAdminRole(roles),
      hasPermission,
      canAccessCapability,
      canAccessRoute,
      canPerformAction,
      canAccessPharmacyPage,
    }),
    [
      loading,
      ready,
      roles,
      permissions,
      operationalPermissions,
      hasPermission,
      canAccessCapability,
      canAccessRoute,
      canPerformAction,
      canAccessPharmacyPage,
    ]
  );
}

export type AuthorizationCapability = string;
export type { RouteViewPermission };
