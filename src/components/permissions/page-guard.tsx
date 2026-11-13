"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { getAlfaApiHint } from "@/lib/api-config";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  getRoutePermissionForPath,
  type RouteViewPermission,
} from "@/lib/route-permissions";
import { resolvePageKeyFromPathname } from "@/lib/pharmacy-page-access";
import { usePermissions, canAccessPermission } from "./permission-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function resolveLevel2Permission(
  pathname: string,
  permission: RouteViewPermission | undefined
): RouteViewPermission {
  if (typeof permission === "string" || Array.isArray(permission)) {
    return permission;
  }
  return getRoutePermissionForPath(pathname);
}

function isLevel2Allowed(
  _pathname: string,
  permission: RouteViewPermission,
  roles: string[],
  permissions: string[],
  operationalPermissions?: string[]
): boolean {
  if (permission === false) {
    return false;
  }

  if (permission === null) {
    return true;
  }

  if (Array.isArray(permission)) {
    return permission.some((code) =>
      canAccessPermission(code, roles, permissions, operationalPermissions)
    );
  }

  return canAccessPermission(
    permission,
    roles,
    permissions,
    operationalPermissions
  );
}

export function PageGuard({
  permission,
  pageKey,
  redirectTo,
  children,
}: {
  permission?: RouteViewPermission;
  pageKey?: string | null;
  redirectTo?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    roles,
    permissions,
    operationalPermissions,
    pharmacyPageAccessApplies,
    canAccessPage: canAccessPharmacyPage,
    loading,
    ready,
    error,
    refresh,
  } = usePermissions();
  const hydrated = useHydrated();
  const signingOutRef = useRef(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!error) return;
    const lower = error.toLowerCase();
    const isSessionError =
      lower.includes("session") ||
      lower.includes("sign in") ||
      lower.includes("unauthorized");
    if (!isSessionError || signingOutRef.current) return;
    signingOutRef.current = true;
    void signOut({ callbackUrl: "/login" });
  }, [error]);

  const level2Permission = resolveLevel2Permission(pathname, permission);
  const level2Allowed = isLevel2Allowed(
    pathname,
    level2Permission,
    roles,
    permissions,
    operationalPermissions
  );

  const level1PageKey =
    pageKey !== undefined
      ? pageKey
      : resolvePageKeyFromPathname(pathname);
  const level1Allowed = canAccessPharmacyPage(level1PageKey);
  const allowed = level1Allowed && level2Allowed;

  useEffect(() => {
    if (!redirectTo || redirectedRef.current) return;
    if (!hydrated || loading || !ready || error) return;
    if (allowed) return;

    redirectedRef.current = true;
    router.replace(redirectTo);
  }, [allowed, error, hydrated, loading, ready, redirectTo, router]);

  if (!hydrated || loading || !ready) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading permissions...</CardTitle>
          <CardDescription>Checking your access level.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    const isSessionError =
      error.toLowerCase().includes("session") ||
      error.toLowerCase().includes("sign in") ||
      error.toLowerCase().includes("unauthorized");

    if (isSessionError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Session expired</CardTitle>
            <CardDescription>Redirecting to sign in…</CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not verify access</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Make sure the Alfa API is running at{" "}
            <code className="text-xs">{getAlfaApiHint()}</code>, then try
            again.
          </p>
          <Button type="button" variant="outline" onClick={() => void refresh()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!allowed) {
    if (redirectTo) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Redirecting...</CardTitle>
            <CardDescription>
              You do not have permission to view this page.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    const level1Denied = pharmacyPageAccessApplies && !level1Allowed;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription className="space-y-2">
            <p>غير مسموح لك بالدخول إلى هذه الصفحة</p>
            <p>You do not have permission to access this page.</p>
            {level1Denied ? (
              <p className="text-muted-foreground text-sm">
                This dashboard page is disabled for pharmacy accounts (Level 1
                page access). An administrator can enable it under Pharmacy Page
                Access.
                {level1PageKey ? (
                  <>
                    {" "}
                    PageKey: <code className="text-xs">{level1PageKey}</code>
                  </>
                ) : null}
              </p>
            ) : level2Permission !== null ? (
              <p className="text-muted-foreground text-sm">
                Required:{" "}
                <code className="text-xs">
                  {Array.isArray(level2Permission)
                    ? level2Permission.join(" or ")
                    : level2Permission}
                </code>
                . Ask an administrator to assign the required permission or
                pharmacy job-title permission (Level 2).
              </p>
            ) : null}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <>{children}</>;
}

export function ActionGuard({
  permission,
  children,
  fallback = null,
  requireGrantedPermission = false,
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** When true, only Permissions/me grants count (no Admin role UI bypass). */
  requireGrantedPermission?: boolean;
}) {
  const { hasPermission, hasGrantedPermission, loading, ready } = usePermissions();
  const hydrated = useHydrated();

  if (!hydrated || loading || !ready) return null;
  const allowed = requireGrantedPermission
    ? hasGrantedPermission(permission)
    : hasPermission(permission);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

export function AdminBadge() {
  const { hasRole } = usePermissions();
  if (!hasRole("Admin")) return null;

  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      Admin
    </span>
  );
}
